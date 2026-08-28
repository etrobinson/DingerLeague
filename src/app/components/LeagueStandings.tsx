import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { DollarSign, Trophy } from "lucide-react";
import { cn } from "./ui/utils";
import type { PlayerGameStatus } from "../services";

interface Player {
  id: string;
  name: string;
  team: string;
  position: string;
  homeRuns: number;
  imageUrl: string;
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

interface LeagueStandingsProps {
  teams: Team[];
  allPlayers: Player[];
}

export function LeagueStandings({ teams, allPlayers }: LeagueStandingsProps) {
  const sortedTeams = [...teams].sort((a, b) => b.totalHomeRuns - a.totalHomeRuns);
  const maxHomeRuns = Math.max(1, ...sortedTeams.map((team) => team.totalHomeRuns));

  return (
    <Card className="overflow-hidden rounded-2xl border-white/8 bg-card shadow-xl shadow-black/30">
      <div className="flex flex-col gap-3 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            League Table
          </p>
          <h2 className="text-xl font-black tracking-tight text-white">
            Money Race
          </h2>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-3 py-1.5 text-xs font-bold text-[var(--gold)]">
          <DollarSign className="size-3.5" />
          Top 4 Paid
        </div>
      </div>
      <CardContent className="p-0">
        <Accordion type="single" collapsible className="w-full">
          {sortedTeams.map((team, index) => {
            const teamPlayers = allPlayers
              .filter((p) => team.players.includes(p.id))
              .sort((a, b) => b.homeRuns - a.homeRuns || a.name.localeCompare(b.name));
            const rank = index + 1;
            const payout = getPayout(rank);
            const progress = Math.round((team.totalHomeRuns / maxHomeRuns) * 100);

            return (
              <AccordionItem
                key={team.id}
                value={team.id}
                className={cn(
                  "rank-row border-white/6 border-l-2 last:border-b-0",
                  getRankRailClass(rank),
                )}
              >
                <AccordionTrigger className="px-4 py-3.5 hover:no-underline sm:px-5">
                  <div className="flex w-full items-center gap-3 sm:gap-4">
                    <RankBadge rank={rank} />
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-base font-black text-white sm:text-lg">
                          {team.owner === "Zach Bishop" ? "💩 " + team.owner : team.owner}
                        </span>
                        {payout ? (
                          <span className={cn(
                            "hidden shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide sm:inline-flex",
                            getPayoutPillClass(rank),
                          )}>
                            {formatOrdinal(rank)} • ${payout}
                          </span>
                        ) : null}
                      </div>
                      <div className="progress-track mt-2 max-w-[220px]">
                        <div
                          className={cn("progress-fill", rank === 1 && "is-leader")}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xl font-black tabular-nums text-white sm:text-2xl">
                        {team.totalHomeRuns}
                      </div>
                      <div className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        HR
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 sm:px-5">
                  <div className="space-y-1.5 pt-1 sm:pl-14">
                    {teamPlayers.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2 transition-colors hover:bg-white/[0.04]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <PlayerHeadshot player={player} />
                          <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <div className="truncate text-sm font-bold text-white">{player.name}</div>
                              <PlayerStatusBadge player={player} />
                            </div>
                            <div className="text-xs font-medium text-muted-foreground">
                              {player.team} • {player.position}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 rounded-lg bg-primary/15 px-2.5 py-1 text-sm font-black tabular-nums text-primary">
                          {player.homeRuns}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <div className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-11",
        getMedalClass(rank),
      )}>
        <Trophy className="size-4 sm:size-5" />
      </div>
    );
  }

  if (rank === 4) {
    return (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/15 text-accent sm:size-11">
        <DollarSign className="size-4 sm:size-5" />
      </div>
    );
  }

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/5 text-sm font-black text-muted-foreground sm:size-11 sm:text-base">
      {rank}
    </div>
  );
}

function getRankRailClass(rank: number) {
  if (rank === 1) return "border-l-[var(--gold)]/70";
  if (rank === 2) return "border-l-[var(--silver)]/70";
  if (rank === 3) return "border-l-[var(--bronze)]/70";
  if (rank === 4) return "border-l-accent/70";
  return "border-l-transparent";
}

function getPayoutPillClass(rank: number) {
  if (rank === 1) return "border-[var(--gold)]/30 bg-[var(--gold)]/10 text-[var(--gold)]";
  if (rank === 2) return "border-[var(--silver)]/30 bg-[var(--silver)]/10 text-[var(--silver)]";
  if (rank === 3) return "border-[var(--bronze)]/30 bg-[var(--bronze)]/10 text-[var(--bronze)]";
  return "border-accent/30 bg-accent/10 text-accent";
}

function getMedalClass(rank: number) {
  if (rank === 1) return "bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30";
  if (rank === 2) return "bg-[var(--silver)]/15 text-[var(--silver)] border border-[var(--silver)]/30";
  return "bg-[var(--bronze)]/15 text-[var(--bronze)] border border-[var(--bronze)]/30";
}

function PlayerStatusBadge({ player }: { player: Player }) {
  return (
    <span className={cn(
      "shrink-0 rounded-full border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.06em]",
      getPlayerStatusClass(player.status),
    )}>
      {player.statusLabel}
    </span>
  );
}

function getPlayerStatusClass(status: PlayerGameStatus) {
  if (status === "home_run_today") {
    return "border-primary/30 bg-primary/15 text-red-300";
  }

  if (status === "in_game_now") {
    return "border-accent/30 bg-accent/15 text-accent";
  }

  if (status === "played_today") {
    return "border-[#7c9bff]/30 bg-[#7c9bff]/15 text-[#b9c8ff]";
  }

  if (status === "injured_list") {
    return "border-[var(--bronze)]/30 bg-[var(--bronze)]/15 text-[var(--bronze)]";
  }

  if (status === "playing_today") {
    return "border-[var(--gold)]/30 bg-[var(--gold)]/15 text-[var(--gold)]";
  }

  return "border-white/10 bg-white/5 text-muted-foreground";
}

function PlayerHeadshot({ player }: { player: Player }) {
  const [didError, setDidError] = useState(false);

  if (didError) {
    return (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-secondary text-xs font-black text-white">
        {getInitials(player.name)}
      </div>
    );
  }

  return (
    <img
      src={player.imageUrl}
      alt={`${player.name} headshot`}
      loading="lazy"
      onError={() => setDidError(true)}
      className="size-10 shrink-0 rounded-full border border-white/10 bg-secondary object-cover object-[center_18%]"
    />
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getPayout(rank: number) {
  if (rank === 1) return 225;
  if (rank === 2) return 125;
  if (rank === 3) return 75;
  if (rank === 4) return 50;
  return null;
}

function formatOrdinal(rank: number) {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
}

