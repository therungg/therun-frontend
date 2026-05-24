# Moderation / Leaderboard Backend Contract (AS-SHIPPED)

Extracted directly from the backend handler + routing + shape source in
`/home/joey/therun/therun` on branch `main` (HEAD `8e606de`). This documents the
**actual** HTTP contract the handlers implement — field names, casing, wrapping,
status codes — so the frontend can be built against it without guessing.

> Every type/field below is copied from the server source. Where the server reads
> a field, the name here is the exact key it reads. Where it writes a response,
> the shape here is what `JSON.stringify` emits.

---

## ⚠️ Critical infra gap (read first)

The Lambda entrypoint (`src/api/api-entry.ts`) dispatches all the endpoints below,
and the handlers are committed and working. **However**, the API Gateway CDK stack
(`aws/lib/api-stack.ts`) uses `proxy: false` (every route is an explicit
`addResource`/`addMethod`) and **does not yet register**:

- `…/v1/leaderboards/games/{gameId}/…` (the entire §A–§D + mass-mgmt subtree)
- `…/v1/me/*` (manual-times, runs/{id}/verdict, notifications)
- `…/v1/reports`
- `…/v1/runs/{runId}/history` and `…/v1/runs/{runId}/appeal`

As deployed today, calls to those paths return API Gateway's `403 {"message":"Missing Authentication Token"}` / `404`, because no resource/method exists. The
contract below reflects what the **handler code** will serve once the gateway
resources are added (which is the contract the frontend should target). Treat
paths as authoritative for FE work; flag the infra registration as a prerequisite.

---

## Conventions

### Base URL
- All requests go through the backend REST API at `NEXT_PUBLIC_DATA_URL` (frontend
  env var; the backend is a single API-Gateway-fronted Lambda).
- The Lambda strips the API stage prefix; `event.path` seen by handlers begins at
  `/v1/...` (or `/leaderboards/...` for the legacy non-v1 dispatch — but the
  moderation feature lives under `/v1`). **Build all moderation URLs with the
  `/v1` prefix** — see per-family notes below.

### `/v1` prefix — exact presence per family
The router in `api-entry.ts` keys on `path.startsWith("/v1/leaderboards")`,
`"/v1/me"`, `"/v1/reports"`, `"/v1/runs")`. The **inner** handler regexes match a
substring like `/leaderboards/games/\d+/manual-times` — that substring is present
inside `/v1/leaderboards/games/123/manual-times`, so the real client path is:

| Family | Real client path prefix |
|---|---|
| §A manual times | `/v1/leaderboards/games/{gameId}/manual-times…` |
| §B verdicts | `/v1/leaderboards/games/{gameId}/verdicts…` |
| §C triage (queue/reports) | `/v1/leaderboards/games/{gameId}/queue…`, `/v1/leaderboards/games/{gameId}/reports` |
| §D policies | `/v1/leaderboards/games/{gameId}/policies…` |
| mass-mgmt | `/v1/leaderboards/games/{gameId}/{users,categories,exclude,include,exclusion-rules,mod-actions}…` |
| §E self-service | `/v1/me/manual-times…`, `/v1/me/runs/{runId}/verdict` |
| §F reports | `/v1/reports` |
| §G appeals | `/v1/runs/{runId}/appeal` |
| §G history | `/v1/runs/{runId}/history` |
| §G notifications | `/v1/me/notifications…` |

> All `/v1/leaderboards/games/...` paths use a **numeric `{gameId}`** (the
> internal games-table id), NOT the slug. (The public leaderboard read endpoint
> `/v1/leaderboards/{game}/{category}` uses slugs — that is a *different* route.)

### Auth header
- `Authorization: Bearer {sessionId}` on every authed endpoint.
- The server reads `event.headers["Authorization"]`, requires it to start with
  `bearer ` (case-insensitive), and resolves the session to a `User`.
  `authUser.user` is the **username** (string); handlers then look up the numeric
  user id by `lower(username) = lower(authUser.user)`.
- Missing/invalid header → `403` (see error format). Note: the session id is the
  bearer token; there is no separate API key required for these routes in-handler
  (API-key gating, if any, is at the gateway).

### Response wrapping — DIFFERS BY FAMILY (important)
Two distinct conventions are in play:

1. **Wrapped `{ result: ... }`** — used by everything under `/v1/me/*`,
   `/v1/reports`, and `/v1/runs/*` (these handlers call
   `ok(JSON.stringify({ result: ... }))` directly). Also the
   `/v1/leaderboards/.../invalidate-cache` and `/v1/leaderboards/runs/{id}` detail
   routes wrap.
2. **BARE JSON (no wrapper)** — used by **all §A–§D and mass-mgmt** handlers under
   `/v1/leaderboards/games/{gameId}/…`. They call `ok(JSON.stringify(result))`
   where `result` is the payload itself (an array, or an object like
   `{ id, ... }`). **Do not** expect a `{ result }` envelope on these.

> The generic `respond()` helper in `api-entry.ts` *does* wrap in `{ result }`,
> but the moderation handlers bypass it and stringify their own bodies. So
> wrapping is per-handler, summarized in each section below.

