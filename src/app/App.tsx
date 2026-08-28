import { useEffect, useState } from "react";
import { LeagueStandings } from "./components/LeagueStandings";
import { LEAGUE_SEASON, rosterPlayers, rosterTeams } from "./data/leagueRosters";
import {
  getMlbPlayerHeadshotUrl,
  getPlayerDailyStatuses,
  mlbStatsApi,
} from "./services";
import type { PlayerGameStatus } from "./services";
import { Flame, Radio, Trophy, Zap } from "lucide-react";
import SportsBaseballIcon from "@mui/icons-material/SportsBaseball";

interface Player {
  id: string;
  name: string;
  team: string;
  position: string;
  homeRuns: number;
  imageUrl: string;
  teamId: number | null;
  status: PlayerGameStatus;
  statusLabel: string;
}

interface Team {
  id: string;
  name: string;
  owner: string;
  totalHomeRuns: number;
  players: string[];
}

const initialPlayers: Player[] = rosterPlayers.map((player) => ({
  id: player.id,
  name: player.name,
  team: player.team,
  position: player.position,
  homeRuns: player.spreadsheetHomeRuns,
  imageUrl: getMlbPlayerHeadshotUrl(player.id),
  teamId: null,
  status: "not_playing_today",
  statusLabel: "Not playing today",
}));

export default function App() {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [statsStatus, setStatsStatus] = useState<"loading" | "live" | "fallback">("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlayerBattingStats() {
      try {
        const statsResponse = await mlbStatsApi.getPlayersBattingStats(
          rosterPlayers.map((player) => player.id),
          {
            season: LEAGUE_SEASON,
            signal: controller.signal,
          },
        );
        const statsByPlayerId = new Map(
          statsResponse.people.map((person) => [
            String(person.id),
            person.stats?.[0]?.splits[0],
          ]),
        );

        const updatedPlayers = rosterPlayers.map((rosterPlayer) => {
          const split = statsByPlayerId.get(rosterPlayer.id);

          return {
            id: rosterPlayer.id,
            name: rosterPlayer.name,
            team: split?.team?.abbreviation ?? split?.team?.name ?? rosterPlayer.team,
            position: split?.position?.abbreviation ?? rosterPlayer.position,
            homeRuns: split?.stat.homeRuns ?? rosterPlayer.spreadsheetHomeRuns,
            imageUrl: getMlbPlayerHeadshotUrl(rosterPlayer.id),
            teamId: split?.team?.id ?? null,
            status: "not_playing_today" as PlayerGameStatus,
            statusLabel: "Not playing today",
          };
        });

        setPlayers(updatedPlayers);
        setStatsStatus("live");

        try {
          const dailyStatuses = await getPlayerDailyStatuses(
            updatedPlayers.map((player) => ({
              id: player.id,
              teamId: player.teamId,
            })),
            controller.signal,
          );

          setPlayers((currentPlayers) => currentPlayers.map((player) => {
            const dailyStatus = dailyStatuses.get(player.id);

            return dailyStatus
              ? {
                ...player,
                status: dailyStatus.status,
                statusLabel: dailyStatus.label,
              }
              : player;
          }));
        } catch (error) {
          if (!controller.signal.aborted) {
            console.error("Unable to load player daily statuses", error);
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Unable to load MLB batting stats", error);
          setStatsStatus("fallback");
        }
      }
    }

    loadPlayerBattingStats();

    return () => controller.abort();
  }, []);

  const teams: Team[] = rosterTeams.map((team) => ({
    ...team,
    totalHomeRuns: team.players.reduce((total, playerId) => {
      const player = players.find((currentPlayer) => currentPlayer.id === playerId);
      return total + (player?.homeRuns ?? 0);
    }, 0),
  }));

  const totalLeagueHomeRuns = players.reduce((total, player) => total + player.homeRuns, 0);
  const leader = [...teams].sort((a, b) => b.totalHomeRuns - a.totalHomeRuns)[0];
  const liveNowCount = players.filter((player) => player.status === "in_game_now").length;

  return (
    <div className="mlb-page min-h-screen pb-16">
      <div className="app-header sticky top-0 z-20 border-b border-white/5">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="brand-mark flex size-11 shrink-0 items-center justify-center rounded-2xl">
              <SportsBaseballIcon className="!size-6 text-white" />
            </span>
            <div>
              <h1 className="text-lg font-black leading-none tracking-tight text-white sm:text-xl">
                Dinger League
              </h1>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {LEAGUE_SEASON} Season
              </p>
            </div>
          </div>

          <div
            className={
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold " +
              (statsStatus === "live"
                ? "border-accent/30 bg-accent/10 text-accent"
                : "border-white/10 bg-white/5 text-muted-foreground")
            }
          >
            <Radio className="size-3.5" />
            <span className="hidden sm:inline">
              {statsStatus === "loading"
                ? "Loading stats..."
                : statsStatus === "live"
                  ? "Live • MLB Stats API"
                  : "Offline • Spreadsheet totals"}
            </span>
            <span className="sm:hidden">
              {statsStatus === "loading" ? "Loading" : statsStatus === "live" ? "Live" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-5 px-4 pt-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-strip-card rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:text-xs">
              <Trophy className="size-3.5 text-[var(--gold)]" />
              <span className="truncate">Leader</span>
            </div>
            <div className="mt-1.5 truncate text-base font-black text-white sm:text-xl">
              {leader?.owner ?? "—"}
            </div>
          </div>
          <div className="stat-strip-card rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:text-xs">
              <Flame className="size-3.5 text-primary" />
              <span className="truncate">Total HRs</span>
            </div>
            <div className="mt-1.5 text-base font-black tabular-nums text-white sm:text-xl">
              {totalLeagueHomeRuns}
            </div>
          </div>
          <div className="stat-strip-card rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:text-xs">
              <Zap className="size-3.5 text-accent" />
              <span className="truncate">Live Now</span>
            </div>
            <div className="mt-1.5 text-base font-black tabular-nums text-white sm:text-xl">
              {liveNowCount}
            </div>
          </div>
        </div>

        <LeagueStandings teams={teams} allPlayers={players} />
      </div>
    </div>
  );
}

