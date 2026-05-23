# Moderation Vision — Backend API Contract

**Date:** 2026-05-23
**Status:** Backend build spec. Hand to backend for implementation.
**Context:** vision `2026-05-23-moderation-leaderboard-editing-vision.md`; gap analysis `2026-05-23-moderation-backend-requirements.md`.
**Builds on these backend specs:** `2026-05-23-mod-leaderboard-mass-management-design.md` (shipped exclusion tooling), `2026-05-22-leaderboard-rebuild-unification-design.md` (the rebuild pipeline everything hooks into), `2026-04-22-leaderboard-minimum-time-design.md`.

This is the exact, buildable contract for everything the backend still needs to add to reach the full moderation vision. Every endpoint is **new** unless it says "extend." It is written to match the conventions of the shipped mass-management endpoints and to hook into the existing rebuild pipeline rather than around it.

---

## 0. Conventions (apply to every endpoint)

**Two families, two response styles:**

| Family | Prefix | Gate | Response | Errors |
|---|---|---|---|---|
| Per-game mod | `/leaderboards/games/{gameId}/...` | `checkGameMgmtPermission(callerId, "verify-reject-run", { gameId })` | **bare** JSON object/array | **plain text** body |
| Public / self / global | `/v1/...` | per-endpoint (ownership, board-admin, public) | `{ result: ... }` | `{ error: "..." }` |

- **Auth:** `Authorization: Bearer {sessionId}`. Resolve the session's Twitch username → numeric `users.id` server-side; the client never sends an id for itself. Every mutation re-checks `game_id` in its WHERE/values (defense in depth), exactly as mass-management does.
- **Reason:** every mod write requires `reason: string`, **trimmed length ≥ 10**; else `400 "reason is required (min 10 characters)"`. Self-service writes (`/v1/me/*`) take `reason` optional.
- **Preview pairing:** every bulk-mutating endpoint has a read-only `/preview` sibling with the same body minus `reason`, returning the blast radius (affected leaderboards + per-runner rank deltas + sample rows), like `exclude/preview`.
- **Audit:** every mutation writes one or more `logs` rows (`userId=callerId`, `action`, `entity`, `target`, `remark=reason`, `data`). Extend the per-game `mod-actions` feed's action enum with the new actions.
- **Rebuild, don't hand-roll caches.** Any write that changes a board enqueues a **scoped rebuild** via `enqueueLeaderboardRebuild(gameId, categoryId | null)` on the leaderboard-rebuild SQS queue — exactly as exclude/include and the minimum endpoints already do. The unified pipeline re-derives `leaderboard_eligible` + entry flags and calls `invalidateGameLeaderboards`. **Do not add a separate Redis-update path or a new trigger** — that is the anti-pattern `2026-05-22-leaderboard-rebuild-unification-design.md` exists to eliminate. The daily rebuild cron is the drift safety net.
- **The board is materialized, derived from inputs.** Best-per-user is the `isLeaderboardEntry` / `isLeaderboardEntryGt` flags on `finished_runs`; rank/total come from the Redis cache. Logically the entry is `min` over candidates = `{ eligible finished_runs } ∪ { manual_times }`. Verdicts/exclusions/policies **remove** run candidates; a manual time (§A) **adds** one. No per-request computation.
- **Canonical eligibility predicate** (matches `backfill-leaderboard-entries.ts`, `leaderboard-invariant-probe.ts`): `leaderboard_eligible = true AND excluded = false AND verification_status <> 'rejected'` — plus active board policies (§D).
- **Slice** = `(gameId, categoryId, subcategoryKey, timing)`; `subcategoryKey` is `""` for the no-variables board; `timing ∈ {'realtime','gametime'}`.
- **Status vocabulary:** the shipped endpoints emit `unverified | verified | rejected`. Standardize on **`pending | verified | rejected`** going forward; treat `unverified ≡ pending` (see §H).

**Permission summary**

| Action | Who |
|---|---|
| Manual times (mod), bulk verdicts, queue, policies, reports view | per-game mod (`verify-reject-run` on the game) |
| Self verdict / self manual time on **own** runs | the owning user, subject to the trust gate (§E) |
| Global queue, cross-game/global exclusion | board-admin / admin |

---

## A. Manual times ★

Lets a mod (or a runner via §E) assert a leaderboard time that need not correspond to any `finished_run` ("their real time is 35:48"). A manual time is just one more candidate in the per-runner `min`; it can only *lower* a runner's entry. There are **no** modes (`ceiling`/`pinned`), no `effectiveFrom`, no supersession state — see the gap-analysis §1 for why.