### Error format
- Errors are **plain-text bodies** (not JSON) for the common helpers:
  - `400` (`yourFault`) — body is a bare string, e.g. `"reason is required (min 10 characters)"`.
  - `403` (`forbidden`) — bare string, e.g. `"Not authenticated"`, `"banned"`, `"Not authorized to mod this game"`.
  - `404` (`notFound`) — bare string, e.g. `"manual time not found"`, `"not found"`.
- Two endpoints return **JSON error bodies** explicitly:
  - §F reports rate-limit → `429 {"error":"rate limit exceeded"}`.
  - mass-mgmt unmatched route fallthrough → `501 {"error":"not implemented"}`.
- The public leaderboard read endpoint returns `404` with a JSON string body
  `{"error":"leaderboard does not exist", validCombinations}` on
  `INVALID_COMBINATION` — but that's outside this feature.
- There is **no top-level `Content-Type` set** on the success/error responses from
  `ok/yourFault/notFound/forbidden` (only the 429/501 JSON ones set headers). FE
  should `JSON.parse` success bodies and treat non-2xx bodies as text.

### Permission helper names (exact)
- **`checkGameMgmtPermission(callerId, "verify-reject-run", { gameId })`** — the
  single permission gate used by **all** per-game mod endpoints (§A manual times,
  §B verdicts, §C triage, §D policies, **and** mass-mgmt). It throws on denial;
  handlers catch and return `403`. There is **no finer-grained action** per
  endpoint — every mod write/read in this feature checks the same
  `"verify-reject-run"` action scoped to `{ gameId }`.
- **`isBanned(userId): { banned: boolean }`** — self-service ban gate (§E). A
  "ban" = a `user`-type exclusion rule with `gameId IS NULL AND categoryId IS NULL`
  (global). Banned → `403 "banned"`.
- **`evaluateTrust(userId): "instant" | "provisional"`** — self-service trust gate.
  Returns `"instant"` if the user has ≥1 prior `verified` finished run on any
  board, OR account age > 7 days; otherwise `"provisional"`.
- `confirmPermission(user, "edit", "leaderboard")` — used only by the
  admin-only `invalidate-cache` route (CASL-style, not part of the mod feature
  proper).

### Field-name landmines (the things most likely to break a naive FE)
- Time field is **`timeMs`** (camelCase) in *request bodies and most responses*.
  EXCEPTIONS: the SQL-projected preview/roster paths use the raw column **`time`**
  (and `gameTime`) — see each shape. The DB column is `time_ms`/`time`.
- **`timing` values are `"realtime"` / `"gametime"`** (full words) in manual-times,
  preview, verdicts request bodies and rows. The *public leaderboard read* endpoint
  uses `"rt"` / `"gt"` for its `?timing=` query and `timing` response field — do
  NOT mix these up. Manual-time/self-service/preview = `realtime`/`gametime`;
  leaderboard read = `rt`/`gt`.
- Runner identity in **§A/preview request bodies** is a discriminated
  **`runnerRef: { userId: number } | { guestName: string }`** — NOT separate
  `userId`/`guestName` top-level fields. (In *responses* and in self-service, you
  instead see separate `userId` + `guestName`/`runnerName`.)
- **`subcategoryKey`** is camelCase everywhere in JSON (DB column is
  `subcategory_key`). Empty string `""` means "no subcategory", and the server
  defaults a missing `subcategoryKey` to `""`.
- Verdict action vocab: **`"verify" | "reject" | "unreject"`** for bulk verdicts;
  self-service run verdict uses **`"reject" | "unreject"`** only; manual-time
  verdict uses **`"verify" | "reject"`** only.
- `reason` minimum length is **10 characters (after trim)** on every mutating mod
  endpoint and on appeals/reports. Sub-10 → `400`.

---

## §A — Manual Times
Handler: `src/api/leaderboards/mod-manual-times-handler.ts`
Path predicate: `/leaderboards/games/{gameId}/manual-times…`
Auth: `Bearer`; `checkGameMgmtPermission(callerId, "verify-reject-run", { gameId })`.
Wrapping: **BARE** (no `{ result }`).

### A1. `GET /v1/leaderboards/games/{gameId}/manual-times`
List manual times for a game (mod view).

Query params (all optional):
```ts
{
  categoryId?: number;     // parsed from string
  subcategoryKey?: string;
  userId?: number;         // parsed from string
  runnerName?: string;     // matches guest_name exactly (see note)
}
```
> NOTE: `runnerName` filter only matches the stored `guest_name` column
> (`guestName = runnerName`); it does NOT match registered usernames.

Response `200` — **bare array** (augmented rows):
```ts
Array<{
  id: number;
  userId: number | null;
  guestName: string | null;
  runnerName: string;          // username if userId set, else guestName, else ""
  categoryId: number;
  subcategoryKey: string;
  timing: "realtime" | "gametime";
  timeMs: number;
  evidenceUrl: string | null;
  verificationStatus: "pending" | "verified" | "rejected";
  source: "mod" | "self" | "system";
  createdBy: number;
  createdByName: string;       // username of creator, or ""
  reason: string;
  createdAt: string;           // ISO 8601
}>
```

### A2. `POST /v1/leaderboards/games/{gameId}/manual-times/preview`
Project where a candidate time would land before writing.

