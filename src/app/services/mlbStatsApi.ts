const MLB_STATS_API_BASE_URL = "https://statsapi.mlb.com";
const MLB_HEADSHOT_BASE_URL = "https://img.mlbstatic.com/mlb-photos/image/upload";

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue | QueryValue[]>;

export interface MlbStatsApiRequestOptions {
  query?: QueryParams;
  signal?: AbortSignal;
}

export interface PlayerBattingStatsOptions {
  season?: number;
  gameType?: "R" | "S" | "E" | "A" | "D" | "F" | "L" | "W";
  signal?: AbortSignal;
  stats?: "season" | "career" | "yearByYear";
}

export interface SeasonBattingStatsOptions {
  season?: number;
  limit?: number;
  playerPool?: "ALL" | "QUALIFIED" | "ROOKIES";
  sortStat?: keyof MlbBattingStatLine;
  signal?: AbortSignal;
}

export interface MlbScheduleOptions {
  date: string;
  hydrate?: string;
  signal?: AbortSignal;
  sportId?: number;
}

export interface MlbTeamRosterOptions {
  rosterType?: "active" | "fullSeason" | "40Man";
  season?: number;
  signal?: AbortSignal;
}

export interface MlbPerson {
  id: number;
  fullName: string;
  link?: string;
}

export interface MlbTeam {
  id: number;
  name: string;
  abbreviation?: string;
  teamName?: string;
  link?: string;
}

export interface MlbBattingStatLine {
  age?: number;
  gamesPlayed?: number;
  groundOuts?: number;
  airOuts?: number;
  runs?: number;
  doubles?: number;
  triples?: number;
  homeRuns?: number;
  strikeOuts?: number;
  baseOnBalls?: number;
  intentionalWalks?: number;
  hits?: number;
  hitByPitch?: number;
  avg?: string;
  atBats?: number;
  obp?: string;
  slg?: string;
  ops?: string;
  caughtStealing?: number;
  caughtStealingPercentage?: string;
  stolenBases?: number;
  stolenBasePercentage?: string;
  groundIntoDoublePlay?: number;
  numberOfPitches?: number;
  plateAppearances?: number;
  totalBases?: number;
  rbi?: number;
  leftOnBase?: number;
  sacBunts?: number;
  sacFlies?: number;
  babip?: string;
  groundOutsToAirouts?: string;
  catchersInterference?: number;
  atBatsPerHomeRun?: string;
}

export interface MlbStatSplit<TStatLine> {
  season?: string;
  player?: MlbPerson;
  team?: MlbTeam;
  league?: MlbTeam;
  gameType?: string;
  position?: {
    code?: string;
    name?: string;
    type?: string;
    abbreviation?: string;
  };
  stat: TStatLine;
}

export interface MlbStatsResponse<TStatLine> {
  copyright?: string;
  stats: Array<{
    type?: {
      displayName?: string;
    };
    group?: {
      displayName?: string;
    };
    splits: Array<MlbStatSplit<TStatLine>>;
  }>;
}

export interface MlbHydratedPerson<TStatLine> extends MlbPerson {
  primaryPosition?: {
    code?: string;
    name?: string;
    type?: string;
    abbreviation?: string;
  };
  stats?: MlbStatsResponse<TStatLine>["stats"];
}

export interface MlbPeopleResponse<TStatLine> {
  copyright?: string;
  people: Array<MlbHydratedPerson<TStatLine>>;
}

export interface MlbScheduledGame {
  gamePk: number;
  gameDate?: string;
  officialDate?: string;
  status: {
    abstractGameState?: string;
    detailedState?: string;
    statusCode?: string;
  };
  teams: {
    away: {
      team: MlbTeam;
    };
    home: {
      team: MlbTeam;
    };
  };
}

export interface MlbScheduleResponse {
  copyright?: string;
  totalGames?: number;
  dates: Array<{
    date: string;
    games: MlbScheduledGame[];
  }>;
}

export interface MlbBoxscorePlayer {
  person: MlbPerson;
  stats?: {
    batting?: {
      atBats?: number;
      plateAppearances?: number;
      homeRuns?: number;
    };
  };
}

export interface MlbGameFeedResponse {
  copyright?: string;
  gamePk: number;
  gameData: {
    status: {
      abstractGameState?: string;
      detailedState?: string;
      statusCode?: string;
    };
  };
  liveData?: {
    boxscore?: {
      teams?: {
        away?: {
          players?: Record<string, MlbBoxscorePlayer>;
        };
        home?: {
          players?: Record<string, MlbBoxscorePlayer>;
        };
      };
    };
  };
}

export interface MlbTeamRosterResponse {
  copyright?: string;
  roster: Array<{
    person: MlbPerson;
    position?: {
      abbreviation?: string;
      code?: string;
      name?: string;
      type?: string;
    };
    status?: {
      code?: string;
      description?: string;
    };
  }>;
}