### A.0 Data model — new table

```sql
CREATE TABLE manual_times (
  id              bigserial PRIMARY KEY,
  user_id         bigint NULL REFERENCES users(id),   -- NULL => guest
  guest_name      text   NULL,                         -- set iff user_id IS NULL
  game_id         bigint NOT NULL,
  category_id     bigint NOT NULL,
  subcategory_key text   NOT NULL DEFAULT '',
  timing          text   NOT NULL,                     -- 'realtime' | 'gametime'
  time_ms         bigint NOT NULL,
  evidence_url    text   NULL,
  verification_status text NOT NULL DEFAULT 'pending', -- pending|verified|rejected (self-claims)
  source          text   NOT NULL,                     -- 'mod' | 'self' | 'system'
  created_by      bigint NOT NULL REFERENCES users(id),
  reason          text   NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
-- one manual time per runner per slice; POST upserts on conflict:
CREATE UNIQUE INDEX ON manual_times
  (user_id, guest_name, game_id, category_id, subcategory_key, timing);
```

### A.1 Board integration (the load-bearing change — hook into the rebuild pipeline)

The board is **materialized**, not computed per read: best-per-user lives in the `isLeaderboardEntry` / `isLeaderboardEntryGt` flags on `finished_runs`; rank/total come from Redis. The unified rebuild pipeline owns both. Manual times slot into that pipeline — they are **not** a new read path and **not** a new trigger. Two changes:

1. **`rebuildComboFlags(combo)` must treat `manual_times` as candidates.** When picking a runner's best entry for `(runner, categoryId, subcategoryKey, timing)`, the candidate set is the runner's eligible runs **plus** their manual time (if `verification_status <> 'rejected'`, and — for `source='self'` — it passes policies). If the manual time is smallest, that runner's board entry is the manual time and **none of their finished_runs carries the entry flag** for that timing.

2. **The Redis board builder must source a runner's row from `manual_times`** when their best is a manual time (it has no `finished_run`, so it can't carry a flag). `rank`/`totalRunners` count it. Add `source: 'run' | 'manual'` and `manualTimeId?: number` to the public `LeaderboardEntry` so the UI can mark "set time."