Request body:
```ts
{
  runnerRef: { userId: number } | { guestName: string };  // required
  categoryId: number;                                       // required
  subcategoryKey?: string;                                  // defaults ""
  timing: "realtime" | "gametime";                          // required
  timeMs: number;                                           // required, > 0
}
```
Validation: missing `runnerRef`/`categoryId`/invalid `timing`/non-number `timeMs`
→ `400 "missing fields"`; `timeMs <= 0` → `400 "timeMs must be positive"`.

Response `200` — **bare** (`PreviewResponse`):
```ts
{
  resultingEntry: { rank: number | null; timeMs: number };
  beatsExistingEntry: boolean;
  affectedLeaderboards: Array<{
    categoryId: number;
    subcategoryKey: string;
    rankChanges: Array<{
      runnerName: string;
      userId: number | null;
      currentRank: number | null;
      newRank: number | null;
      timeMs: number | null;
    }>;
  }>;
}
```

### A3. `POST /v1/leaderboards/games/{gameId}/manual-times`
Create/upsert a mod-authored manual time. Always written as
`verificationStatus: "verified"`, `source: "mod"`.

Request body:
```ts
{
  runnerRef: { userId: number } | { guestName: string };  // required; guestName must be non-empty
  categoryId: number;                                       // required (truthy)
  subcategoryKey?: string;                                  // defaults ""
  timing: "realtime" | "gametime";                          // required
  timeMs: number;                                           // required, > 0
  evidenceUrl?: string | null;
  reason: string;                                           // required, trim length >= 10
}
```
Validation errors (all `400`, plain text): `"reason is required (min 10 characters)"`,
`"invalid timing"`, `"timeMs must be positive"`, `"categoryId required"`,
`"runnerRef required"`, `"guestName cannot be empty"`.

Response `200` — **bare**:
```ts
{
  id: number;
  affectedLeaderboards: Array<{ categoryId: number; subcategoryKey: string }>;
}
```
Side effects: writes `logs`, enqueues leaderboard rebuild for `(gameId, categoryId)`,
and if `runnerRef` is a registered user, emits a `manual_time_created` notification.

### A4. `POST /v1/leaderboards/games/{gameId}/manual-times/{id}/verdict`
Verify or reject an existing manual time.

Request body:
```ts
{
  action: "verify" | "reject";   // required
  reason: string;                 // required, >= 10
}
```
Errors: `400` on bad reason/action; `404 "manual time not found"`;
`403 "not in this game"` if the manual time's `gameId` ≠ path gameId.

Response `200` — **bare**:
```ts
{ id: number; verificationStatus: "verified" | "rejected" }
```
Side effects: rebuild enqueue; `manual_time_verdict` notification to the runner
(if registered) with `{ gameId, categoryId, manualTimeId, verdict }`.

### A5. `PUT /v1/leaderboards/games/{gameId}/manual-times/{id}`
Edit reason / timeMs / evidenceUrl.

Request body:
```ts
{
  reason: string;            // required, >= 10
  timeMs?: number;           // optional; if present must be > 0
  evidenceUrl?: string | null;  // optional; if key present (even null) it's written
}
```
Errors: `400` bad reason / `timeMs <= 0`; `404 "manual time not found"`;
`403 "not in this game"`.

Response `200` — **bare**: `{ id: number; updated: true }`.

### A6. `DELETE /v1/leaderboards/games/{gameId}/manual-times/{id}`
Delete a manual time. Body is required (carries the reason) even on DELETE.

Request body:
```ts
{ reason: string }  // required, >= 10
```
Errors: `400` bad reason; `404 "manual time not found"`; `403 "not in this game"`.

Response `200` — **bare**:
```ts
{
  deleted: true;
  affectedLeaderboards: Array<{ categoryId: number; subcategoryKey: string }>;
}
```
Side effects: rebuild enqueue; `manual_time_deleted` notification to runner (if
registered).

---

## §B — Bulk Verdicts
Handler: `src/api/leaderboards/mod-verdicts-handler.ts`
Path predicate: `/leaderboards/games/{gameId}/verdicts…`
Auth: `Bearer` + `checkGameMgmtPermission(callerId, "verify-reject-run", { gameId })`.
Wrapping: **BARE**.

Shared body validation (`validateActionRunIds`):
```ts
{
  action: "verify" | "reject" | "unreject";   // required
  runIds: number[];                            // required, length 1..500, all finite numbers
}
```
Errors (`400`, plain text): `"action must be one of verify, reject, unreject"`,
`"runIds array required"`, `"max 500 runs per batch"`, `"runIds must be numbers"`.

### B1. `POST /v1/leaderboards/games/{gameId}/verdicts/preview`
Body: the shared `{ action, runIds }` (no reason needed for preview).

Response `200` — **bare** (`PreviewVerdictsResult`):
```ts
{
  affectedRunCount: number;
  affectedLeaderboards: Array<{ categoryId: number; subcategoryKey: string }>;
  sampleRuns: Array<{          // up to 50
    runId: number;
    runnerName: string;
    userId: number | null;
    categoryId: number;
    subcategoryKey: string;
    timeMs: number;            // from finished_runs.time (RT)
    currentStatus: string;
    newStatus: string;
  }>;
}
```

### B2. `POST /v1/leaderboards/games/{gameId}/verdicts`
Body:
```ts
{
  action: "verify" | "reject" | "unreject";
  runIds: number[];      // 1..500
  reason: string;        // required, >= 10
}
```

