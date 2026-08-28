import { LEAGUE_SEASON } from "../data/leagueRosters";
import {
  type MlbBoxscorePlayer,
  type MlbGameFeedResponse,
  type MlbScheduledGame,
  mlbStatsApi,
} from "./mlbStatsApi";

export type PlayerGameStatus =
  | "playing_today"
  | "not_playing_today"
  | "injured_list"
  | "in_game_now"
  | "played_today"
  | "home_run_today";

export interface DailyStatusPlayer {
  id: string;
  teamId: number | null;
}

export interface PlayerDailyStatus {
  status: PlayerGameStatus;
  label: string;
}

const STATUS_LABELS: Record<PlayerGameStatus, string> = {
  playing_today: "Playing today",
  not_playing_today: "Not playing today",
  injured_list: "IL",
  in_game_now: "In game now",
  played_today: "Played today",
  home_run_today: "Home run today",
};

export async function getPlayerDailyStatuses(
  players: DailyStatusPlayer[],
  signal?: AbortSignal,
) {
  const today = formatDateForMlb(new Date());
  const schedule = await mlbStatsApi.getSchedule({ date: today, signal });
  const games = schedule.dates.flatMap((date) => date.games);
  const gameByTeamId = buildGameByTeamId(games);
  const teamIds = getUniqueTeamIds(players);
  const gamePks = getRelevantGamePks(players, gameByTeamId);

  const [rosterStatuses, gameFeeds] = await Promise.all([
    getRosterStatuses(teamIds, signal),
    getGameFeeds(gamePks, signal),
  ]);

  return new Map(
    players.map((player) => [
      player.id,
      resolvePlayerDailyStatus(player, gameByTeamId, rosterStatuses, gameFeeds),
    ]),
  );
}

export function getPlayerStatusLabel(status: PlayerGameStatus) {
  return STATUS_LABELS[status];
}

function resolvePlayerDailyStatus(
  player: DailyStatusPlayer,
  gameByTeamId: Map<number, MlbScheduledGame>,
  rosterStatuses: Map<string, string>,
  gameFeeds: Map<number, MlbGameFeedResponse>,
): PlayerDailyStatus {
  const teamGame = player.teamId ? gameByTeamId.get(player.teamId) : undefined;
  const rosterStatus = rosterStatuses.get(player.id);
  const isInjured = isInjuredListStatus(rosterStatus);

  if (!teamGame) {
    return isInjured ? getStatus("injured_list") : getStatus("not_playing_today");
  }

  const gameFeed = gameFeeds.get(teamGame.gamePk);
  const boxscorePlayer = gameFeed ? findBoxscorePlayer(gameFeed, player.id) : undefined;
  const homeRuns = boxscorePlayer?.stats?.batting?.homeRuns ?? 0;

  if (homeRuns > 0) {
    return getStatus("home_run_today");
  }

  if (isInjured) {
    return getStatus("injured_list");
  }

  if (isLiveGame(teamGame.status.abstractGameState)) {
    return getStatus("in_game_now");
  }

  if (isFinalGame(teamGame.status.abstractGameState)) {
    return boxscorePlayer ? getStatus("played_today") : getStatus("not_playing_today");
  }

  return getStatus("playing_today");
}

function getStatus(status: PlayerGameStatus): PlayerDailyStatus {
  return {
    status,
    label: STATUS_LABELS[status],
  };
}

function buildGameByTeamId(games: MlbScheduledGame[]) {
  const gameByTeamId = new Map<number, MlbScheduledGame>();

  games.forEach((game) => {
    gameByTeamId.set(game.teams.away.team.id, game);
    gameByTeamId.set(game.teams.home.team.id, game);
  });

  return gameByTeamId;
}

function getUniqueTeamIds(players: DailyStatusPlayer[]) {
  return Array.from(
    new Set(
      players
        .map((player) => player.teamId)
        .filter((teamId): teamId is number => teamId !== null),
    ),
  );
}

function getRelevantGamePks(
  players: DailyStatusPlayer[],
  gameByTeamId: Map<number, MlbScheduledGame>,
) {
  return Array.from(
    new Set(
      players
        .map((player) => {
          const game = player.teamId ? gameByTeamId.get(player.teamId) : undefined;

          if (
            !game ||
            (!isLiveGame(game.status.abstractGameState) &&
              !isFinalGame(game.status.abstractGameState))
          ) {
            return undefined;
          }

          return game.gamePk;
        })
        .filter((gamePk): gamePk is number => gamePk !== undefined),
    ),
  );
}

async function getRosterStatuses(teamIds: number[], signal?: AbortSignal) {
  const rosterResponses = await Promise.all(
    teamIds.map((teamId) => mlbStatsApi.getTeamRoster(teamId, {
      rosterType: "fullSeason",
      season: LEAGUE_SEASON,
      signal,
    })),
  );
  const statuses = new Map<string, string>();

  rosterResponses.forEach((response) => {
    response.roster.forEach((entry) => {
      if (entry.status?.description) {
        statuses.set(String(entry.person.id), entry.status.description);
      }
    });
  });

  return statuses;
}

async function getGameFeeds(gamePks: number[], signal?: AbortSignal) {
  const gameFeeds = await Promise.all(
    gamePks.map((gamePk) => mlbStatsApi.getGameFeed(gamePk, signal)),
  );

  return new Map(gameFeeds.map((feed) => [feed.gamePk, feed]));
}

function findBoxscorePlayer(gameFeed: MlbGameFeedResponse, playerId: string) {
  const awayPlayers = gameFeed.liveData?.boxscore?.teams?.away?.players ?? {};
  const homePlayers = gameFeed.liveData?.boxscore?.teams?.home?.players ?? {};

  return Object.values({ ...awayPlayers, ...homePlayers }).find(
    (player: MlbBoxscorePlayer) => String(player.person.id) === playerId,
  );
}

function isInjuredListStatus(description?: string) {
  return Boolean(description?.toLowerCase().includes("injured"));
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
