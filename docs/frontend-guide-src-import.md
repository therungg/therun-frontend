# Frontend guide — speedrun.com import (dry-run phase)

Base: `NEXT_PUBLIC_DATA_URL`, all via `apiFetch<T>()`, `Authorization: Bearer {sessionId}`.

**Path prefix:** every route below is served from a sibling RestApi mapped at `api.therun.gg/src-import/**` — the
main API template is at CloudFormation's 500-resource cap (see `aws/lib/src-import-stack.ts`). Public paths are
`/src-import/games/{gameId}[/{jobId}/…]` and `/src-import/admin/users/{username}/src-identity`; the Lambda rewrites
them internally onto `/v1/games/{gameId}/src-import/**` and `/admin/users/**`.
Success bodies are `{ result: T }` (apiFetch unwraps). Errors: plain-text body with the status below.

## Mod flow

1. Mod is on `/mod/<game>` (therun `gameId` known). They paste an SRC game URL.
2. `POST /src-import/games/{gameId}` `{ url }` → 202 `{ jobId }`.
   - 400 invalid URL / body; 403 not authenticated | `You are not a moderator of this game on therun.gg` |
     `SRC identity not verified` | `Not a speedrun.com moderator of this game` (global admins skip these two);
     404 SRC game not found;
     409 an import is already queued/running.
   - A `queued`/`running` job older than 6 hours is treated as stale and no longer blocks a new POST.
3. Poll `GET /src-import/games/{gameId}` every ~5 s until `status` is `done` or `failed`.
   - The job fails (status `failed`, `error` set) if any single category+status set on SRC exceeds
     ~20,000 runs (unsupported in v1).
4. Show the review tabs from the sub-resources.

## Types (mirror into `types/src-import.types.ts`)

```ts
export type SrcImportJob = {
  id: number; gameId: number; srcGameId: string; srcGameAbbreviation: string; srcGameName: string; srcUrl: string;
  requestedBy: number; status: 'queued'|'running'|'done'|'failed'; phase: 'meta'|'runs'|'matching'|'done';
  checkpoint: { categoryIndex: number; status: 'verified'|'new'; offset: number; direction: 'asc'|'desc' } | null;
  categoriesCount: number; levelsCount: number; variablesCount: number; runsCount: number; playersCount: number; playersMatchedCount: number;
  requestsMade: number; error: string | null; startedAt: string | null; finishedAt: string | null; createdAt: string;
};
export type SrcImportCategory = { id: number; jobId: number; srcId: string; name: string; rules: string | null; type: 'per-game'|'per-level'; defaultTiming: 'realtime'|'realtime_noloads'|'ingame'|null; misc: boolean; sortOrder: number; skipped: boolean };
// SRC levels: a plain ordered list. Level categories (type 'per-level') apply to every level.
export type SrcImportLevel = { id: number; jobId: number; srcId: string; name: string; rules: string | null; sortOrder: number };
export type SrcImportVariable = { id: number; jobId: number; srcId: string; srcCategoryId: string | null; name: string; isSubcategory: boolean; values: { id: string; label: string; rules: string | null }[]; defaultValueId: string | null; scope: 'global'|'full-game'|'all-levels'|'single-level'; srcLevelId: string | null; skipped: boolean };
export type SrcImportPlayer = { id: number; jobId: number; srcUserId: string | null; name: string; twitchLogin: string | null; youtubeUri: string | null; twitterUri: string | null; country: string | null; therunUserId: number | null; therunUsername: string | null; matchKind: 'src_verified'|'twitch'|'none' };
export type SrcImportRun = { id: number; jobId: number; srcRunId: string; srcCategoryId: string; srcLevelId: string | null; status: 'verified'|'new'; realtimeMs: number | null; realtimeNoloadsMs: number | null; ingameMs: number | null; date: string | null; submittedAt: string | null; verifiedAt: string | null; srcVerifierId: string | null; comment: string | null; videoUrl: string | null; platformName: string | null; emulated: boolean; region: string | null; values: Record<string, string>; players: ({ srcUserId: string; name: string | null; twitchLogin: string | null; therunUsername: string | null } | { guestName: string })[]; playerCount: number };
export type Paged<T> = { items: T[]; total: number };
```

## Endpoints

