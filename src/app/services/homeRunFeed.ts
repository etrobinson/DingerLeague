import { rosterPlayers } from "../data/leagueRosters";
import { getBallparkById, wouldClearFenceAt, BALLPARKS } from "../data/ballparks";
import {
  type MlbPlay,
  type MlbScheduledGame,
  getMlbPlayerHeadshotUrl,
  mlbStatsApi,
} from "./mlbStatsApi";

export interface HomeRunFeedEntry {
  id: string;
  gamePk: number;
  playerId: string;
  playerName: string;
  playerImageUrl: string;
  team: string;
  pitcherId: string;
  pitcherName: string;
  pitcherImageUrl: string;
  exitVelocity: number | null;
  launchAngle: number | null;
  distance: number | null;
  trajectory: string | null;
  sprayAngle: number | null;
  /**
   * Ball landing point relative to home plate, in feet. +x = right field,
   * +y = center field. Derived from MLB Gameday hit coordinates. Null when
   * the play has no coordinate data.
   */
  landingX: number | null;
  landingY: number | null;
  date: string;
  /** Sortable ISO timestamp for ordering the running history (newest first). */
  timestamp: string;
  inning: number;
  halfInning: "top" | "bottom";
  homeParkId: string | null;
  dongCount: number;
}

export interface HomeRunFeedPage {
  entries: HomeRunFeedEntry[];
  /**
   * The date (YYYY-MM-DD) to pass back in as `cursor` to load the next,
   * older page. `null` once the start of the season has been reached.
   */
  nextCursor: string | null;
}

export interface HomeRunFeedPageOptions {
  /** Exclusive upper-bound date (YYYY-MM-DD) to load home runs before. Defaults to today. */
  cursor?: string | null;
  /** Target number of home runs to collect per page. Defaults to 20. */
  pageSize?: number;
  signal?: AbortSignal;
}

const ROSTER_PLAYER_IDS = new Set(rosterPlayers.map((player) => player.id));
const ROSTER_TEAM_ABBREVIATIONS = new Map(
  rosterPlayers.map((player) => [player.id, player.team]),
);

const DEFAULT_PAGE_SIZE = 20;
/** How many days of schedule to request per API call while scanning back. */
const DAYS_PER_BATCH = 3;
/** Safety cap on how far back a single page fetch will scan before yielding. */
const MAX_DAYS_PER_PAGE = 24;
/** Earliest date to scan back to (regular season opening window). */
const SEASON_START_MONTH_DAY = "03-01";

/**
 * Loads a single page of the running home-run history, walking backwards in
 * time from `cursor` (default: today) until it has collected roughly
 * `pageSize` home runs or reaches the start of the season. Returns the
 * entries plus a `nextCursor` the caller passes back to fetch older pages
 * (infinite scroll). `nextCursor` is `null` once the season start is hit.
 */
export async function getHomeRunFeedPage(
  options: HomeRunFeedPageOptions = {},
): Promise<HomeRunFeedPage> {
  const { cursor, pageSize = DEFAULT_PAGE_SIZE, signal } = options;

  const today = formatDateForMlb(new Date());
  let windowEnd = cursor ?? today;
  const seasonStart = seasonStartForDate(windowEnd);

  const entries: HomeRunFeedEntry[] = [];
  let daysScanned = 0;

  while (
    entries.length < pageSize &&
    windowEnd >= seasonStart &&
    daysScanned < MAX_DAYS_PER_PAGE
  ) {
    const remainingDays = MAX_DAYS_PER_PAGE - daysScanned;
    const batchDays = Math.min(DAYS_PER_BATCH, remainingDays);
    let windowStart = addDays(windowEnd, -(batchDays - 1));
    if (windowStart < seasonStart) {
      windowStart = seasonStart;
    }

    const batchEntries = await fetchHomeRunsInRange(windowStart, windowEnd, signal);
    entries.push(...batchEntries);

    daysScanned += daysBetween(windowStart, windowEnd) + 1;
    windowEnd = addDays(windowStart, -1);
  }

  entries.sort(compareByRecencyDesc);

  const nextCursor = windowEnd >= seasonStart ? windowEnd : null;

  return { entries, nextCursor };
}