Response `200` — **bare** (`BulkVerdictResult`):
```ts
{
  affectedRunCount: number;
  affectedLeaderboards: Array<{ categoryId: number; subcategoryKey: string }>;
  enqueuedRebuilds: Array<{ gameId: number; categoryId: number }>;
}
```
> Only runs whose current status ≠ target are counted/updated (idempotent skip).
> Cross-game runIds are filtered out (scoped to path `gameId`).
Side effects: per-run `logs`; rebuild per affected category; `verdict_applied`
notification per affected registered runner with
`{ gameId, categoryId, runId, action }`.

---

## §C — Triage Queue & Reports
Handler: `src/api/leaderboards/mod-triage-handler.ts`
Path predicate: `/leaderboards/games/{gameId}/(queue|reports)`
Auth: `Bearer` + `checkGameMgmtPermission(callerId, "verify-reject-run", { gameId })`.
Wrapping: **BARE**.

### C1. `GET /v1/leaderboards/games/{gameId}/queue`
List the triage queue (materialized `run_flags` + compute-on-read derived items).

Query params:
```ts
{
  reason?: string;       // exact flag reason filter
  severity?: "low" | "medium" | "high";   // invalid values ignored
  categoryId?: number;
  limit?: number;        // default 100, capped at 500
  offset?: number;       // default 0
  includeResolved?: "true";  // string "true" to include resolved flags
}
```

Response `200` — **bare array** (`QueueItem[]`):
```ts
Array<{
  flagId: number | null;          // null => derived (compute-on-read) item
  reason: string;                 // 'below_minimum'|'pending_verification'|'reported'|'pb_jump'|'duplicate'|'missing_vod'|'impossible'|'fresh_account_top_n'|'pending_self_claim'|...
  severity: "low" | "medium" | "high";
  details: Record<string, unknown>;
  run: {
    runId: number;
    userId: number | null;
    runnerName: string;
    categoryId: number;
    categoryName: string;         // "" if category missing
    subcategoryKey: string;
    timeMs: number;               // finished_runs.time (RT)
    gameTimeMs: number | null;    // finished_runs.gameTime
    vodUrl: string | null;
    verificationStatus: string;
    endedAt: string;              // ISO 8601
  };
  suggestedAction: "reject" | "exclude" | "verify" | "set_minimum" | "none";
  createdAt: string;              // ISO 8601
}>
```
> Sorted by severity (high→low) then `createdAt` asc. Sliced to `limit`.

### C2. `GET /v1/leaderboards/games/{gameId}/reports`
List unresolved user reports for the game.

No query params used.

