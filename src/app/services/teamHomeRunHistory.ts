import { LEAGUE_SEASON, type RosterTeam } from "../data/leagueRosters";
import { mlbStatsApi } from "./mlbStatsApi";

export type HistoryGranularity = "daily" | "weekly" | "monthly";

/** Home runs a single player hit on a specific date (YYYY-MM-DD). */
export interface PlayerHomeRunDay {
  date: string;
  homeRuns: number;
}

/** One point on the timeline: a bucket plus each team's cumulative home run total. */
export interface TeamHistoryPoint {
  /** Sortable bucket key (e.g. 2026-04-15 or 2026-04). */
  key: string;
  /** Human readable x-axis label. */
  label: string;
  /** Cumulative home run totals keyed by team id. */
  totals: Record<string, number>;
}

const MLB_MAX_PLAYERS_PER_REQUEST = 25;

/**
 * Fetches every roster player's game-by-game home run log for the season and
 * returns a map of playerId -> per-day home run totals (only days with 1+ HR).
 */
export async function getPlayerHomeRunLogs(
  playerIds: string[],
  signal?: AbortSignal,
): Promise<Map<string, PlayerHomeRunDay[]>> {
  const uniqueIds = Array.from(new Set(playerIds));
  const chunks = chunkArray(uniqueIds, MLB_MAX_PLAYERS_PER_REQUEST);

  const responses = await Promise.all(
    chunks.map((chunk) =>
      mlbStatsApi.getPlayersBattingStats(chunk, {
        season: LEAGUE_SEASON,
        stats: "gameLog",
        signal,
      }),
    ),
  );

  const logs = new Map<string, PlayerHomeRunDay[]>();

  for (const response of responses) {
    for (const person of response.people) {
      const splits = person.stats?.[0]?.splits ?? [];
      const days: PlayerHomeRunDay[] = [];

      for (const split of splits) {
        const date = split.date;
        const homeRuns = split.stat?.homeRuns ?? 0;
        if (!date || homeRuns <= 0) {
          continue;
        }
        days.push({ date, homeRuns });
      }

      logs.set(String(person.id), days);
    }
  }

  return logs;
}

/**
 * Turns per-player home run logs into a cumulative timeline for each team.
 * Players shared across multiple teams contribute to every team they belong to.
 */
export function buildTeamHistorySeries(
  teams: RosterTeam[],
  playerLogs: Map<string, PlayerHomeRunDay[]>,
  granularity: HistoryGranularity,
): TeamHistoryPoint[] {
  // Collect the union of every date on which any tracked player homered.
  const dateSet = new Set<string>();
  for (const days of playerLogs.values()) {
    for (const day of days) {
      dateSet.add(day.date);
    }
  }

  const sortedDates = Array.from(dateSet).sort();
  if (sortedDates.length === 0) {
    return [];
  }

  // Fast lookup of a player's home runs on a given date.
  const playerDateHomeRuns = new Map<string, Map<string, number>>();
  for (const [playerId, days] of playerLogs) {
    const byDate = new Map<string, number>();
    for (const day of days) {
      byDate.set(day.date, (byDate.get(day.date) ?? 0) + day.homeRuns);
    }
    playerDateHomeRuns.set(playerId, byDate);
  }

  const cumulative: Record<string, number> = {};
  for (const team of teams) {
    cumulative[team.id] = 0;
  }

  // One cumulative snapshot per day that produced at least one home run.
  const dailyPoints: TeamHistoryPoint[] = sortedDates.map((date) => {
    for (const team of teams) {
      let delta = 0;
      for (const playerId of team.players) {
        delta += playerDateHomeRuns.get(playerId)?.get(date) ?? 0;
      }
      cumulative[team.id] += delta;
    }

    return {
      key: date,
      label: date,
      totals: { ...cumulative },
    };
  });

  const bucketed = bucketPoints(dailyPoints, granularity);

  // Prepend a zeroed origin point so every line visibly grows from the baseline.
  const originTotals: Record<string, number> = {};
  for (const team of teams) {
    originTotals[team.id] = 0;
  }
  const origin: TeamHistoryPoint = {
    key: "season-start",
    label: "Start",
    totals: originTotals,
  };

  return [origin, ...bucketed];
}

