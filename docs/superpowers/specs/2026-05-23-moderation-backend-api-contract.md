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
- **Cache:** any write that changes a board MUST flush the Redis leaderboard cache for the affected `(gameId[, categoryId])` synchronously — placements and verdicts must be visible immediately, not at TTL. (Mass-management exclude/include rely on the caller flushing; for the new endpoints, flush server-side.)
- **Eligibility predicate (extended):** a `finished_run` is board-eligible iff
  `leaderboard_eligible = true AND excluded = false AND verification_status <> 'rejected' AND passes all active board policies`.
  A runner's board entry on a slice may instead be produced by an active **placement** (§A).
- **Slice** = `(gameId, categoryId, subcategoryKey, timing)`, where `subcategoryKey` is `""` for the no-variables board and `timing ∈ {'realtime','gametime'}`.
- **Status vocabulary:** standardize on `pending | verified | rejected`. Mass-management currently emits `unverified`; treat `unverified ≡ pending` and converge (see §H).

**Permission summary**

| Action | Who |
|---|---|
| Placements (mod), bulk verdicts, queue, policies, reports view, placement verdicts | per-game mod (`verify-reject-run` on the game) |
| Self verdict / self placement on **own** runs | the owning user, subject to the trust gate (§E) |
| Global queue, cross-game/global exclusion | board-admin / admin |

---

## A. Manual placements ★

Lets a mod (or a runner via §E) assert a leaderboard time that need not correspond to any `finished_run`.

### A.0 Data model — new table

```sql
CREATE TABLE leaderboard_placements (
  id              bigserial PRIMARY KEY,
  user_id         bigint NULL REFERENCES users(id),   -- NULL => guest placement
  guest_name      text   NULL,                         -- set iff user_id IS NULL
  game_id         bigint NOT NULL,
  category_id     bigint NOT NULL,
  subcategory_key text   NOT NULL DEFAULT '',
  timing          text   NOT NULL,                     -- 'realtime' | 'gametime'
  time_ms         bigint NOT NULL,
  mode            text   NOT NULL,                     -- 'ceiling' | 'pinned'
  effective_from  timestamptz NOT NULL DEFAULT now(),
  evidence_url    text   NULL,
  verification_status text NOT NULL DEFAULT 'pending', -- pending|verified|rejected
  source          text   NOT NULL,                     -- 'mod' | 'self' | 'system'
  created_by      bigint NOT NULL REFERENCES users(id),
  reason          text   NOT NULL,
  active          boolean NOT NULL DEFAULT true,
  superseded_by_run_id bigint NULL,                    -- set when a real run takes over
  created_at      timestamptz NOT NULL DEFAULT now()
);
-- at most one ACTIVE placement per runner per slice:
CREATE UNIQUE INDEX ON leaderboard_placements
  (user_id, guest_name, game_id, category_id, subcategory_key, timing)
  WHERE active;
```

### A.1 Board-compute integration (the load-bearing change)

Wherever a runner's best entry on a slice is resolved — the **Redis board build**, the **`eligible-runs`** reads, and the **public leaderboard** endpoint — apply this resolution:

```
resolveEntry(runner, slice):
  p = active placement for (runner, slice)
  if p and p.mode == 'pinned':
      return { time: p.time_ms, source: 'placement', placementId: p.id }   # ignore runner's runs
  if p and p.mode == 'ceiling':
      r = best eligible run for (runner, slice) with ended_at > p.effective_from
      if r and r.time < p.time_ms:
          return { ...r, source: 'run', supersedes: p.id }                 # real run wins
      return { time: p.time_ms, source: 'placement', placementId: p.id }
  return best eligible run for (runner, slice)                             # today's behavior
```

A placement is a board entry **even if the runner has zero finished_runs** on the slice. `rank` / `totalRunners` in every read must count placements. The public `LeaderboardEntry` should expose `source: 'run' | 'placement'` and `placementId?` so the UI can mark "set time."

### A.2 Supersession (when ceiling placements deactivate)

Evaluate on **(a)** every new-run ingest and **(b)** placement create/update:

- A ceiling placement `p` is superseded by a run `r` iff `r` is eligible, `r.ended_at > p.effective_from`, and `r.time_ms < p.time_ms` (compare on the placement's `timing`). On supersession set `active=false`, `superseded_by_run_id=r.id`.
- **Reactivation:** if a run that superseded a placement is later excluded/rejected, set the placement `active=true`, clear `superseded_by_run_id`, recompute the board.
- A sub-policy-floor run (e.g. below `min_time`) is **not** eligible and cannot supersede.

### A.3 Endpoints

**`GET /leaderboards/games/{gameId}/placements`** — list.
Query: `categoryId?`, `subcategoryKey?`, `userId?`, `runnerName?`, `includeInactive?=false`.
```ts
type Response = Array<{
  id: number;
  userId: number | null; guestName: string | null; runnerName: string;
  categoryId: number; categoryName: string; subcategoryKey: string;
  timing: 'realtime' | 'gametime'; timeMs: number;
  mode: 'ceiling' | 'pinned'; effectiveFrom: string;
  evidenceUrl: string | null; verificationStatus: 'pending'|'verified'|'rejected';
  source: 'mod'|'self'|'system'; active: boolean; supersededByRunId: number | null;
  createdBy: number; createdByName: string; reason: string; createdAt: string;
}>;
```

**`POST /leaderboards/games/{gameId}/placements/preview`** — read-only blast radius.
```ts
type Body = {
  runnerRef: { userId: number } | { guestName: string };
  categoryId: number; subcategoryKey: string;
  timing: 'realtime' | 'gametime'; timeMs: number;
  mode: 'ceiling' | 'pinned'; effectiveFrom?: string;
};
type Response = {
  resultingEntry: { rank: number | null; timeMs: number };   // where the placement lands
  ignoredRunIds: number[];                                    // runner's runs it overrides now
  affectedLeaderboards: Array<{
    categoryId: number; subcategoryKey: string;
    rankChanges: Array<{ runnerName: string; userId: number | null;
                         currentRank: number; newRank: number | null; timeMs: number | null }>;
  }>;
};
```

**`POST /leaderboards/games/{gameId}/placements`** — create.
Body = preview body **plus** `evidenceUrl?`, `reason` (≥10). `source='mod'`.
```ts
type Response = { id: number; affectedLeaderboards: Array<{ categoryId: number; subcategoryKey: string }> };
```
Behavior: insert, run supersession check, flush cache, audit (`action:'create_placement'`). Idempotent on the unique active key — if an active placement already exists for the slice, `409` (or return the existing `{ id, alreadyExists: true }`). `400` if `categoryId` not in game, `timing` invalid, `timeMs<=0`, or `guestName` empty.

**`PUT /leaderboards/games/{gameId}/placements/{id}`** — edit. Body: any of `{ timeMs?, mode?, effectiveFrom?, evidenceUrl?, reason }` (`reason` required). Recompute + flush + audit (`update_placement`).

**`DELETE /leaderboards/games/{gameId}/placements/{id}`** — body `{ reason }`. Sets `active=false`; board recomputes back to runs. Audit (`delete_placement`).
```ts
type Response = { deleted: true; affectedLeaderboards: Array<{ categoryId: number; subcategoryKey: string }> };
```

**`POST /leaderboards/games/{gameId}/placements/{id}/verdict`** — mod confirms/denies a provisional (self-created) placement. Body `{ action: 'verify' | 'reject', reason }`. `verify` → `verification_status='verified'`. `reject` → `active=false, verification_status='rejected'`, recompute. Audit. Notify the owner (§G).

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
| `pending_self_claim` | a provisional self-placement/self-unreject (§E) |

Thresholds (`impossibleWrPct`, `pbJumpPct`, `freshAccountDays`, top-N) come from board policies (§D) with sane platform defaults. A run leaving the board (verdict/exclude/placement) sets `resolved_at` on its open flags.

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

Runners act on **their own** runs/placements. Gate is ownership + a server-side **trust tier**, NOT `verify-reject-run`. Family `/v1/...` → `{ result }` responses.

**`POST /v1/me/runs/{runId}/verdict`** — body `{ action: 'reject' | 'unreject', reason? }`.
**`POST /v1/me/placements`** — body `{ gameId, categoryId, subcategoryKey, timing, timeMs, evidenceUrl?, reason? }`.
**`DELETE /v1/me/placements/{id}`**.

Server-side decision (never trust the client):

```
owner check: the run/placement's runner must equal caller users.id, else 403.
banned check: if caller is banned -> 403.

INSTANT (apply immediately, source='self', verification_status='verified'):
  - reject / hide your own run
  - delete your own placement
  - placement whose timeMs is SLOWER than your current board time on the slice

PROVISIONAL (apply but mark, then queue for mod confirm):
  - placement that is FASTER / a new best, OR unrejecting your own run
  -> write with verification_status='pending', emit run_flags 'pending_self_claim'
  -> it shows on the board flagged "self-reported · unverified"; superseded normally
  -> require evidenceUrl when the category has requireVideo and the claim enters top-N (else 400)
  -> a mod resolves via /placements/{id}/verdict (§A) or /verdicts (§B)
```

```ts
type Response = { result: { applied: 'instant' | 'provisional'; placementId?: number } };
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
  type: 'verdict' | 'placement' | 'exclusion' | 'report' | 'appeal';
  action: string; byRole: 'mod' | 'self' | 'system'; reason: string | null; at: string;
  detail?: Record<string, unknown>;     // e.g. supersededByRunId, fromStatus/toStatus
}> };
```
Redact mod identities for the public; show the runner-facing reason.

**Notifications** — emit on every verdict/placement/claim/exclusion that affects a runner.
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
2. **Overrides survive identity/board moves — verify and extend:** when `move-user` merges a runner or a game/category **reassignment** moves runs, ensure `leaderboard_placements`, `run_flags`, run verdicts, and `exclusion_rules` follow the move (re-target ids) and the affected boards recompute. A merge that silently drops a placement corrupts a board — **fix this before placements ship.**
3. **Redis flush on writes:** all new mutating endpoints flush the affected board cache server-side (don't rely on the caller or TTL).
4. **Preview rank deltas:** the shipped `exclude/preview` orders by RT for all categories; placements make GT-primary boards common. Make `placements/preview` and `verdicts/preview` rank correctly for the slice's `timing`.

---

## Build order

1. **A. Manual placements** — table + board-compute + supersession + endpoints. Headline; nothing else delivers the "set their time to 35:48" case. Do **H.2** (override-carry) alongside.
2. **B. Bulk verdicts** — small once single verify/reject exists.
3. **C + D. Queue + flags + policies** — ingest-time producers + feeds.
4. **E. Self-service + trust.**
5. **F + G. Reporting + appeals + notifications + history.**