Response `200` — **bare array** (raw SQL projection — note camelCase aliases):
```ts
Array<{
  id: number;
  runId: number;
  reporterUserId: number;
  reason: string;
  createdAt: string;             // timestamp; serialized by PG driver (ISO-ish)
  resolvedAt: string | null;
  resolution: "upheld" | "dismissed" | null;
  reporterName: string;
  runnerName: string;            // fr."runnerName"
  runnerUserId: number | null;   // fr."userId"
  gameId: number;
  categoryId: number;
  subcategoryKey: string;
  timeMs: number;                // fr.time aliased as timeMs
}>
```
> Returns `rows.rows` (the handler unwraps the driver result's `.rows`), so the
> body is a plain array.

### C3. `POST /v1/leaderboards/games/{gameId}/queue/{flagId}/resolve`
Mark a flag resolved.

Request body:
```ts
{ reason: string }   // required, >= 10
```
Errors: `400` bad reason; `404 "flag not found"` if the flag id doesn't exist in
this game (note: an already-resolved flag returns success, not 404).

Response `200` — **bare**: `{ resolved: true }`.

---

## §D — Board Policies (CRUD)
Handler: `src/api/leaderboards/mod-policies-handler.ts`
Path predicate: `/leaderboards/games/{gameId}/policies…`
Auth: `Bearer` + `checkGameMgmtPermission(callerId, "verify-reject-run", { gameId })`.
Wrapping: **BARE**.

`policyType` enum (exact strings):
```ts
"min_time" | "max_time" | "require_video_top_n"
  | "auto_flag_pb_jump_pct" | "auto_flag_faster_than_wr_pct"
```

Policy row shape (returned by POST/PUT/GET — Drizzle `boardPolicies.$inferSelect`):
```ts
{
  id: number;
  gameId: number;
  categoryId: number | null;       // null => game-wide
  subcategoryKey: string | null;   // null => all subkeys
  policyType: string;              // one of the enum above
  value: Record<string, unknown>;  // jsonb, free-form per policy type
  createdBy: number;
  reason: string;
  createdAt: string;               // ISO 8601 (timestamp)
}
```

### D1. `GET /v1/leaderboards/games/{gameId}/policies`
Query: `{ categoryId?: number }`.
Response `200` — **bare array** of policy rows (ordered by policyType, id).

### D2. `POST /v1/leaderboards/games/{gameId}/policies`
Create or upsert (unique on `(gameId, COALESCE(categoryId,0), COALESCE(subcategoryKey,''), policyType)`).

Request body:
```ts
{
  policyType: PolicyType;          // required, must be in enum
  value: object;                   // required, non-null object
  categoryId?: number;             // optional; null/absent => game-wide
  subcategoryKey?: string;         // optional; null/absent => all subkeys
  reason: string;                  // required, >= 10
}
```
Errors: `400 "invalid policyType"`, `400 "value object required"`,
`400 "reason required (min 10 characters)"`.

Response `200` — **bare single policy row** (the upserted row).
Side effects: `logs`; rebuild enqueue if `categoryId !== null`.

### D3. `PUT /v1/leaderboards/games/{gameId}/policies/{id}`
Update `value` only (scope/type are taken from the existing row).

Request body:
```ts
{ value: object; reason: string }   // value required non-null; reason >= 10
```
Errors: `400 "value required"`, `400 "reason required (min 10 characters)"`,
`404 "not found"`, `403 "not in this game"`.

Response `200` — **bare single policy row**.

### D4. `DELETE /v1/leaderboards/games/{gameId}/policies/{id}`
Request body:
```ts
{ reason: string }   // required, >= 10
```
Errors: `400` bad reason; `404 "not found"`; `403 "not in this game"`.

Response `200` — **bare**: `{ deleted: true }`.

---

## mass-mgmt — Exclusion Mass Management
Handler: `src/api/leaderboards/mod-mass-handler.ts`
Path predicate (regex): `/leaderboards/games/{gameId}/(users/{id}/eligible-runs | categories/{id}/eligible-runs | exclude | include | exclusion-rules | mod-actions)`
Auth: `Bearer` + `checkGameMgmtPermission(callerId, "verify-reject-run", { gameId })`.
Wrapping: **BARE**.
Unmatched route in this handler → `501 {"error":"not implemented"}` (JSON).

### M1. `GET /v1/leaderboards/games/{gameId}/users/{userId}/eligible-runs`
All of a user's non-rejected, non-excluded, eligible runs in the game, with live
Redis rank.

Response `200` — **bare array** (`UserEligibleRunRow[]`):
```ts
Array<{
  runId: number;
  categoryId: number;
  categoryName: string;
  subcategoryKey: string;
  time: number | null;             // NOTE: `time`, not `timeMs`
  gameTime: number | null;
  primaryTiming: "realtime" | "gametime";
  verificationStatus: string;
  vodUrl: string | null;
  endedAt: string;                 // Date serialized to ISO
  isLeaderboardEntry: boolean;
  isLeaderboardEntryGt: boolean;
  rank: number | null;             // 1-based (Redis 0-based + 1)
  totalRunners: number | null;
}>
```

### M2. `GET /v1/leaderboards/games/{gameId}/categories/{categoryId}/eligible-runs`
Roster of a category (the "leaderboard roster" for mod review).

Query params:
```ts
{
  subcategoryKey?: string;
  verificationStatus?: "unverified" | "verified" | "rejected";  // others ignored
  hasVod?: "true" | "false";
  runnerName?: string;                  // normalized substring match
  endedAfter?: string;                  // Date-parseable
  endedBefore?: string;                 // Date-parseable
  limit?: number;                       // default 500, max 2000
  offset?: number;                      // default 0
}
```

Response `200` — **bare array** (`LeaderboardRosterRow[]`):
```ts
Array<{
  runId: number;
  userId: number | null;
  runnerName: string;
  subcategoryKey: string;
  time: number | null;             // NOTE: `time`, not `timeMs`
  gameTime: number | null;
  verificationStatus: string;
  vodUrl: string | null;
  endedAt: string;                 // ISO
  isLeaderboardEntry: boolean;
  isLeaderboardEntryGt: boolean;
}>
```

### M3. `POST /v1/leaderboards/games/{gameId}/exclude/preview`
Preview rank impact of excluding runs or a user-rule. **No reason required.**

Request body (one of `runIds` or `rule`):
```ts
{
  runIds?: number[];                          // all must be numbers
  rule?: {
    type: "user";                             // ONLY "user" supported
    targetId: number;                         // required if rule present
    categoryId?: number | null;               // null => whole game
  };
}
```
Errors: `400 "either runIds[] or rule{} is required"`,
`400 "only rule.type='user' is supported"`, `400 "rule.targetId: number required"`,
`400 "rule.categoryId must be number or null"`, `400 "runIds must be number[]"`.

Response `200` — **bare** (`PreviewExcludeResult`):
```ts
{
  affectedRunCount: number;
  affectedLeaderboards: Array<{
    categoryId: number;
    categoryName: string;
    subcategoryKey: string;
    affectedInThisLeaderboard: number;
    rankChanges: Array<{
      runnerName: string;
      userId: number | null;
      currentRank: number;          // 1-based
      newRank: number | null;       // null => removed from board
      time: number | null;          // NOTE: `time`, not `timeMs`
      gameTime: number | null;
    }>;
  }>;
  sampleRuns: Array<{               // up to 25
    runId: number;
    runnerName: string;
    categoryName: string;
    subcategoryKey: string;
    time: number | null;
  }>;
}
```

### M4. `POST /v1/leaderboards/games/{gameId}/exclude`
Exclude either specific runs (`runIds`) OR create a user-exclusion rule (`rule`).
`reason` required (>= 10) for both branches.

Request body:
```ts
// branch A — bulk exclude specific runs:
{ runIds: number[]; reason: string }
// branch B — create a user rule:
{ rule: { type: "user"; targetId: number; categoryId?: number | null }; reason: string }
```
Errors: `400` reason (`"reason is required (min 10 characters)"`),
`400 "runIds must be number[]"`, `400 "only rule.type='user' is supported"`,
`400 "rule.targetId: number required"`, `400 "rule.categoryId must be number or null"`,
`400 "either runIds[] or rule{} is required"`, plus `400` from
`ExclusionScopeError` (e.g. categoryId/game mismatch).

Response `200` — **bare**, shape depends on branch:
```ts
// branch A (bulkExcludeRuns):
{
  affectedRunCount: number;
  affectedLeaderboards: Array<{ categoryId: number; subcategoryKey: string }>;
}
// branch B (createModRule):
{ ruleId: number; alreadyExists: boolean }
```

### M5. `POST /v1/leaderboards/games/{gameId}/include`
Re-include (un-exclude) specific runs. Clears `ineligibleReason` only if it was
`mod_override`.

Request body:
```ts
{ runIds: number[]; reason: string }   // runIds all numbers; reason >= 10
```
Errors: `400` reason; `400 "runIds: number[] required"`.

Response `200` — **bare** (`BulkIncludeResult`):
```ts
{
  affectedRunCount: number;
  affectedLeaderboards: Array<{ categoryId: number; subcategoryKey: string }>;
}
```

### M6. `GET /v1/leaderboards/games/{gameId}/exclusion-rules`
List user-type exclusion rules scoped to the game.

Response `200` — **bare array** (`GameExclusionRuleRow[]`):
```ts
Array<{
  ruleId: number;
  type: "user";
  targetId: number;
  targetDisplayName: string;       // username, or `user#{id}` fallback
  categoryId: number | null;
  categoryName: string | null;
  reason: string | null;
  excludedBy: number;
  excludedByName: string;          // username, or `user#{id}` fallback
  createdAt: string;               // Date → ISO
}>
```

### M7. `DELETE /v1/leaderboards/games/{gameId}/exclusion-rules/{ruleId}`
Delete a rule and report what would be reinstated.

Request body:
```ts
{ reason: string }   // required, >= 10
```
Errors: `400` reason; `404` (`RuleNotFoundError` message); `403`
(`RuleNotInGameError` message — rule belongs to a different game / is null-game).

Response `200` — **bare** (`DeleteModRuleResult`):
```ts
{
  deleted: true;
  reinstatedRunCount: number;
  affectedLeaderboards: Array<{ categoryId: number; subcategoryKey: string }>;
}
```

### M8. `GET /v1/leaderboards/games/{gameId}/mod-actions`
Recent moderation log entries relevant to the game.

Query params:
```ts
{
  days?: number;    // default 90, clamped 1..365
  limit?: number;   // default 100, clamped 1..500
  offset?: number;  // default 0, min 0
}
```

Response `200` — **bare array** (`ModActionRow[]`):
```ts
Array<{
  logId: number;
  userId: number;
  actorName: string;               // username, or `user#{id}` fallback
  action: string;                  // 'exclude_run'|'include_run'|'exclude_via_rule'|'delete_exclusion_rule'
  entity: string;
  target: string | null;
  remark: string | null;
  data: unknown;                   // jsonb
  timestamp: string;               // Date → ISO
}>
```

---

## §E — Self-Service (`/v1/me/*`)
Handlers: `src/api/me/manual-time.ts`, `src/api/me/run-verdict.ts`
Dispatch: `src/api/me/handler.ts`
Auth: `Bearer`. Owner-only (operates on the caller's own user/runs).
Trust/ban gates: `isBanned` (→ `403 "banned"`), `evaluateTrust` (→ instant vs
provisional). NO `checkGameMgmtPermission` here.
Wrapping: **`{ result: ... }`** (these wrap).

### E1. `POST /v1/me/manual-times`
Self-assert a manual time. Server computes trust outcome:
- If the submitted time can't improve the runner's current best entry on the slice
  → `applied: "instant"`, `verificationStatus: "verified"`.
- Else trust-gated: `evaluateTrust` `"instant"` → verified; else
  `applied: "provisional"`, `verificationStatus: "pending"` and a
  `pending_self_claim` flag is emitted into the triage queue.

Request body (server reads these exact keys):
```ts
{
  gameId: number;        // required (number)
  categoryId: number;    // required (number)
  timing: "realtime" | "gametime";  // required
  timeMs: number;        // required, > 0
  subcategoryKey?: string;           // defaults ""
  evidenceUrl?: string | null;
  reason?: string;       // optional; defaults "self-asserted time"
}
```
> NOTE: there is **no `runnerRef`** here — the runner is always the authenticated
> caller (userId resolved server-side; `guestName` is always null).
Errors: `403 "Not authenticated"` / `"user not found"` / `"banned"`;
`400 "gameId, categoryId required"`, `400 "invalid timing"`,
`400 "timeMs must be positive"`, `400 "invalid JSON"`.

Response `200` — **wrapped**:
```ts
{ result: { applied: "instant" | "provisional"; manualTimeId: number } }
```

### E2. `DELETE /v1/me/manual-times/{id}`
Delete your own manual time. **No reason required** (unlike the mod DELETE).
Errors: `403` auth/ban; `404 "not found"`; `403 "not your manual time"` (ownership).

Response `200` — **wrapped**: `{ result: { deleted: true } }`.

### E3. `POST /v1/me/runs/{runId}/verdict`
Self-reject or self-unreject one of your own finished runs.

Request body:
```ts
{
  action: "reject" | "unreject";   // required (NO "verify")
  reason?: string;                 // optional; defaults "self-reject"/"self-unreject"
}
```
Behavior:
- `reject`: always `applied: "instant"`. If already rejected → `{ applied:"instant", noop:true }`.
- `unreject`: if not currently rejected → `{ applied:"instant", noop:true }`. Else
  trust-gated: status becomes `verified` (instant) or `pending` (provisional).
Errors: `400 "invalid runId"`, `400 "action must be reject or unreject"`,
`400 "invalid JSON"`; `403` auth/`"user not found"`/`"banned"`;
`404 "run not found"`; `403 "not your run"`.

Response `200` — **wrapped**, one of:
```ts
{ result: { applied: "instant" } }
{ result: { applied: "instant", noop: true } }
{ result: { applied: "provisional" } }       // unreject, provisional tier
```

---

## §F — Reports
Handler: `src/api/reports/handler.ts`
Auth: `Bearer` (any authenticated user). NO mod permission.
Wrapping: **`{ result: ... }`** (wraps), except the rate-limit error (JSON).

### F1. `POST /v1/reports`
Report a run. Idempotent per (run, reporter). Daily limit 20 reports/reporter.

Request body:
```ts
{
  runId: number;     // required (number)
  reason: string;    // required, >= 10 (after trim)
}
```
Errors: `403 "Not authenticated"` / `"user not found"`; `400 "runId required"`,
`400 "reason required (min 10 characters)"`, `400 "invalid JSON"`;
`404 "run not found"`; `429 {"error":"rate limit exceeded"}` (JSON body).

Response `200` — **wrapped**:
```ts
{ result: { reported: boolean } }   // false if a duplicate report already existed
```
Side effects: inserts `run_reports`; emits a `reported` `run_flags` row (severity
high) if none open; writes `logs`.

> NOTE: there is **no separate mod "list reports" route under `/v1/reports`**. The
> mod-facing report list is §C2 `GET /v1/leaderboards/games/{gameId}/reports`.

---

## §G — Appeals, History, Notifications
Handlers: `src/api/runs/v1-handler.ts` (history + appeal),
`src/api/me/notifications.ts` (notifications).

### G1. `GET /v1/runs/{runId}/history`  (PUBLIC, no auth)
Audit timeline for a run, assembled from the `logs` table.
Wrapping: **`{ result: ... }`**.

Response `200` — **wrapped** (`HistoryEvent[]`):
```ts
{
  result: Array<{
    type: "verdict" | "manual_time" | "exclusion" | "report" | "appeal" | "other";
    action: string;                       // raw log action string
    byRole: "mod" | "self" | "system";
    reason: string | null;                // log.remark
    at: string;                           // ISO 8601
    detail?: Record<string, unknown>;     // log.data
  }>
}
```
> `runId` must be digits (route regex `\/v1\/runs\/(\d+)\/history`). Max 200 rows,
> ordered ascending by timestamp.

### G2. `POST /v1/runs/{runId}/appeal`  (authed, owner-only)
Open an appeal on your own (presumably rejected) run.
Wrapping: **`{ result: ... }`**.

Request body:
```ts
{ reason: string }   // required, trim length >= 10
```
Errors: `403 "Not authenticated"` / `"user not found"`;
`400 "invalid JSON"`, `400 "reason required (min 10 characters)"`;
`404 "run not found"`; `403 "not your run"`; `400 "an appeal is already open"`
(dedupe — an unresolved `appeal` flag already exists).

Response `200` — **wrapped**: `{ result: { appealed: true } }`.
Side effects: inserts an `appeal` `run_flags` row (severity high) + `logs`.

### G3. `GET /v1/me/notifications`  (authed)
Handler: `src/api/me/notifications.ts`. Wrapping: **`{ result: ... }`**.

Query params:
```ts
{
  unreadOnly?: "true";   // string "true" => only unread
  limit?: number;        // default 50, capped 200
  offset?: number;       // default 0
}
```

Response `200` — **wrapped** (`NotificationRow[]`, Drizzle `notifications.$inferSelect`):
```ts
{
  result: Array<{
    id: number;
    userId: number;
    type: string;            // e.g. 'manual_time_created' | 'manual_time_verdict' | 'manual_time_deleted' | 'verdict_applied'
    payload: Record<string, unknown>;   // jsonb (per-type shape)
    readAt: string | null;   // ISO or null
    createdAt: string;       // ISO 8601
  }>
}
```
> Ordered by `createdAt` desc.

Known `payload` shapes by `type` (from the emit call sites):
```ts
"manual_time_created":  { gameId, categoryId, timeMs, manualTimeId, byMod: true }
"manual_time_verdict":  { gameId, categoryId, manualTimeId, verdict: "verified"|"rejected" }
"manual_time_deleted":  { gameId, categoryId, timeMs }
"verdict_applied":      { gameId, categoryId, runId, action: "verify"|"reject"|"unreject" }
```

### G4. `POST /v1/me/notifications/{id}/read`  (authed)
Mark one notification read (only if owned & currently unread).
Errors: `403` auth; `404 "notification not found"` (not owned or already read/missing).
Response `200` — **wrapped**: `{ result: { read: true } }`.

### G5. `POST /v1/me/notifications/read-all`  (authed)
Mark all unread notifications read.
Response `200` — **wrapped**: `{ result: { read: number } }`  (count marked).

---

## LeaderboardEntry shape (public leaderboard read)
From `src/leaderboards/get-leaderboard.ts`. This is the per-row item returned by
the public leaderboard read endpoint (`GET /v1/leaderboards/{game}/{category}` —
slug-based, **outside** this mod feature). Included because the feature adds the
new `source` / `manualTimeId` fields a manual-time-aware UI must handle.

```ts
interface LeaderboardEntry {
  rank: number;
  runId: number | null;            // null when source === "manual"
  runnerName: string;
  userId: number | null;
  time: number;                    // the active-timing time (NOT named timeMs here)
  realTime: number | null;
  gameTime: number | null;
  verificationStatus: string;
  vodUrl: string | null;
  runDate: Date;                   // serialized to ISO string in JSON
  isGuest: boolean;
  source: "run" | "manual";        // NEW — manual time vs real run
  manualTimeId: number | null;     // NEW — set iff source === "manual"
}
```

The full read response (BARE, no `{ result }`, augmented in handler.ts):
```ts
{
  items: LeaderboardEntry[];
  totalItems: number;
  page: number;
  pageSize: number;                // capped at 100; default 25
  totalPages: number;
  timing: "rt" | "gt";             // resolved timing — note "rt"/"gt", NOT realtime/gametime
  defaultTiming: "rt" | "gt";
  forceRealTime: boolean;
  hideRealTime: boolean;
  hideGameTime: boolean;
}
```
> Note the timing-vocab clash: this read endpoint uses `"rt"`/`"gt"`; the
> manual-times / verdicts / preview endpoints use `"realtime"`/`"gametime"`.

---

## Appendix: quick endpoint index

| # | Method | Path | Auth | Wrap |
|---|---|---|---|---|
| A1 | GET | `/v1/leaderboards/games/{gameId}/manual-times` | mod | bare array |
| A2 | POST | `/v1/leaderboards/games/{gameId}/manual-times/preview` | mod | bare |
| A3 | POST | `/v1/leaderboards/games/{gameId}/manual-times` | mod | bare |
| A4 | POST | `/v1/leaderboards/games/{gameId}/manual-times/{id}/verdict` | mod | bare |
| A5 | PUT | `/v1/leaderboards/games/{gameId}/manual-times/{id}` | mod | bare |
| A6 | DELETE | `/v1/leaderboards/games/{gameId}/manual-times/{id}` | mod | bare |
| B1 | POST | `/v1/leaderboards/games/{gameId}/verdicts/preview` | mod | bare |
| B2 | POST | `/v1/leaderboards/games/{gameId}/verdicts` | mod | bare |
| C1 | GET | `/v1/leaderboards/games/{gameId}/queue` | mod | bare array |
| C2 | GET | `/v1/leaderboards/games/{gameId}/reports` | mod | bare array |
| C3 | POST | `/v1/leaderboards/games/{gameId}/queue/{flagId}/resolve` | mod | bare |
| D1 | GET | `/v1/leaderboards/games/{gameId}/policies` | mod | bare array |
| D2 | POST | `/v1/leaderboards/games/{gameId}/policies` | mod | bare row |
| D3 | PUT | `/v1/leaderboards/games/{gameId}/policies/{id}` | mod | bare row |
| D4 | DELETE | `/v1/leaderboards/games/{gameId}/policies/{id}` | mod | bare |
| M1 | GET | `/v1/leaderboards/games/{gameId}/users/{userId}/eligible-runs` | mod | bare array |
| M2 | GET | `/v1/leaderboards/games/{gameId}/categories/{categoryId}/eligible-runs` | mod | bare array |
| M3 | POST | `/v1/leaderboards/games/{gameId}/exclude/preview` | mod | bare |
| M4 | POST | `/v1/leaderboards/games/{gameId}/exclude` | mod | bare |
| M5 | POST | `/v1/leaderboards/games/{gameId}/include` | mod | bare |
| M6 | GET | `/v1/leaderboards/games/{gameId}/exclusion-rules` | mod | bare array |
| M7 | DELETE | `/v1/leaderboards/games/{gameId}/exclusion-rules/{ruleId}` | mod | bare |
| M8 | GET | `/v1/leaderboards/games/{gameId}/mod-actions` | mod | bare array |
| E1 | POST | `/v1/me/manual-times` | owner | `{result}` |
| E2 | DELETE | `/v1/me/manual-times/{id}` | owner | `{result}` |
| E3 | POST | `/v1/me/runs/{runId}/verdict` | owner | `{result}` |
| F1 | POST | `/v1/reports` | authed | `{result}` |
| G1 | GET | `/v1/runs/{runId}/history` | public | `{result}` |
| G2 | POST | `/v1/runs/{runId}/appeal` | owner | `{result}` |
| G3 | GET | `/v1/me/notifications` | authed | `{result}` |
| G4 | POST | `/v1/me/notifications/{id}/read` | authed | `{result}` |
| G5 | POST | `/v1/me/notifications/read-all` | authed | `{result}` |
