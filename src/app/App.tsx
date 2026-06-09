import { useEffect, useState } from "react";
import { LeagueStandings } from "./components/LeagueStandings";
import { LEAGUE_SEASON, rosterPlayers, rosterTeams } from "./data/leagueRosters";
import { mlbStatsApi } from "./services";
import { Activity } from "lucide-react";
import SportsBaseballIcon from "@mui/icons-material/SportsBaseball";

interface Player {
  id: string;
  name: string;
  team: string;
  position: string;
  homeRuns: number;
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

        setPlayers(
          rosterPlayers.map((rosterPlayer) => {
            const split = statsByPlayerId.get(rosterPlayer.id);
            return {
              id: rosterPlayer.id,
              name: rosterPlayer.name,
              team: split?.team?.abbreviation ?? split?.team?.name ?? rosterPlayer.team,
              position: split?.position?.abbreviation ?? rosterPlayer.position,
              homeRuns: split?.stat.homeRuns ?? rosterPlayer.spreadsheetHomeRuns,
            };
          }),
        );
        setStatsStatus("live");
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

  return (
    <div className="mlb-page min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="stadium-header overflow-hidden rounded-lg border border-[#1e4f86] p-5 text-white shadow-2xl shadow-black/40 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2c65a2] bg-[#071c3d]/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#c9dcf7]">
                <Activity className="size-3.5 text-[#ffcf57]" />
                Live MLB Stats
              </div>
              <div>
                <h1 className="flex items-center gap-3 text-3xl font-black leading-tight text-white sm:text-5xl">
                  <span className="flex size-12 items-center justify-center rounded-md bg-white shadow-lg shadow-black/20">
                    <SportsBaseballIcon className="!size-8 text-[#BF0D3E]" />
                  </span>
                  Dinger League
                </h1>
                <p className="mt-2 text-base font-medium text-white/80 sm:text-lg">
                  {LEAGUE_SEASON} Season Standings
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-[#2c65a2] bg-[#061832]/90 px-4 py-3 text-sm font-semibold text-[#dceaff] shadow-inner shadow-black/20 sm:text-right">
              {statsStatus === "loading"
                ? "Loading batting stats..."
                : statsStatus === "live"
                  ? "Synced with MLB Stats API"
                  : "Using spreadsheet totals"}
            </div>
          </div>
        </div>

        <LeagueStandings teams={teams} allPlayers={players} />
      </div>
    </div>
  );
}