/** One month's non-cumulative home run totals per team. */
export interface TeamMonthlyTotals {
  /** Sortable month key, e.g. 2026-04. */
  key: string;
  /** Human readable month label, e.g. "April". */
  label: string;
  /** Home runs hit during this month, keyed by team id. */
  totals: Record<string, number>;
}

/**
 * Builds per-month (non-cumulative) home run totals for each team, plus a season
 * total column. Shared players contribute to every team that rosters them.
 */
export function buildTeamMonthlyTotals(
  teams: RosterTeam[],
  playerLogs: Map<string, PlayerHomeRunDay[]>,
): { months: TeamMonthlyTotals[]; seasonTotals: Record<string, number> } {
  // playerId -> monthKey -> home runs in that month.
  const playerMonthHomeRuns = new Map<string, Map<string, number>>();
  const monthKeys = new Set<string>();

  for (const [playerId, days] of playerLogs) {
    const byMonth = new Map<string, number>();
    for (const day of days) {
      const monthKey = day.date.slice(0, 7); // YYYY-MM
      byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + day.homeRuns);
      monthKeys.add(monthKey);
    }
    playerMonthHomeRuns.set(playerId, byMonth);
  }

  const sortedMonthKeys = Array.from(monthKeys).sort();

  const seasonTotals: Record<string, number> = {};
  for (const team of teams) {
    seasonTotals[team.id] = 0;
  }

  const months: TeamMonthlyTotals[] = sortedMonthKeys.map((monthKey) => {
    const totals: Record<string, number> = {};
    for (const team of teams) {
      let sum = 0;
      for (const playerId of team.players) {
        sum += playerMonthHomeRuns.get(playerId)?.get(monthKey) ?? 0;
      }
      totals[team.id] = sum;
      seasonTotals[team.id] += sum;
    }

    return {
      key: monthKey,
      label: formatMonthLabel(monthKey),
      totals,
    };
  });

  return { months, seasonTotals };
}

function bucketPoints(
  dailyPoints: TeamHistoryPoint[],
  granularity: HistoryGranularity,
): TeamHistoryPoint[] {
  if (granularity === "daily") {
    return dailyPoints.map((point) => ({
      ...point,
      label: formatDayLabel(point.key),
    }));
  }

  // Keep the latest cumulative snapshot within each week/month bucket.
  const byBucket = new Map<string, TeamHistoryPoint>();
  for (const point of dailyPoints) {
    const bucketKey =
      granularity === "weekly"
        ? getWeekBucketKey(point.key)
        : point.key.slice(0, 7); // YYYY-MM
    byBucket.set(bucketKey, {
      key: bucketKey,
      label:
        granularity === "weekly"
          ? formatWeekLabel(bucketKey)
          : formatMonthLabel(bucketKey),
      totals: point.totals,
    });
  }

  return Array.from(byBucket.values()).sort((a, b) => a.key.localeCompare(b.key));
}

function getWeekBucketKey(dateStr: string): string {
  // ISO week starting Monday, encoded as the Monday's date for easy sorting.
  const date = parseDate(dateStr);
  const day = (date.getUTCDay() + 6) % 7; // 0 = Monday
  date.setUTCDate(date.getUTCDate() - day);
  return formatIsoDate(date);
}

function formatDayLabel(dateStr: string): string {
  const date = parseDate(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatWeekLabel(dateStr: string): string {
  const date = parseDate(dateStr);
  return `Wk ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })}`;
}

function formatMonthLabel(monthKey: string): string {
  const date = parseDate(`${monthKey}-01`);
  return date.toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
}

function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
