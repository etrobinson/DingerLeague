
# Home Run Derby App

This is a code bundle for Home Run Derby App. The original project is available at https://www.figma.com/design/77OOHG2vMG1A894P70lToK/Home-Run-Derby-App.

## Local Development

Install dependencies:

```sh
npm i
```

Start the Vite development server:

```sh
npm run dev
```

Vite will print a local URL such as `http://localhost:5173/`.

## Build

Create a production build:

```sh
npm run build
```

The compiled static site is written to `dist/`. That folder is what gets uploaded to S3.

## Deploy to S3 and CloudFront

This app is hosted as a static site from S3 behind CloudFront.

Current production resources:

- S3 bucket: `dinger-league-app-prod-etrobinson`
- CloudFront distribution ID: `E1RV02VMDQUOL4`
- CloudFront URL: `https://d1mjcl0mqy2j6u.cloudfront.net`

To build, upload to S3, and invalidate CloudFront in one command:

```sh
npm run deploy
```

The deploy script lives at `scripts/deploy.sh`. It defaults to the production bucket and CloudFront distribution above.

To deploy to a different bucket or distribution, override the defaults:

```sh
BUCKET_NAME=your-bucket-name DISTRIBUTION_ID=YOUR_DISTRIBUTION_ID npm run deploy
```

Manual deployment steps are below if you want to run them one at a time.

After running `npm run build`, upload the contents of `dist/` to S3:

```sh
aws s3 sync dist/ s3://dinger-league-app-prod-etrobinson --delete
```

Then invalidate CloudFront so friends see the newest version right away:

```sh
aws cloudfront create-invalidation \
  --distribution-id E1RV02VMDQUOL4 \
  --paths "/*"
```

If your terminal does not recognize `aws`, use the installed AWS CLI path directly:

```sh
/Users/eddierobinson/.local/bin/aws s3 sync dist/ s3://dinger-league-app-prod-etrobinson --delete
```

```sh
/Users/eddierobinson/.local/bin/aws cloudfront create-invalidation \
  --distribution-id E1RV02VMDQUOL4 \
  --paths "/*"
```

CloudFront should be configured with:

- Default root object: `index.html`
- Custom error response for `403`: respond with `/index.html` and HTTP `200`
- Custom error response for `404`: respond with `/index.html` and HTTP `200`
- Origin access control enabled for the S3 bucket

Those error responses keep direct page loads and refreshed SPA routes from showing S3 XML `AccessDenied` errors.

## MLB Stats API Service

The app includes a reusable MLB Stats API client at `src/app/services/mlbStatsApi.ts`.
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
  