| Method | Path | Query | Returns |
|---|---|---|---|
| POST | `/src-import/games/{gameId}` | body `{ url }` | 202 `{ jobId }` |
| GET | `/src-import/games/{gameId}` | — | `SrcImportJob \| null` |
| GET | `/src-import/games/{gameId}/{jobId}/categories` | — | `SrcImportCategory[]` |
| GET | `/src-import/games/{gameId}/{jobId}/levels` | — | `SrcImportLevel[]` |
| GET | `/src-import/games/{gameId}/{jobId}/variables` | — | `SrcImportVariable[]` |
| GET | `/src-import/games/{gameId}/{jobId}/players` | `match=src_verified\|twitch\|none`, `page`, `pageSize` (≤500) | `Paged<SrcImportPlayer>` |
| GET | `/src-import/games/{gameId}/{jobId}/runs` | `categoryId` (SRC id), `levelId` (SRC id), `status=verified\|new`, `page`, `pageSize` (≤500) | `Paged<SrcImportRun>` |
| PUT | `/src-import/admin/users/{username}/src-identity` | body `{ srcUserId }` or `{ srcName }` | `{ username, srcUserId }` (admin only) |
| DELETE | `/src-import/admin/users/{username}/src-identity` | — | `{ username, srcUserId: null }` |

All GETs require the caller to hold `import-board` on the game (game-mod/game-admin/series-mod/series-admin/global-admin).

## Suggested UI

- Import card on the mod panel: URL input, submit, job status line (`phase`, counters, `requestsMade`, `error`).
- Review page tabs: Categories (`type` = full game vs level category; level categories apply to every level), Levels, Variables (subcategory vs filter, `skipped`),
  Players (filter by `matchKind`; `none` is the "needs a claim" list; `twitch` is a suggestion — say so),
  Runs (filter by category/level/status; `srcLevelId` set = IL run; `playerCount > 1` = co-op, `videoUrl` null = no video).
- Nothing on this page commits anything; the commit action is a later phase.

## Commit phase

The dry run stages; the commit phase writes. Two steps, in order, both on the game's **latest `done` job**:
`apply-config` (categories/levels/variables) then `import-runs` (`finished_runs` rows). Both are 202-accepted and
run on the import worker; poll `GET /src-import/games/{gameId}` for progress.

### Extra fields on `SrcImportJob`

```ts
export type SrcImportCommitStatus = 'planning'|'applying'|'applied'|'importing'|'imported'|'failed';

export type SrcImportJobCommitFields = {
  commitStatus: SrcImportCommitStatus | null;
  commitPhase: 'config' | 'runs' | null;
  commitCheckpoint: { cursor: number; batch: number; updatedAtMs?: number } | null;
  commitError: string | null;
  commitOverrides: SrcCommitOverrides | null;
  importedRunsCount: number;
  importSkippedCount: number;
  configAppliedAt: string | null;
  runsImportedAt: string | null;
};
```

### Plan types

```ts
export type SrcPlanAction = 'create' | 'reuse' | 'skip';
export type SrcCommitOverrides = {
  categories?: Record<string, { action: SrcPlanAction; therunId?: number }>;
  levels?: Record<string, { action: SrcPlanAction; therunId?: number }>;
  variables?: Record<string, { action: SrcPlanAction; therunId?: number }>;
};
export type SrcCommitPlan = {
  categories: Array<{ srcId: string; name: string; type: 'per-game'|'per-level'; action: SrcPlanAction; therunId?: number; therunDisplay?: string; reason?: string }>;
  levels: Array<{ srcId: string; name: string; action: SrcPlanAction; therunId?: number; reason?: string }>;
  variables: Array<{
    srcId: string; name: string; role: 'subcategory'|'filter'; scope: string;
    targets: Array<{ kind: 'category'|'template'|'instance'; therunId?: number; name: string }>;
    action: SrcPlanAction;
    values: Array<{
      srcId: string; label: string; action: 'create'|'reuse';
      /** Set when this SRC value normalized to the same string as an earlier one and
       * was folded into it. Both srcIds still get a `variable-value` mapping written
       * on apply-config, pointing at the surviving canonical label. */
      mergedIntoSrcId?: string;
    }>;
    nameNormalized?: string; reason?: string;
  }>;
  conflicts: Array<{ kind: 'category'|'level'|'variable'; srcId: string; message: string }>;
  runs: { total: number; byStatus: { verified: number; new: number }; guests: number; matched: number; unmappable: number };
};
```

### Endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/src-import/games/{gameId}/{jobId}/plan` | — | `SrcCommitPlan` |
| POST | `/src-import/games/{gameId}/{jobId}/plan` | `SrcCommitOverrides` | `SrcCommitPlan` (stored, then recomputed) |
| POST | `/src-import/games/{gameId}/{jobId}/apply-config` | — | 202 `{ jobId }` · 409 conflicts / not latest done job / already in progress · 403 without `create-edit-category` |
| POST | `/src-import/games/{gameId}/{jobId}/import-runs` | — | 202 `{ jobId }` · 409 config not applied / already importing · 403 without `verify-reject-run` |

`GET /src-import/games/{gameId}` returns the job with the commit fields above.

Both `apply-config` and `import-runs` additionally require `import-board` (same as every other src-import route) on
top of the permission listed above — the check runs first, before the more specific one, so a non-moderator gets a
generic "not a moderator" 403 rather than the category/run-specific message.

**POST /plan replaces, it does not merge.** The body you send becomes the job's entire stored `commitOverrides`.
Omitting a group (e.g. sending `{ categories: {...} }` with no `levels` key) clears any previously-stored overrides
for that group — it does not leave them untouched. Send the full override set on every call. Arrays are rejected:
each group and each entry within it must be a plain object (`{ "srcId": { "action": ... } }`), not a list; a 400 is
returned otherwise.

**Re-POSTing `import-runs` on an already-`imported` job is allowed and resets progress**: it resets
`commitCheckpoint` to `{ cursor: 0, batch: 0 }` and sets `commitStatus` back to `importing` (not straight to
`imported`) — the worker re-walks `finished_runs` from the start, upserting via the existing links, so already-linked
rows are updated rather than duplicated. `apply-config` cannot be re-run while `import-runs` has already succeeded
in the sense of blocking progress — both actions 409 while a commit is in `applying`/`importing`.

**Stale commits are reclaimable after 20 minutes.** The worker stamps `commitCheckpoint.updatedAtMs` on every
commit-phase write. If a job sits in `applying`/`importing` with a stamp older than 20 minutes (or with no stamp at
all), it is treated as abandoned and a new POST takes it over instead of 409ing — so a worker that died mid-commit
never locks a game's import permanently. Below 20 minutes the 409 stands; surface it as "a commit is already
running" rather than offering a retry.

**Variables already on a target board.** If the plan wants to write a variable whose key already exists on one of
its target categories, the existing value set wins: when it covers every SRC value the variable is planned as
`reuse` with reason `matches existing variable` and nothing is written (the SRC values are mapped onto the live
labels); when it does not cover them, a `variable` conflict is raised and `apply-config` is blocked until it is
resolved with an override — the import never silently reshapes a live board's subcategories.

**`isPb` on imported runs.** After the walk, `import-runs` recomputes `isPb`/`isPbGametime` across the game's
imported rows only (`source = 'src_import'`): the fastest run per runner, category and subcategory key. Runs that
entered therun natively are deliberately untouched, so a runner with both native and imported history can show a PB
flag on one of each — imported history cannot retroactively take the flag off a timer run.

If the enqueue for either action fails (SQS error, etc.), the handler returns `500` and rolls the job's
`commitStatus`/`commitPhase`/`commitError` back to what they were before the request — the row never gets stuck
looking permanently busy, so a retry after a transient failure works.

**Timing mapping** (for reference, not something the UI computes): SRC's `realtime_noloads` default timing on a
category maps to therun's `gametime` timing with the game-time label `lrt` (loadless real time), the same way
`ingame` maps to `gametime`/`igt`. Only `realtime` maps straight to therun's `realtime`.

### Notes for the UI

- Render `conflicts` as blocking: `apply-config` 409s until every one is resolved via an override.
- Progress: `importedRunsCount + importSkippedCount` out of `runsCount`; `commitError` is the failure reason.
- Re-running either action is safe. `apply-config` is a no-op apart from newly staged rows; `import-runs` updates
  already-linked rows instead of duplicating them.
- Imported runs carry `source === 'src_import'` — badge them as "imported from speedrun.com". Unmatched SRC runners
  become guest rows claimable through the existing Twitch-rename carry flow.
