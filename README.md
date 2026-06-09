
  # Home Run Derby App

  This is a code bundle for Home Run Derby App. The original project is available at https://www.figma.com/design/77OOHG2vMG1A894P70lToK/Home-Run-Derby-App.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## MLB Stats API service

  The app now includes a reusable MLB Stats API client at `src/app/services/mlbStatsApi.ts`.
  The 2026 Dinger League owner rosters live in `src/app/data/leagueRosters.ts`, using MLB `personId` values resolved from the spreadsheet roster names.

  Example: request season batting stats for one player:

  ```ts
  import { mlbStatsApi } from "./app/services";

  const battingStats = await mlbStatsApi.getPlayerBattingStats(592450, {
    season: 2026,
  });
  ```

  Example: request batting stats for a full roster in one call:

  ```ts
  const rosterStats = await mlbStatsApi.getPlayersBattingStats(
    [592450, 660271, 656941],
    { season: 2026 },
  );
  ```

  You can also request a generic MLB Stats API endpoint directly:

  ```ts
  const leaders = await mlbStatsApi.request("stats", {
    query: {
      stats: "season",
      group: "hitting",
      season: 2026,
      sportIds: 1,
      playerPool: "ALL",
      sortStat: "homeRuns",
      limit: 25,
    },
  });
  ```
  
