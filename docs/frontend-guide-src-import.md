# Frontend guide — speedrun.com import (dry-run phase)

Base: `NEXT_PUBLIC_DATA_URL`, all via `apiFetch<T>()`, `Authorization: Bearer {sessionId}`.
Success bodies are `{ result: T }` (apiFetch unwraps). Errors: plain-text body with the status below.

## Mod flow

1. Mod is on `/mod/<game>` (therun `gameId` known). They paste an SRC game URL.
2. `POST /v1/games/{gameId}/src-import` `{ url }` → 202 `{ jobId }`.
   - 400 invalid URL / body; 403 not authenticated | `You are not a moderator of this game on therun.gg` |
     `SRC identity not verified` | `Not a speedrun.com moderator of this game`; 404 SRC game not found;
     409 an import is already queued/running.
   - A `queued`/`running` job older than 6 hours is treated as stale and no longer blocks a new POST.
3. Poll `GET /v1/games/{gameId}/src-import` every ~5 s until `status` is `done` or `failed`.
   - The job fails (status `failed`, `error` set) if any single category+status set on SRC exceeds
     ~20,000 runs (unsupported in v1).
4. Show the review tabs from the sub-resources.

## Types (mirror into `types/src-import.types.ts`)

```ts
export type SrcImportJob = {
  id: number; gameId: number; srcGameId: string; srcGameAbbreviation: string; srcGameName: string; srcUrl: string;
  requestedBy: number; status: 'queued'|'running'|'done'|'failed'; phase: 'meta'|'runs'|'matching'|'done';
  checkpoint: { categoryIndex: number; status: 'verified'|'new'; offset: number; direction: 'asc'|'desc' } | null;
  categoriesCount: number; variablesCount: number; runsCount: number; playersCount: number; playersMatchedCount: number;
  requestsMade: number; error: string | null; startedAt: string | null; finishedAt: string | null; createdAt: string;
};
export type SrcImportCategory = { id: number; jobId: number; srcId: string; name: string; rules: string | null; type: 'per-game'|'per-level'; defaultTiming: 'realtime'|'realtime_noloads'|'ingame'|null; misc: boolean; sortOrder: number; skipped: boolean };
export type SrcImportVariable = { id: number; jobId: number; srcId: string; srcCategoryId: string | null; name: string; isSubcategory: boolean; values: { id: string; label: string; rules: string | null }[]; defaultValueId: string | null; scope: string; skipped: boolean };
export type SrcImportPlayer = { id: number; jobId: number; srcUserId: string | null; name: string; twitchLogin: string | null; youtubeUri: string | null; twitterUri: string | null; country: string | null; therunUserId: number | null; therunUsername: string | null; matchKind: 'src_verified'|'twitch'|'none' };
export type SrcImportRun = { id: number; jobId: number; srcRunId: string; srcCategoryId: string; status: 'verified'|'new'; realtimeMs: number | null; realtimeNoloadsMs: number | null; ingameMs: number | null; date: string | null; submittedAt: string | null; verifiedAt: string | null; srcVerifierId: string | null; comment: string | null; videoUrl: string | null; platformName: string | null; emulated: boolean; region: string | null; values: Record<string, string>; players: ({ srcUserId: string } | { guestName: string })[]; playerCount: number };
export type Paged<T> = { items: T[]; total: number };
```

## Endpoints

| Method | Path | Query | Returns |
|---|---|---|---|
| POST | `/v1/games/{gameId}/src-import` | body `{ url }` | 202 `{ jobId }` |
| GET | `/v1/games/{gameId}/src-import` | — | `SrcImportJob \| null` |
| GET | `/v1/games/{gameId}/src-import/{jobId}/categories` | — | `SrcImportCategory[]` |
| GET | `/v1/games/{gameId}/src-import/{jobId}/variables` | — | `SrcImportVariable[]` |
| GET | `/v1/games/{gameId}/src-import/{jobId}/players` | `match=src_verified\|twitch\|none`, `page`, `pageSize` (≤500) | `Paged<SrcImportPlayer>` |
| GET | `/v1/games/{gameId}/src-import/{jobId}/runs` | `categoryId` (SRC id), `status=verified\|new`, `page`, `pageSize` (≤500) | `Paged<SrcImportRun>` |
| PUT | `/admin/users/{username}/src-identity` | body `{ srcUserId }` or `{ srcName }` | `{ username, srcUserId }` (admin only) |
| DELETE | `/admin/users/{username}/src-identity` | — | `{ username, srcUserId: null }` |

All GETs require the caller to hold `import-board` on the game (game-mod/game-admin/series-mod/series-admin/global-admin).

## Suggested UI

- Import card on the mod panel: URL input, submit, job status line (`phase`, counters, `requestsMade`, `error`).
- Review page tabs: Categories (flag `skipped` = IL, not imported), Variables (subcategory vs filter, `skipped`),
  Players (filter by `matchKind`; `none` is the "needs a claim" list; `twitch` is a suggestion — say so),
  Runs (filter by category/status; `playerCount > 1` = co-op, `videoUrl` null = no video).
- Nothing on this page commits anything; the commit action is a later phase.