async function fetchHomeRunsInRange(
  startDate: string,
  endDate: string,
  signal?: AbortSignal,
): Promise<HomeRunFeedEntry[]> {
  const schedule = await mlbStatsApi.getSchedule({ startDate, endDate, signal });
  const games = schedule.dates.flatMap((date) => date.games);
  const relevantGames = games.filter(
    (game) => isLiveGame(game.status.abstractGameState) || isFinalGame(game.status.abstractGameState),
  );

  if (relevantGames.length === 0) return [];

  const feeds = await Promise.all(
    relevantGames.map((game) => mlbStatsApi.getGameFeed(game.gamePk, signal)),
  );

  const entries: HomeRunFeedEntry[] = [];

  feeds.forEach((feed, index) => {
    const game = relevantGames[index];
    const plays = feed.liveData?.plays?.allPlays ?? [];

    plays.forEach((play, playIndex) => {
      const entry = buildEntryFromPlay(play, playIndex, game);
      if (entry) entries.push(entry);
    });
  });

  return entries;
}

function buildEntryFromPlay(
  play: MlbPlay,
  playIndex: number,
  game: MlbScheduledGame,
): HomeRunFeedEntry | null {
  if (play.result.eventType !== "home_run") return null;
  if (!ROSTER_PLAYER_IDS.has(String(play.matchup.batter.id))) return null;

  const hitEvent = [...play.playEvents]
    .reverse()
    .find((event) => event.hitData);
  const hitData = hitEvent?.hitData;
  const distance = hitData?.totalDistance ?? null;

  // Gameday stringer coordinates give a reliable *direction* (spray angle)
  // but not a reliable *magnitude* — they often place the ball short of its
  // true carry. So we take the angle from the coordinates and the distance
  // from Statcast's totalDistance, then reconstruct an accurate landing
  // point. When either piece is missing we degrade gracefully.
  const coordAngle = hitData?.coordinates
    ? sprayAngleFromCoords(hitData.coordinates.coordX, hitData.coordinates.coordY)
    : null;
  const sprayAngle = coordAngle;
  const landing =
    coordAngle !== null && distance !== null
      ? {
          x: distance * Math.sin((coordAngle * Math.PI) / 180),
          y: distance * Math.cos((coordAngle * Math.PI) / 180),
        }
      : null;

  const team = resolveBattingTeamAbbreviation(play, game);
  const date = game.officialDate ?? game.gameDate ?? formatDateForMlb(new Date());
  const homeParkId = resolveHomeParkId(game);

  return {
    id: `${game.gamePk}-${playIndex}`,
    gamePk: game.gamePk,
    playerId: String(play.matchup.batter.id),
    playerName: play.matchup.batter.fullName,
    playerImageUrl: getMlbPlayerHeadshotUrl(play.matchup.batter.id),
    team: team ?? ROSTER_TEAM_ABBREVIATIONS.get(String(play.matchup.batter.id)) ?? "",
    pitcherId: String(play.matchup.pitcher.id),
    pitcherName: play.matchup.pitcher.fullName,
    pitcherImageUrl: getMlbPlayerHeadshotUrl(play.matchup.pitcher.id),
    exitVelocity: hitData?.launchSpeed ?? null,
    launchAngle: hitData?.launchAngle ?? null,
    distance,
    trajectory: hitData?.trajectory ?? null,
    sprayAngle,
    landingX: landing?.x ?? null,
    landingY: landing?.y ?? null,
    date,
    timestamp: play.about.startTime ?? game.gameDate ?? `${date}T00:00:00Z`,
    inning: play.about.inning ?? 0,
    halfInning: play.about.halfInning === "top" ? "top" : "bottom",
    homeParkId,
    dongCount: countParksCleared(landing, distance, sprayAngle),
  };
}

/** Orders entries newest-first for the running history. */
function compareByRecencyDesc(a: HomeRunFeedEntry, b: HomeRunFeedEntry) {
  const aTime = Date.parse(a.timestamp);
  const bTime = Date.parse(b.timestamp);
  if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
    return bTime - aTime;
  }
  return b.gamePk - a.gamePk || b.inning - a.inning;
}

