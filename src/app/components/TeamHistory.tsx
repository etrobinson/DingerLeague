import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { Card, CardContent } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { cn } from "./ui/utils";
import { LineChart as LineChartIcon } from "lucide-react";
import { rosterPlayers, rosterTeams } from "../data/leagueRosters";
import {
  buildTeamHistorySeries,
  buildTeamMonthlyTotals,
  getPlayerHomeRunLogs,
  type HistoryGranularity,
  type PlayerHomeRunDay,
  type TeamMonthlyTotals,
} from "../services";

const TEAM_COLORS = [
  "#e11d48", "#22d3b8", "#f5b942", "#7c9bff", "#a855f7",
  "#ec4899", "#14b8a6", "#f97316", "#84cc16", "#06b6d4",
  "#eab308", "#8b5cf6", "#ef4444", "#10b981", "#3b82f6",
  "#f43f5e", "#d946ef", "#0ea5e9", "#65a30d", "#fb7185",
];

const GRANULARITY_OPTIONS: { value: HistoryGranularity; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

type LoadStatus = "loading" | "ready" | "error";

const teamColorById = new Map(
  rosterTeams.map((team, index) => [team.id, TEAM_COLORS[index % TEAM_COLORS.length]]),
);

function getInitials(owner: string): string {
  const parts = owner.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const teamInitialsById = new Map(
  rosterTeams.map((team) => [team.id, getInitials(team.owner)]),
);

interface InitialDotProps {
  cx?: number;
  cy?: number;
  value?: number | null;
  color?: string;
  initials?: string;
  radius?: number;
}

function InitialDot({ cx, cy, value, color, initials, radius = 11 }: InitialDotProps) {
  if (cx == null || cy == null || value == null) {
    return null;
  }
  return (
    <g style={{ pointerEvents: "none" }}>
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={color}
        stroke="#0d1117"
        strokeWidth={1.5}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={radius >= 12 ? 9.5 : 8.5}
        fontWeight={800}
        fill="#0d1117"
      >
        {initials}
      </text>
    </g>
  );
}

export function TeamHistory() {
  const [logs, setLogs] = useState<Map<string, PlayerHomeRunDay[]> | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [granularity, setGranularity] = useState<HistoryGranularity>("weekly");
  const [hiddenTeams, setHiddenTeams] = useState<Set<string>>(new Set());
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHistory() {
      setStatus("loading");
      try {
        const playerLogs = await getPlayerHomeRunLogs(
          rosterPlayers.map((player) => player.id),
          controller.signal,
        );
        setLogs(playerLogs);
        setStatus("ready");
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Unable to load team home run history", error);
          setStatus("error");
        }
      }
    }

    loadHistory();

    return () => controller.abort();
  }, []);

  const points = useMemo(() => {
    if (!logs) {
      return [];
    }
    return buildTeamHistorySeries(rosterTeams, logs, granularity);
  }, [logs, granularity]);

  // Reset the selected window whenever the buckets change (new data / granularity).
  useEffect(() => {
    setRangeStart(0);
    setRangeEnd(null);
  }, [granularity, logs]);

  const lastIndex = Math.max(0, points.length - 1);
  const effectiveStart = Math.min(rangeStart, lastIndex);
  const effectiveEnd = Math.min(rangeEnd ?? lastIndex, lastIndex);

  const visiblePoints = useMemo(
    () => points.slice(effectiveStart, effectiveEnd + 1),
    [points, effectiveStart, effectiveEnd],
  );

  const chartData = useMemo(
    () =>
      visiblePoints.map((point) => ({
        label: point.label,
        ...point.totals,
      })),
    [visiblePoints],
  );

  // Rescale the Y-axis to just the visible window so the lines spread apart.
  const yDomain = useMemo<[number, number]>(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const point of visiblePoints) {
      for (const team of rosterTeams) {
        if (hiddenTeams.has(team.id)) {
          continue;
        }
        const value = point.totals[team.id] ?? 0;
        if (value < min) min = value;
        if (value > max) max = value;
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return [0, 1];
    }
    if (min === max) {
      return [Math.max(0, min - 1), max + 1];
    }
    // Hug the visible data tightly so line separation is exaggerated.
    return [Math.max(0, Math.floor(min) - 1), Math.ceil(max) + 1];
  }, [visiblePoints, hiddenTeams]);

  // Rank teams by their latest cumulative total so the legend mirrors the standings.
  const rankedTeams = useMemo(() => {
    const finalTotals = points.at(-1)?.totals ?? {};
    return [...rosterTeams].sort(
      (a, b) => (finalTotals[b.id] ?? 0) - (finalTotals[a.id] ?? 0),
    );
  }, [points]);

  // Per-month (non-cumulative) home run totals for the numbers table.
  const monthly = useMemo(() => {
    if (!logs) {
      return { months: [], seasonTotals: {} as Record<string, number> };
    }
    return buildTeamMonthlyTotals(rosterTeams, logs);
  }, [logs]);

  const monthlyRankedTeams = useMemo(
    () =>
      [...rosterTeams].sort(
        (a, b) => (monthly.seasonTotals[b.id] ?? 0) - (monthly.seasonTotals[a.id] ?? 0),
      ),
    [monthly],
  );

  function toggleTeam(teamId: string) {
    setHiddenTeams((current) => {
      const next = new Set(current);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  }

  function handleRangeStart(value: string) {
    const index = Number(value);
    setRangeStart(index);
    if (index > effectiveEnd) {
      setRangeEnd(index);
    }
  }

  function handleRangeEnd(value: string) {
    const index = Number(value);
    setRangeEnd(index);
    if (index < effectiveStart) {
      setRangeStart(index);
    }
  }

  const allHidden = hiddenTeams.size === rosterTeams.length;
  const hasData = points.length > 1;
  const canSelectRange = points.length > 2;

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden rounded-2xl border-white/8 bg-card shadow-xl shadow-black/30">
        <div className="flex flex-col gap-3 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Season History
            </p>
            <h2 className="text-xl font-black tracking-tight text-white">
              Home Run Race
            </h2>
          </div>
          <div className="inline-flex w-fit items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            {GRANULARITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setGranularity(option.value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                  granularity === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-white",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-4 sm:p-5">
        {status === "loading" ? (
          <ChartMessage>
            <LineChartIcon className="size-6 animate-pulse text-muted-foreground" />
            Loading season history…
          </ChartMessage>
        ) : status === "error" ? (
          <ChartMessage>
            Unable to load season history right now. Please try again later.
          </ChartMessage>
        ) : !hasData ? (
          <ChartMessage>
            <LineChartIcon className="size-6 text-muted-foreground" />
            No home runs recorded yet this season.
          </ChartMessage>
        ) : (
          <>
            {canSelectRange ? (
              <div className="mb-4 flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Zoom to window
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[0.7rem] font-bold text-muted-foreground">From</span>
                    <Select value={String(effectiveStart)} onValueChange={handleRangeStart}>
                      <SelectTrigger size="sm" className="min-w-[7.5rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {points.map((point, index) => (
                          <SelectItem key={point.key} value={String(index)}>
                            {point.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[0.7rem] font-bold text-muted-foreground">To</span>
                    <Select value={String(effectiveEnd)} onValueChange={handleRangeEnd}>
                      <SelectTrigger size="sm" className="min-w-[7.5rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {points.map((point, index) => (
                          <SelectItem key={point.key} value={String(index)}>
                            {point.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(effectiveStart !== 0 || effectiveEnd !== lastIndex) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRangeStart(0);
                        setRangeEnd(null);
                      }}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.7rem] font-bold text-muted-foreground transition-colors hover:text-white"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    allowDecimals={false}
                    domain={yDomain}
                    allowDataOverflow
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip content={<HistoryTooltip hiddenTeams={hiddenTeams} />} />
                  {rosterTeams.map((team) => (
                    <Line
                      key={team.id}
                      type="monotone"
                      dataKey={team.id}
                      name={team.owner}
                      stroke={teamColorById.get(team.id)}
                      strokeWidth={2}
                      dot={false}
                      activeDot={(props) => (
                        <InitialDot
                          key={`active-${team.id}-${props.index}`}
                          cx={props.cx}
                          cy={props.cy}
                          value={props.value}
                          color={teamColorById.get(team.id)}
                          initials={teamInitialsById.get(team.id)}
                          radius={14}
                        />
                      )}
                      hide={hiddenTeams.has(team.id)}
                      isAnimationActive={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setHiddenTeams(new Set())}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.7rem] font-bold text-muted-foreground transition-colors hover:text-white"
              >
                Show all
              </button>
              <button
                type="button"
                onClick={() => setHiddenTeams(new Set(rosterTeams.map((team) => team.id)))}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.7rem] font-bold text-muted-foreground transition-colors hover:text-white"
              >
                Hide all
              </button>
              {rankedTeams.map((team) => {
                const isHidden = hiddenTeams.has(team.id);
                const color = teamColorById.get(team.id);
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => toggleTeam(team.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-bold transition-colors",
                      isHidden
                        ? "border-white/8 bg-transparent text-muted-foreground/60"
                        : "border-white/12 bg-white/5 text-white",
                    )}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: isHidden ? "transparent" : color, border: `1.5px solid ${color}` }}
                    />
                    {team.owner === "Zach Bishop" ? "💩 " + team.owner : team.owner}
                  </button>
                );
              })}
            </div>
            {allHidden ? (
              <p className="mt-3 text-center text-xs font-medium text-muted-foreground">
                Select a team above to show its home run trend.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
      </Card>

      <MonthlyTotalsCard
        status={status}
        months={monthly.months}
        seasonTotals={monthly.seasonTotals}
        rankedTeams={monthlyRankedTeams}
      />
    </div>
  );
}

interface MonthlyTotalsCardProps {
  status: LoadStatus;
  months: TeamMonthlyTotals[];
  seasonTotals: Record<string, number>;
  rankedTeams: typeof rosterTeams;
}

function MonthlyTotalsCard({
  status,
  months,
  seasonTotals,
  rankedTeams,
}: MonthlyTotalsCardProps) {
  const hasData = months.length > 0;

  // Highest team total for each month (only counts as a leader if > 0).
  const monthMaxByKey = useMemo(() => {
    const maxByKey = new Map<string, number>();
    for (const month of months) {
      let max = 0;
      for (const team of rankedTeams) {
        max = Math.max(max, month.totals[team.id] ?? 0);
      }
      maxByKey.set(month.key, max);
    }
    return maxByKey;
  }, [months, rankedTeams]);

  return (
    <Card className="overflow-hidden rounded-2xl border-white/8 bg-card shadow-xl shadow-black/30">
      <div className="flex flex-col gap-1 border-b border-white/8 px-5 py-4">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Monthly Totals
        </p>
        <h2 className="text-xl font-black tracking-tight text-white">
          Home Runs by Month
        </h2>
      </div>
      <CardContent className="p-0">
        {status === "loading" ? (
          <div className="px-5 py-10 text-center text-sm font-medium text-muted-foreground">
            Loading monthly totals…
          </div>
        ) : status === "error" ? (
          <div className="px-5 py-10 text-center text-sm font-medium text-muted-foreground">
            Unable to load monthly totals right now.
          </div>
        ) : !hasData ? (
          <div className="px-5 py-10 text-center text-sm font-medium text-muted-foreground">
            No home runs recorded yet this season.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left text-[0.7rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Team
                  </th>
                  {months.map((month) => (
                    <th
                      key={month.key}
                      className="px-3 py-3 text-right text-[0.7rem] font-bold uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      {month.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[var(--gold)]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankedTeams.map((team, index) => {
                  const color = teamColorById.get(team.id);
                  const label =
                    team.owner === "Zach Bishop" ? "💩 " + team.owner : team.owner;
                  return (
                    <tr
                      key={team.id}
                      className="border-b border-white/6 last:border-b-0 transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="sticky left-0 z-10 bg-card px-4 py-2.5 text-left">
                        <div className="flex items-center gap-2">
                          <span className="w-4 text-right text-xs font-bold tabular-nums text-muted-foreground">
                            {index + 1}
                          </span>
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="truncate font-bold text-white">{label}</span>
                        </div>
                      </td>
                      {months.map((month) => {
                        const value = month.totals[team.id] ?? 0;
                        const monthMax = monthMaxByKey.get(month.key) ?? 0;
                        const isLeader = value > 0 && value === monthMax;
                        return (
                          <td
                            key={month.key}
                            className={cn(
                              "px-3 py-2.5 text-right tabular-nums",
                              isLeader
                                ? "font-black text-[var(--gold)]"
                                : value > 0
                                  ? "font-semibold text-white"
                                  : "text-muted-foreground/50",
                            )}
                          >
                            {isLeader ? (
                              <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md bg-[var(--gold)]/12 px-1.5 py-0.5">
                                {value}
                              </span>
                            ) : (
                              value
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2.5 text-right text-base font-black tabular-nums text-[var(--gold)]">
                        {seasonTotals[team.id] ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChartMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[360px] flex-col items-center justify-center gap-3 text-center text-sm font-medium text-muted-foreground">
      {children}
    </div>
  );
}

function HistoryTooltip({
  active,
  payload,
  label,
  hiddenTeams,
}: TooltipProps<number, string> & { hiddenTeams: Set<string> }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const rows = payload
    .filter((entry) => typeof entry.dataKey === "string" && !hiddenTeams.has(entry.dataKey))
    .map((entry) => ({
      id: String(entry.dataKey),
      name: entry.name ?? "",
      value: typeof entry.value === "number" ? entry.value : 0,
      color: entry.color,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1117]/95 px-3 py-2 shadow-xl shadow-black/40">
      <p className="mb-1.5 text-xs font-bold text-white">{label}</p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} />
              {row.name}
            </span>
            <span className="font-bold tabular-nums text-white">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