**Triggers (reuse, don't add):** a manual-time create/update/delete calls `enqueueLeaderboardRebuild(gameId, categoryId)` — and, if you want the single affected combo to reflect immediately, also calls the extracted `rebuildComboFlags` synchronously for that one combo before returning. Same shape as exclude/include. No bespoke cache writes.

**Performance.** Public reads are unchanged: Redis for rank/total, entry flags for membership, no per-request merge, no Postgres. A manual time touches exactly one combo and is handled by the same async rebuild that already processes minimums and exclusions; the only read-time union is the `eligible-runs` mod roster (Postgres, low QPS). This is why "the board is a derivation" costs nothing at read time.

### A.2 Endpoints

**`GET /leaderboards/games/{gameId}/manual-times`** — list. Query: `categoryId?`, `subcategoryKey?`, `userId?`, `runnerName?`.
```ts
type Response = Array<{
  id: number; userId: number | null; guestName: string | null; runnerName: string;
  categoryId: number; categoryName: string; subcategoryKey: string; subcategoryLabel: string | null;
  timing: 'realtime' | 'gametime'; timeMs: number;
  evidenceUrl: string | null; verificationStatus: 'pending'|'verified'|'rejected';
  source: 'mod'|'self'|'system'; createdBy: number; createdByName: string;
  reason: string; createdAt: string;
}>;
```

**`POST /leaderboards/games/{gameId}/manual-times/preview`** — read-only blast radius.
```ts
type Body = {
  runnerRef: { userId: number } | { guestName: string };
  categoryId: number; subcategoryKey: string;
  timing: 'realtime' | 'gametime'; timeMs: number;
};
type Response = {
  resultingEntry: { rank: number | null; timeMs: number };   // where this runner lands after adding it
  beatsExistingEntry: boolean;                                // does it become their board time?
  affectedLeaderboards: Array<{
    categoryId: number; subcategoryKey: string;
    rankChanges: Array<{ runnerName: string; userId: number | null;
                         currentRank: number; newRank: number | null; timeMs: number | null }>;
  }>;
};
```

**`POST /leaderboards/games/{gameId}/manual-times`** — create/upsert. Body = preview body **plus** `evidenceUrl?`, `reason` (≥10). `source='mod'`, `verification_status='verified'`. Upserts on the unique key.
```ts
type Response = { id: number; affectedLeaderboards: Array<{ categoryId: number; subcategoryKey: string }> };
```
`400` if `categoryId` not in game, `timing` invalid, `timeMs<=0`, or `guestName` empty. **Enqueue rebuild** `(gameId, categoryId)`; audit `create_manual_time`.

**`PUT /leaderboards/games/{gameId}/manual-times/{id}`** — body `{ timeMs?, evidenceUrl?, reason }` (`reason` required). Enqueue rebuild + audit `update_manual_time`.

**`DELETE /leaderboards/games/{gameId}/manual-times/{id}`** — body `{ reason }`. Removes the candidate; enqueue rebuild (board recomputes to runs).
```ts
type Response = { deleted: true; affectedLeaderboards: Array<{ categoryId: number; subcategoryKey: string }> };
```

**`POST /leaderboards/games/{gameId}/manual-times/{id}/verdict`** — mod confirms/denies a provisional self-claim. Body `{ action: 'verify' | 'reject', reason }`. `verify` → `verification_status='verified'`. `reject` → `verification_status='rejected'` (dropped from candidates). Enqueue rebuild; audit; notify owner (§G).

### A.3 Edge cases

- **Below a minimum:** a `source='mod'` manual time bypasses policies (explicit authority, audited); a `source='self'` one must pass them (enforced in §E).
- **Per-timing:** one manual time per `timing`; an RT manual time leaves GT derived from runs.
- **Guests:** keyed by `guest_name`; `move-user` must re-target onto the merged `user_id` (§H.2).
- **Provisional self-claim:** `verification_status='pending'` still counts as a candidate (shows "unverified"); a mod `reject` drops it.

---

## B. Bulk verify/reject verdicts

Set form of the existing single-run `POST /leaderboards/{verify,reject}/{runId}` (and `PUT /leaderboards/runs/{runId}`). Exclude already does bulk *removal*; this adds bulk *verify* and promotion-aware bulk *reject/unreject*.

**`POST /leaderboards/games/{gameId}/verdicts/preview`**
**`POST /leaderboards/games/{gameId}/verdicts`**
```ts
type Body = { action: 'verify' | 'reject' | 'unreject'; runIds: number[]; reason: string };
type Response = {
  affectedRunCount: number;
  affectedLeaderboards: Array<{ categoryId: number; subcategoryKey: string }>;
  promotions: Array<{ userId: number | null; runnerName: string;
                      categoryId: number; subcategoryKey: string;
                      newTopRunId: number | null }>;
};
```
Behavior: set `verification_status` per run (cross-game guard `AND game_id=$gameId`), one `logs` row per run, then **enqueue a rebuild per affected (gameId, categoryId)** — the pipeline re-derives entry flags and promotions, so you don't hand-compute next-best. `unreject` → `pending`.

**Document for the frontend — exclude vs reject** (no code change, just the contract): **reject** = "verification failed for *this run*" (per-run); **exclude** = "remove from board, optionally a rule that catches future uploads" (cascade, runner-shaped). Both fail the eligibility predicate. Tell us which removal each UI action should call.

---

## C. Triage queue + ingest auto-flags

**Extend the existing `mod-queue`** (mass-management explicitly left it untouched; `idx_mod_queue` already exists). The vision turns it from a raw eligibility filter into a prioritized, reason-tagged feed.

### C.0 Data model

```sql
CREATE TABLE run_flags (
  id          bigserial PRIMARY KEY,
  run_id      bigint NOT NULL,
  game_id     bigint NOT NULL,
  category_id bigint NOT NULL,
  reason      text   NOT NULL,
  severity    text   NOT NULL,   -- 'low' | 'medium' | 'high'
  details     jsonb  NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  resolved_by bigint NULL
);
```

### C.1 Flag producers — compute in the rebuild worker's per-row pass (it already visits every row) and/or at ingest

| `reason` | Trigger |
|---|---|
| `below_minimum` | already computed (`ineligible_reason='below_minimum'`) — surface as a flag |
| `impossible` | `time_ms <= 0`, or faster than the category WR by > `impossibleWrPct` |
| `pb_jump` | improvement over runner's prior best on the slice > `pbJumpPct` |
| `missing_vod` | top-N where `require_video_top_n` set, `vodUrl IS NULL` |
| `duplicate` | identical `time_ms` to another run on the slice |
| `fresh_account_top_n` | account age < `freshAccountDays` and lands in top-N |
| `reported` | a user report (§F) |
| `pending_self_claim` | a pending self-claimed manual time / self-unreject (§E) |

Thresholds come from board policies (§D). A run leaving the board (verdict/exclude/manual-time) sets `resolved_at` on its open flags — do this inside the rebuild worker so it can't drift.

### C.2 Endpoints

**`GET /leaderboards/games/{gameId}/queue`** (or extend `mod-queue`) — per-game triage feed. Query: `reason?`, `severity?`, `categoryId?`, `limit?=100`, `offset?=0`, `includeResolved?=false`.
```ts
type Response = Array<{
  flagId: number; reason: string; severity: 'low'|'medium'|'high'; details: Record<string,unknown>;
  run: { runId: number; userId: number | null; runnerName: string;
         categoryId: number; categoryName: string; subcategoryKey: string;
         timeMs: number | null; gameTimeMs: number | null; vodUrl: string | null;
         verificationStatus: string; endedAt: string; rank: number | null };
  runnerContext: { totalRunsInGame: number; priorBestMs: number | null; accountAgeDays: number | null };
  suggestedAction: 'reject' | 'exclude' | 'verify' | 'set_minimum' | 'none';
  createdAt: string;
}>;
```

**`POST /leaderboards/games/{gameId}/queue/{flagId}/resolve`** — manual dismiss without a verdict. Body `{ reason }`. Sets `resolved_at`. Audit.

**`GET /leaderboards/queue`** — global cross-game feed. Gate: board-admin/admin. Same item shape plus `gameId`/`gameName`.

---

## D. Board policies (generalize minimums)

`leaderboard_minimum_times` already proves the "standing rule re-evaluated by the rebuild pipeline" model (`upsertMinimumTime` enqueues a rebuild). Generalize it.

### D.0 Data model

```sql
CREATE TABLE board_policies (
  id bigserial PRIMARY KEY,
  game_id bigint NOT NULL,
  category_id bigint NULL,           -- NULL => game-wide
  subcategory_key text NULL,         -- NULL => all subcategories
  policy_type text NOT NULL,
  value jsonb NOT NULL,
  created_by bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

| `policy_type` | `value` | Effect (applied in the rebuild worker's per-row pass) |
|---|---|---|
| `min_time` | `{ rtMs?, gtMs? }` | runs below → `ineligible_reason='below_minimum'` (today's minimums) |
| `max_time` | `{ rtMs?, gtMs? }` | runs above → ineligible |
| `require_video_top_n` | `{ n }` | top-N without `vodUrl` → flag `missing_vod` |
| `auto_flag_pb_jump_pct` | `{ pct }` | drives `pb_jump` flag |
| `auto_flag_faster_than_wr_pct` | `{ pct }` | drives `impossible` flag |

### D.1 Endpoints

- `GET /leaderboards/games/{gameId}/policies?categoryId=`
- `POST /leaderboards/games/{gameId}/policies` — `{ categoryId?, subcategoryKey?, policyType, value, reason }`
- `PUT /leaderboards/games/{gameId}/policies/{id}` — `{ value, reason }`
- `DELETE /leaderboards/games/{gameId}/policies/{id}` — `{ reason }`

Each write **enqueues a rebuild** for its scope. Keep `GET/PUT/DELETE /leaderboards/games/{gameId}/categories/{categoryId}/minimums` as an **alias** for the `min_time` policy.

---

## E. Self-service (trust-tiered)

Runners act on **their own** runs/manual times. Gate is ownership + a server-side **trust tier**, NOT `verify-reject-run`. Family `/v1/...` → `{ result }`.

**`POST /v1/me/runs/{runId}/verdict`** — `{ action: 'reject' | 'unreject', reason? }`.
**`POST /v1/me/manual-times`** — `{ gameId, categoryId, subcategoryKey, timing, timeMs, evidenceUrl?, reason? }`.
**`DELETE /v1/me/manual-times/{id}`**.

Server-side decision (never trust the client):

```
owner check: the run/manual-time's runner must equal caller users.id, else 403.
banned check: if caller is banned -> 403.

INSTANT (apply immediately, source='self', verification_status='verified'):
  - reject / hide your own run
  - delete your own manual time
  - a manual time that CAN'T improve your rank (not faster than your current board time)

PROVISIONAL (apply but mark, then queue for mod confirm):
  - a manual time that WOULD become your new (faster) board entry, OR unrejecting your own run
  -> verification_status='pending', emit run_flags 'pending_self_claim'
  -> shows on the board flagged "self-reported · unverified" (still a candidate in the min)
  -> require evidenceUrl when the category has require_video and the claim enters top-N (else 400)
  -> self manual times must pass board policies (e.g. minimum) — reject sub-floor claims with 400
  -> a mod resolves via /manual-times/{id}/verdict (§A) or /verdicts (§B)
```

Every write that changes a board **enqueues a rebuild** (same pipeline). Response:
```ts
type Response = { result: { applied: 'instant' | 'provisional'; manualTimeId?: number } };
```

**Trust signal** (config): default = "has ≥1 prior `verified` run OR account age > N days OR patreon tier ≥ 1" → faster claims auto-verify; otherwise provisional. New accounts always provisional.

---

## F. Community reporting

```sql
CREATE TABLE run_reports (
  id bigserial PRIMARY KEY,
  run_id bigint NOT NULL,
  reporter_user_id bigint NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  resolution text NULL              -- 'upheld' | 'dismissed'
);
CREATE UNIQUE INDEX ON run_reports (run_id, reporter_user_id);  -- dedupe
```

**`POST /v1/reports`** — public (authed). `{ runId, reason }`. Rate-limit per reporter (≤ ~20/day). Dedupe per `(run_id, reporter)`. Emits a `reported` flag (§C); weight by reporter trust — low-trust reports aggregate (flag once count ≥ threshold). `{ result: { reported: true } }`.

**`GET /leaderboards/games/{gameId}/reports`** — mod view. Query `resolved?=false`. Joined to run + reporter name. Resolving the run closes its reports (`upheld` on exclude/reject, `dismissed` on verify).

---

## G. Appeals, notifications, run history

**`POST /v1/runs/{runId}/appeal`** — runner disputes a verdict on their run. `{ reason }`. Creates an appeal (reuse `run_flags` with `reason='appeal'`, or a small `run_appeals` table) routed to the per-game queue. `403` if not the owner.

**`GET /v1/runs/{runId}/history`** — public-safe timeline.
```ts
type Response = { result: Array<{
  type: 'verdict' | 'manual_time' | 'exclusion' | 'report' | 'appeal';
  action: string; byRole: 'mod' | 'self' | 'system'; reason: string | null; at: string;
  detail?: Record<string, unknown>;
}> };
```
Redact mod identities for the public; show the runner-facing reason. Sourced from `logs`.

**Notifications** — emit on every verdict/manual-time/claim/exclusion that affects a runner.
```sql
CREATE TABLE notifications (
  id bigserial PRIMARY KEY, user_id bigint NOT NULL,
  type text NOT NULL, payload jsonb NOT NULL,
  read_at timestamptz NULL, created_at timestamptz NOT NULL DEFAULT now()
);
```
- `GET /v1/me/notifications?unreadOnly=` → `{ result: Notification[] }`.
- `POST /v1/me/notifications/{id}/read` → `{ result: { read: true } }`.

---

## H. Cross-cutting (must-do, small)

1. **Status vocab:** converge on `pending | verified | rejected` (mass-management's `unverified` → `pending`), or document `unverified ≡ pending` as a permanent contract.
2. **Overrides survive identity/board moves — verify and extend:** when `move-user` merges a runner or a reassignment moves runs, ensure `manual_times`, `run_flags`, run verdicts, and `exclusion_rules` follow the move (re-target ids) and the rebuild pipeline recomputes. A merge that silently drops a manual time corrupts a board — **fix before manual times ship.**
3. **Rebuild integration, not ad-hoc cache writes:** every new mutation enqueues a scoped `enqueueLeaderboardRebuild` and lets the unified pipeline re-derive flags + invalidate caches — same path as exclude/include/minimums. Don't add per-endpoint Redis writes or new triggers (the unification spec exists to prevent exactly that). Where a single combo must reflect instantly, call the extracted `rebuildComboFlags` synchronously for that one combo, then enqueue for safety.
4. **Preview rank deltas** use RT ordering today (known mass-management follow-up). Manual times make GT-primary boards common — make `manual-times/preview` and `verdicts/preview` rank correctly for the slice's `timing`.

---

## Build order

1. **A. Manual times** — table + `rebuildComboFlags`/Redis-builder integration + endpoints. Headline; nothing else delivers the "set their time to 35:48" case. Do **H.2** (override-carry) alongside.
2. **B. Bulk verdicts** — small once single verify/reject exists.
3. **C + D. Queue + flags + policies** — extend `mod-queue`, add producers in the rebuild worker, generalize minimums.
4. **E. Self-service + trust.**
5. **F + G. Reporting + appeals + notifications + history.**