/**
 * Merges freshly fetched entries into an existing list, de-duplicating by
 * id (incoming wins) and keeping the newest-first ordering. Used to fold in
 * newly hit home runs on refresh without discarding already-loaded history.
 */
export function mergeHomeRunEntries(
  existing: HomeRunFeedEntry[],
  incoming: HomeRunFeedEntry[],
): HomeRunFeedEntry[] {
  const byId = new Map<string, HomeRunFeedEntry>();
  for (const entry of existing) byId.set(entry.id, entry);
  for (const entry of incoming) byId.set(entry.id, entry);
  return Array.from(byId.values()).sort(compareByRecencyDesc);
}


/**
 * Counts how many of the 30 parks this ball would clear. When the ball's
 * landing coordinates are available it uses the exact landing point against
 * each park's wall polyline (accurate for balls hit down the lines). Falls
 * back to the spray-angle + total-distance estimate only when coordinates
 * are missing.
 */
function countParksCleared(
  landing: { x: number; y: number } | null,
  distance: number | null,
  sprayAngle: number | null,
) {
  if (landing) {
    return BALLPARKS.reduce(
      (count, park) => count + (wouldClearFenceAt(park, landing.x, landing.y) ? 1 : 0),
      0,
    );
  }

  if (!distance) return 0;
  const angle = sprayAngle ?? 0;
  const x = distance * Math.sin((angle * Math.PI) / 180);
  const y = distance * Math.cos((angle * Math.PI) / 180);
  return BALLPARKS.reduce(
    (count, park) => count + (wouldClearFenceAt(park, x, y) ? 1 : 0),
    0,
  );
}

function resolveBattingTeamAbbreviation(play: MlbPlay, game: MlbScheduledGame) {
  const battingTeam = play.about.halfInning === "top" ? game.teams.away.team : game.teams.home.team;
  return battingTeam.abbreviation ?? battingTeam.teamName ?? null;
}

function resolveHomeParkId(game: MlbScheduledGame) {
  const homeAbbreviation = game.teams.home.team.abbreviation;
  if (!homeAbbreviation) return null;
  return getBallparkById(homeAbbreviation)?.id ?? null;
}

/**
 * Spray angle (deg) from raw MLB Gameday hit coordinates, where 0 = dead
 * center, negative = left field, positive = right field. Uses the
 * widely-referenced Gameday calibration (home plate at ~125.42, 198.27). The
 * Gameday Y axis increases downward (toward the backstop), so it is negated
 * to point toward center field. Only the *direction* is taken from these
 * coordinates; the distance comes from Statcast's totalDistance. Not clamped
 * to ±45° — a ball pulled slightly past a foul pole is handled by the fence
 * model.
 */
function sprayAngleFromCoords(coordX: number, coordY: number) {
  const originX = 125.42;
  const originY = 198.27;
  const dx = coordX - originX;
  const dy = originY - coordY;
  if (dx === 0 && dy === 0) return 0;
  return Math.atan2(dx, dy) * (180 / Math.PI);
}

function isLiveGame(abstractGameState?: string) {
  return abstractGameState === "Live";
}

function isFinalGame(abstractGameState?: string) {
  return abstractGameState === "Final";
}

function formatDateForMlb(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/** Parses a YYYY-MM-DD string into a UTC-noon Date (avoids TZ drift). */
function parseDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/** Returns the YYYY-MM-DD string `amount` days offset from `dateStr`. */
function addDays(dateStr: string, amount: number) {
  const date = parseDate(dateStr);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatDateForMlb(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Whole-day span between two YYYY-MM-DD strings (endDate - startDate). */
function daysBetween(startDate: string, endDate: string) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((parseDate(endDate).getTime() - parseDate(startDate).getTime()) / msPerDay);
}

/** Season-opening boundary (YYYY-MM-DD) for the year of the given date. */
function seasonStartForDate(dateStr: string) {
  const year = dateStr.slice(0, 4);
  return `${year}-${SEASON_START_MONTH_DAY}`;
}

