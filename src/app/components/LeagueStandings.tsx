import { Card, CardContent } from "./ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { BadgeDollarSign } from "lucide-react";
import SportsBaseballIcon from "@mui/icons-material/SportsBaseball";
import { cn } from "./ui/utils";

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

interface LeagueStandingsProps {
  teams: Team[];
  allPlayers: Player[];
}

export function LeagueStandings({ teams, allPlayers }: LeagueStandingsProps) {
  const sortedTeams = [...teams].sort((a, b) => b.totalHomeRuns - a.totalHomeRuns);

  return (
    <Card className="overflow-hidden rounded-lg border-[#1d4b82] bg-[#061a38]/95 text-white shadow-2xl shadow-black/35 backdrop-blur">
      <div className="flex flex-col gap-3 border-b border-[#1d4b82] bg-[#03142d] px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#89aeda]">
            League Table
          </p>
          <h2 className="text-xl font-black uppercase leading-tight">
            2026 Money Race
          </h2>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-md border border-[#2c65a2] bg-[#0a2854] px-3 py-2 text-sm font-black uppercase tracking-wide text-[#dceaff] shadow-lg shadow-black/20">
          <BadgeDollarSign className="size-4" />
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

            return (
              <AccordionItem
                key={team.id}
                value={team.id}
                className={cn("border-[#173c6b]", getRankBorderClass(rank))}
              >
                <AccordionTrigger
                  className={cn(
                    "px-4 py-4 hover:no-underline",
                    getRankTriggerClass(rank),
                  )}
                >
                  <div className="flex items-center gap-4 w-full">
                    <div className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-md text-lg font-black",
                      getRankBadgeClass(rank),
                    )}>
                     <span>{rank}</span>
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="truncate text-lg font-black text-inherit">
                        {team.owner}
                      </div>
                      {payout ? (
                        <div className={cn(
                          "mt-1 flex w-fit items-center gap-2 rounded-full border px-2 py-0.5 text-xs font-black uppercase tracking-[0.12em]",
                          getPayoutPillClass(rank),
                        )}>
                          <span>{formatOrdinal(rank)}</span>
                          <span className="text-[#7fa7d8]">•</span>
                          <span>${payout}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black tabular-nums text-white">
                        {team.totalHomeRuns}
                      </div>
                      <div className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#86a8d1]">
                        HR
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="bg-[#04142d] px-4 pb-4">
                  <div className="space-y-2 pt-3 sm:pl-16">
                    {teamPlayers.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between gap-4 rounded-md border border-[#173c6b] bg-[#081f42] px-3 py-2 shadow-sm shadow-black/20"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-bold text-white">{player.name}</div>
                          <div className="text-sm font-medium text-[#9db6d8]">
                            {player.team} • {player.position}
                          </div>
                        </div>
                        <div className="rounded-md bg-[#BF0D3E] px-3 py-1 text-lg font-black tabular-nums text-white shadow shadow-[#BF0D3E]/25">
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

function getRankBorderClass(rank: number) {
  if (rank === 1) return "border-l-4 border-l-[#8f3147]";
  if (rank === 2) return "border-l-4 border-l-[#8f7640]";
  if (rank === 3) return "border-l-4 border-l-[#416f9f]";
  if (rank === 4) return "border-l-4 border-l-[#3d765f]";
  return "";
}

function getRankTriggerClass(rank: number) {
  if (rank === 1) return "bg-gradient-to-r from-[#281928] via-[#082044] to-[#061a38] text-white hover:bg-[#0a1f43]";
  if (rank === 2) return "bg-gradient-to-r from-[#2b281b] via-[#082044] to-[#061a38] text-white hover:bg-[#0a1f43]";
  if (rank === 3) return "bg-gradient-to-r from-[#172d4b] via-[#082044] to-[#061a38] text-white hover:bg-[#0a1f43]";
  if (rank === 4) return "bg-gradient-to-r from-[#173329] via-[#082044] to-[#061a38] text-white hover:bg-[#0a1f43]";
  return "bg-[#061a38] text-white hover:bg-[#0a2854]";
}

function getRankBadgeClass(rank: number) {
  if (rank === 1) return "border border-[#9e465a] bg-[#4b1f31] text-[#ffd8e1]";
  if (rank === 2) return "border border-[#9c834d] bg-[#473b22] text-[#ffedc2]";
  if (rank === 3) return "border border-[#527fae] bg-[#1f4068] text-[#d6e9ff]";
  if (rank === 4) return "border border-[#4f8a71] bg-[#1f4639] text-[#d7f4e8]";
  return "bg-[#e4edf8] text-[#37506f]";
}

function getPayoutPillClass(rank: number) {
  if (rank === 1) return "border-[#9e465a]/70 bg-[#2b1321]/70 text-[#ffc9d5]";
  if (rank === 2) return "border-[#9c834d]/70 bg-[#271f12]/70 text-[#f3d99b]";
  if (rank === 3) return "border-[#527fae]/70 bg-[#102944]/70 text-[#c5def8]";
  return "border-[#4f8a71]/70 bg-[#102d25]/70 text-[#c5eadb]";
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
