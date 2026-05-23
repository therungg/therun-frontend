# Moderation Vision — Backend API Contract

**Date:** 2026-05-23
**Status:** Backend build spec. Hand to backend for implementation.
**Context:** vision `2026-05-23-moderation-leaderboard-editing-vision.md`; gap analysis `2026-05-23-moderation-backend-requirements.md`; shipped building block `frontend-guide-leaderboard-mod-mass-management.md`.

This is the exact, buildable contract for everything the backend still needs to add. Every endpoint below is **new** unless it says "extend." It is written to match the conventions already established by the shipped mass-management endpoints.

---

## 0. Conventions (apply to every endpoint)

**Two families, two response styles:**

| Family | Prefix | Gate | Response | Errors |
|---|---|---|---|---|
| Per-game mod | `/leaderboards/games/{gameId}/...` | `verify-reject-run` on `{gameId}` | **bare** JSON object/array | **plain text** body (don't JSON-wrap) |
| Public / self / global | `/v1/...` | per-endpoint (ownership, board-admin, public) | `{ result: ... }` | `{ error: "..." }` |

- **Auth:** `Authorization: Bearer {sessionId}` on everything except endpoints explicitly marked public. Resolve the session's Twitch username → numeric `users.id` server-side for permission checks and audit; the client never sends an id for itself.
- **Reason:** every mod write requires `reason: string`, **trimmed length ≥ 10**; else `400 "reason is required (min 10 characters)"`. Self-service writes (`/v1/me/*`) take `reason` optional.
- **Preview pairing:** every bulk-mutating endpoint has a read-only `/preview` sibling with the same body minus `reason`, returning the blast radius. Call it before committing.
- **Audit:** every mutation writes one or more `logs` rows (`action`, `entity`, `target`, `remark=reason`, `data`). The per-game `mod-actions` feed must surface the new actions (extend its action enum).
- **Cache:** any write that changes a board MUST flush the Redis leaderboard cache for the affected `(gameId[, categoryId])` synchronously — manual times and verdicts must be visible immediately, not at TTL. (Mass-management exclude/include rely on the caller flushing; for the new endpoints, flush server-side.)
- **The board is a derivation.** A runner's entry on a slice is `min` over candidates = `{ eligible finished_runs } ∪ { manual_times }`, where
  `eligible(run) = leaderboard_eligible = true AND excluded = false AND verification_status <> 'rejected' AND passes all active board policies`.
  Verdicts/exclusions/policies **remove** run candidates; a manual time (§A) **adds** one. There is no stored standings state.
- **Slice** = `(gameId, categoryId, subcategoryKey, timing)`, where `subcategoryKey` is `""` for the no-variables board and `timing ∈ {'realtime','gametime'}`.
- **Status vocabulary:** standardize on `pending | verified | rejected`. Mass-management currently emits `unverified`; treat `unverified ≡ pending` and converge (see §H).

**Permission summary**

| Action | Who |
|---|---|
| Manual times (mod), bulk verdicts, queue, policies, reports view | per-game mod (`verify-reject-run` on the game) |
| Self verdict / self manual time on **own** runs | the owning user, subject to the trust gate (§E) |
| Global queue, cross-game/global exclusion | board-admin / admin |

---

## A. Manual times ★

Lets a mod (or a runner via §E) assert a leaderboard time that need not correspond to any `finished_run`. **The board is a pure derivation:** a manual time is just one more candidate in the per-runner `min`. No modes, no `effectiveFrom`, no supersession state — see the gap-analysis §1 for the rationale.

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

No `mode` / `effective_from` / `active` / `superseded_by_run_id` columns — the derivation makes them unnecessary.

### A.1 Board-compute integration (the load-bearing change)

Wherever a runner's best entry on a slice is resolved — the **Redis board build**, the **`eligible-runs`** reads, and the **public leaderboard** — add manual times to the candidate set before taking the `min`:

```
candidates(runner, slice) =
    { r in finished_runs(runner, slice) : eligible(r) }
  ∪ { m in manual_times(runner, slice)
        : m.verification_status <> 'rejected'
          AND (m.source = 'mod' OR passesPolicies(m)) }
entry(runner, slice) = candidate with min time_ms on slice.timing
```

`eligible(r)` is the existing predicate (`leaderboard_eligible AND NOT excluded AND verification_status<>'rejected' AND passes policies`). A manual time is a board entry **even if the runner has zero finished_runs** on the slice; `rank`/`totalRunners` everywhere must count it. Add `source: 'run' | 'manual'` and `manualTimeId?: number` to the public `LeaderboardEntry` so the UI can mark "set time."

**No supersession code.** A faster eligible run wins the `min` because it is smaller; if it is later rejected/excluded the board recomputes and the manual time wins again. There is no state to maintain.

### A.2 Endpoints

**`GET /leaderboards/games/{gameId}/manual-times`** — list. Query: `categoryId?`, `subcategoryKey?`, `userId?`, `runnerName?`.
```ts
type Response = Array<{
  id: number; userId: number | null; guestName: string | null; runnerName: string;
  categoryId: number; categoryName: string; subcategoryKey: string;
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

**`POST /leaderboards/games/{gameId}/manual-times`** — create/upsert. Body = preview body **plus** `evidenceUrl?`, `reason` (≥10). `source='mod'`, `verification_status='verified'`. Upserts on the unique key (re-asserting overwrites).
```ts
type Response = { id: number; affectedLeaderboards: Array<{ categoryId: number; subcategoryKey: string }> };
```
`400` if `categoryId` not in game, `timing` invalid, `timeMs<=0`, or `guestName` empty. Flush board cache; audit `create_manual_time`.

**`PUT /leaderboards/games/{gameId}/manual-times/{id}`** — body `{ timeMs?, evidenceUrl?, reason }` (`reason` required). Recompute + flush + audit `update_manual_time`.

**`DELETE /leaderboards/games/{gameId}/manual-times/{id}`** — body `{ reason }`. Removes the candidate; board recomputes to runs.
```ts
type Response = { deleted: true; affectedLeaderboards: Array<{ categoryId: number; subcategoryKey: string }> };
```

**`POST /leaderboards/games/{gameId}/manual-times/{id}/verdict`** — mod confirms/denies a provisional self-claim. Body `{ action: 'verify' | 'reject', reason }`. `verify` → `verification_status='verified'`. `reject` → `verification_status='rejected'` (dropped from candidates), recompute. Audit; notify owner (§G).

### A.3 Edge cases

- **Below a minimum:** a `source='mod'` manual time bypasses policies (explicit authority, audited); a `source='self'` one must pass them (enforced in §E).
- **Per-timing:** one manual time per `timing`; an RT manual time leaves GT derived from runs.
- **Guests:** keyed by `guest_name`; `move-user` must re-target onto the merged `user_id` (§H.2).
- **Provisional self-claim:** `verification_status='pending'` still counts as a candidate (shows "unverified"); a mod `reject` drops it.

---

## B. Bulk verify/reject verdicts

Set form of the existing single-run `/leaderboards/{verify,reject}/{runId}`. Exclude already does bulk *removal*; this adds bulk *verify* and promotion-aware bulk *reject/unreject*.

**`POST /leaderboards/games/{gameId}/verdicts/preview`**
**`POST /leaderboards/games/{gameId}/verdicts`**
```ts
type Body = { action: 'verify' | 'reject' | 'unreject'; runIds: number[]; reason: string };
type Response = {
  affectedRunCount: number;
  affectedLeaderboards: Array<{ categoryId: number; subcategoryKey: string }>;
  promotions: Array<{ userId: number | null; runnerName: string;
                      categoryId: number; subcategoryKey: string;
                      newTopRunId: number | null }>;   // who got promoted by a reject
};
```
Behavior:
- `verify` → `verification_status='verified'` for each run.
- `reject` → `verification_status='rejected'`; promote each affected runner's next-best (same logic as single reject's `nextRunIdForUser`, applied per runner).
- `unreject` → back to `pending`; re-evaluate the slice.
- Cross-game guard: a `runId` from another game is silently skipped (not counted). One `logs` row per run. Flush cache for touched boards.

**Document for the frontend — exclude vs reject (no code change, just the contract):**
- **reject** = "verification failed for *this run*." Per-run, promotion-aware, leaves `excluded` untouched.
- **exclude** (shipped) = "remove from board; optionally a rule that also catches future uploads." Bulk, cascade, runner-shaped.
Both fail the eligibility predicate. Tell us which removal each UI action should call.

---

## C. Triage queue + ingest auto-flags

### C.0 Data model

```sql
CREATE TABLE run_flags (
  id          bigserial PRIMARY KEY,
  run_id      bigint NOT NULL,
  game_id     bigint NOT NULL,
  category_id bigint NOT NULL,
  reason      text   NOT NULL,   -- see producers below
  severity    text   NOT NULL,   -- 'low' | 'medium' | 'high'
  details     jsonb  NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  resolved_by bigint NULL
);
```

### C.1 Flag producers — run in the ingest path (`sync-runs-to-postgres`) on insert, and as a backfill job

| `reason` | Trigger |
|---|---|
| `below_minimum` | already computed (`ineligible_reason='below_minimum'`) — surface as a flag too |
| `impossible` | `time_ms <= 0`, or faster than the category's known WR by > `impossibleWrPct` |
| `pb_jump` | improvement over the runner's prior best on the slice > `pbJumpPct` |
| `missing_vod` | run lands in top-N where `requireVideo`/`requireVideoTopN` is set, `vodUrl IS NULL` |
| `duplicate` | identical `time_ms` to another run by the same or different user on the slice |
| `fresh_account_top_n` | account age < `freshAccountDays` and run lands in top-N |
| `reported` | a user report (§F) |
| `pending_self_claim` | a pending self-claimed manual time / self-unreject (§E) |

Thresholds (`impossibleWrPct`, `pbJumpPct`, `freshAccountDays`, top-N) come from board policies (§D) with sane platform defaults. A run leaving the board (verdict/exclude/manual-time) sets `resolved_at` on its open flags.

### C.2 Endpoints

**`GET /leaderboards/games/{gameId}/queue`** — per-game triage feed.
Query: `reason?`, `severity?`, `categoryId?`, `limit?=100`, `offset?=0`, `includeResolved?=false`.
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

**`GET /leaderboards/queue`** — global cross-game feed. Gate: board-admin/admin. Same item shape plus `gameId`/`gameName`. Query adds `gameId?`.

---

## D. Board policies (generalize minimums)

### D.0 Data model

```sql
CREATE TABLE board_policies (
  id              bigserial PRIMARY KEY,
  game_id         bigint NOT NULL,
  category_id     bigint NULL,            -- NULL => game-wide
  subcategory_key text   NULL,            -- NULL => all subcategories
  policy_type     text   NOT NULL,
  value           jsonb  NOT NULL,
  created_by      bigint NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

`policy_type` and `value`:

| `policy_type` | `value` | Effect |
|---|---|---|
| `min_time` | `{ rtMs?: number, gtMs?: number }` | runs below → `ineligible_reason='below_minimum'` (this is today's minimums) |
| `max_time` | `{ rtMs?: number, gtMs?: number }` | runs above → ineligible (junk slow times) |
| `require_video_top_n` | `{ n: number }` | top-N without `vodUrl` → flag `missing_vod` |
| `auto_flag_pb_jump_pct` | `{ pct: number }` | drives `pb_jump` flag |
| `auto_flag_faster_than_wr_pct` | `{ pct: number }` | drives `impossible` flag |

Evaluated at ingest (set `ineligible_reason` for hard rules, emit `run_flags` for soft). Recompute affected boards on policy create/update/delete.

### D.1 Endpoints

- **`GET /leaderboards/games/{gameId}/policies?categoryId=`** → `Array<{ id, categoryId, subcategoryKey, policyType, value, createdBy, createdAt }>`.
- **`POST /leaderboards/games/{gameId}/policies`** — body `{ categoryId?, subcategoryKey?, policyType, value, reason }`.
- **`PUT /leaderboards/games/{gameId}/policies/{id}`** — body `{ value, reason }`.
- **`DELETE /leaderboards/games/{gameId}/policies/{id}`** — body `{ reason }`.

Keep the existing `GET/PUT/DELETE /leaderboards/games/{gameId}/categories/{categoryId}/minimums` working as an **alias** that reads/writes the `min_time` policy.

---

## E. Self-service (trust-tiered)

Runners act on **their own** runs/manual times. Gate is ownership + a server-side **trust tier**, NOT `verify-reject-run`. Family `/v1/...` → `{ result }` responses.

**`POST /v1/me/runs/{runId}/verdict`** — body `{ action: 'reject' | 'unreject', reason? }`.
**`POST /v1/me/manual-times`** — body `{ gameId, categoryId, subcategoryKey, timing, timeMs, evidenceUrl?, reason? }`.
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
  -> write with verification_status='pending', emit run_flags 'pending_self_claim'
  -> it shows on the board flagged "self-reported · unverified" (still a candidate in the min)
  -> require evidenceUrl when the category has requireVideo and the claim enters top-N (else 400)
  -> self manual times must also pass board policies (e.g. minimum) — reject sub-floor claims with 400
  -> a mod resolves via /manual-times/{id}/verdict (§A) or /verdicts (§B)
```

```ts
type Response = { result: { applied: 'instant' | 'provisional'; manualTimeId?: number } };
```

**Trust signal** (decides what auto-confirms vs. queues): expose as server config; recommended default = "has ≥1 prior `verified` run on the platform OR account age > N days OR patreon tier ≥ 1" → faster claims auto-verify; otherwise provisional. Brand-new accounts always provisional.

---

## F. Community reporting

```sql
CREATE TABLE run_reports (
  id               bigserial PRIMARY KEY,
  run_id           bigint NOT NULL,
  reporter_user_id bigint NOT NULL,
  reason           text   NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  resolved_at      timestamptz NULL,
  resolution       text   NULL          -- 'upheld' | 'dismissed'
);
CREATE UNIQUE INDEX ON run_reports (run_id, reporter_user_id);  -- dedupe
```

**`POST /v1/reports`** — public (authed). Body `{ runId, reason }`. Rate-limit per reporter (e.g. ≤ 20/day). Dedupe per `(run_id, reporter)`. Emits a `reported` flag (§C); weight by reporter trust — low-trust reports aggregate (only flag once count ≥ threshold) rather than auto-flag. Response `{ result: { reported: true } }`.

**`GET /leaderboards/games/{gameId}/reports`** — mod view. Query `resolved?=false`. Returns reports joined to run + reporter name. Resolving the run closes its reports (`resolution='upheld'` on exclude/reject, `'dismissed'` on verify).

---

## G. Appeals, notifications, run history

**`POST /v1/runs/{runId}/appeal`** — runner disputes a verdict on their run. Body `{ reason }`. Creates an appeal (reuse `run_flags` with `reason='appeal'`, or a small `run_appeals` table) routed to the per-game queue. `403` if not the owner.

**`GET /v1/runs/{runId}/history`** — public-safe timeline for transparency.
```ts
type Response = { result: Array<{
  type: 'verdict' | 'manual_time' | 'exclusion' | 'report' | 'appeal';
  action: string; byRole: 'mod' | 'self' | 'system'; reason: string | null; at: string;
  detail?: Record<string, unknown>;     // e.g. fromStatus/toStatus, beaten-by run id
}> };
```
Redact mod identities for the public; show the runner-facing reason.

**Notifications** — emit on every verdict/manual-time/claim/exclusion that affects a runner.
```sql
CREATE TABLE notifications (
  id bigserial PRIMARY KEY, user_id bigint NOT NULL,
  type text NOT NULL, payload jsonb NOT NULL,
  read_at timestamptz NULL, created_at timestamptz NOT NULL DEFAULT now()
);
```
- **`GET /v1/me/notifications?unreadOnly=`** → `{ result: Notification[] }`.
- **`POST /v1/me/notifications/{id}/read`** → `{ result: { read: true } }`.
In-app feed is enough for v1; email/Discord later.

---

## H. Cross-cutting (must-do, small)

1. **Status vocab:** converge on `pending | verified | rejected` across all endpoints (mass-management's `unverified` → `pending`), or document `unverified ≡ pending` as a permanent contract. The frontend normalizes once at the types boundary either way.
2. **Overrides survive identity/board moves — verify and extend:** when `move-user` merges a runner or a game/category **reassignment** moves runs, ensure `manual_times`, `run_flags`, run verdicts, and `exclusion_rules` follow the move (re-target ids) and the affected boards recompute. A merge that silently drops a manual time corrupts a board — **fix this before manual times ship.**
3. **Redis flush on writes:** all new mutating endpoints flush the affected board cache server-side (don't rely on the caller or TTL).
4. **Preview rank deltas:** the shipped `exclude/preview` orders by RT for all categories; manual times make GT-primary boards common. Make `manual-times/preview` and `verdicts/preview` rank correctly for the slice's `timing`.

---

## Build order

1. **A. Manual times** — table + board-compute + endpoints (no supersession state). Headline; nothing else delivers the "set their time to 35:48" case. Do **H.2** (override-carry) alongside.
2. **B. Bulk verdicts** — small once single verify/reject exists.
3. **C + D. Queue + flags + policies** — ingest-time producers + feeds.
4. **E. Self-service + trust.**
5. **F + G. Reporting + appeals + notifications + history.**