export class MlbStatsApiError extends Error {
  status: number;
  responseText: string;

  constructor(status: number, responseText: string) {
    super(`MLB Stats API request failed with status ${status}`);
    this.name = "MlbStatsApiError";
    this.status = status;
    this.responseText = responseText;
  }
}

export class MlbStatsApiService {
  async request<TResponse>(
    endpoint: string,
    options: MlbStatsApiRequestOptions = {},
  ): Promise<TResponse> {
    const url = buildMlbStatsApiUrl(endpoint, options.query);
    const response = await fetch(url, { signal: options.signal });

    if (!response.ok) {
      throw new MlbStatsApiError(response.status, await response.text());
    }

    return response.json() as Promise<TResponse>;
  }

  getPlayerBattingStats(
    playerId: string | number,
    options: PlayerBattingStatsOptions = {},
  ): Promise<MlbStatsResponse<MlbBattingStatLine>> {
    const {
      season = new Date().getFullYear(),
      gameType = "R",
      signal,
      stats = "season",
    } = options;

    return this.request<MlbStatsResponse<MlbBattingStatLine>>(
      `people/${playerId}/stats`,
      {
        query: {
          stats,
          group: "hitting",
          season,
          gameType,
        },
        signal,
      },
    );
  }

  getPlayersBattingStats(
    playerIds: Array<string | number>,
    options: PlayerBattingStatsOptions = {},
  ): Promise<MlbPeopleResponse<MlbBattingStatLine>> {
    const {
      season = new Date().getFullYear(),
      gameType = "R",
      signal,
      stats = "season",
    } = options;

    return this.request<MlbPeopleResponse<MlbBattingStatLine>>("people", {
      query: {
        personIds: playerIds.join(","),
        hydrate: `stats(group=[hitting],type=[${stats}],season=${season},gameType=${gameType})`,
      },
      signal,
    });
  }

  getSeasonBattingStats(
    options: SeasonBattingStatsOptions = {},
  ): Promise<MlbStatsResponse<MlbBattingStatLine>> {
    const {
      season = new Date().getFullYear(),
      limit = 100,
      playerPool = "ALL",
      sortStat = "homeRuns",
      signal,
    } = options;

    return this.request<MlbStatsResponse<MlbBattingStatLine>>("stats", {
      query: {
        stats: "season",
        group: "hitting",
        season,
        sportIds: 1,
        playerPool,
        sortStat,
        limit,
        hydrate: "person,team",
      },
      signal,
    });
  }

  getSchedule(options: MlbScheduleOptions): Promise<MlbScheduleResponse> {
    const {
      date,
      hydrate = "team",
      signal,
      sportId = 1,
    } = options;

    return this.request<MlbScheduleResponse>("schedule", {
      query: {
        sportId,
        date,
        hydrate,
      },
      signal,
    });
  }

  getGameFeed(
    gamePk: string | number,
    signal?: AbortSignal,
  ): Promise<MlbGameFeedResponse> {
    return this.request<MlbGameFeedResponse>(`api/v1.1/game/${gamePk}/feed/live`, {
      signal,
    });
  }

  getTeamRoster(
    teamId: string | number,
    options: MlbTeamRosterOptions = {},
  ): Promise<MlbTeamRosterResponse> {
    const {
      rosterType = "fullSeason",
      season = new Date().getFullYear(),
      signal,
    } = options;

    return this.request<MlbTeamRosterResponse>(`teams/${teamId}/roster`, {
      query: {
        rosterType,
        season,
      },
      signal,
    });
  }
}

export const mlbStatsApi = new MlbStatsApiService();

export function getMlbPlayerHeadshotUrl(playerId: string | number, width = 120) {
  return `${MLB_HEADSHOT_BASE_URL}/d_people:generic:headshot:67:current.png/w_${width},q_auto:best/v1/people/${playerId}/headshot/67/current`;
}

function buildMlbStatsApiUrl(endpoint: string, query: QueryParams = {}) {
  const path = endpoint.replace(/^\/+/, "");
  const normalizedPath = path.startsWith("api/")
    ? path
    : `api/v1/${path}`;
  const url = new URL(normalizedPath, `${MLB_STATS_API_BASE_URL}/`);

  Object.entries(query).forEach(([key, value]) => {
    appendQueryParam(url, key, value);
  });

  return url;
}

function appendQueryParam(
  url: URL,
  key: string,
  value: QueryValue | QueryValue[],
) {
  if (Array.isArray(value)) {
    value.forEach((item) => appendQueryParam(url, key, item));
    return;
  }

  if (value === null || value === undefined || value === "") {
    return;
  }

  url.searchParams.append(key, String(value));
}
