# Moderation Vision — Backend Requirements (Gap Analysis)

**Date:** 2026-05-23
**Status:** Backend ask — derived from the moderation vision.
**Reads with:**
- Vision (source of truth): `docs/superpowers/specs/2026-05-23-moderation-leaderboard-editing-vision.md`
- Shipped building block: `docs/frontend-guide-leaderboard-mod-mass-management.md`
- Exact endpoint specs: `docs/superpowers/specs/2026-05-23-moderation-backend-api-contract.md`

---

## How to read this

The **vision is the target.** Mass-management is one building block the backend already shipped — it covers bulk *exclusion* well and proves the right patterns (per-game gate, blast-radius preview, mandatory reason, audit feed, client-side undo). This document is the **delta**: what's still missing to deliver the vision, written so it can be built without re-reading the vision end to end.

Keep doing what mass-management already does well, everywhere:

- Prefix `/leaderboards/games/{gameId}/...`; gate on **`verify-reject-run`** for the game (global actions → board-admin/admin).
- Resolve the caller's Twitch username → numeric `users.id` server-side for perms + audit.
- Every **bulk mutation has a paired `preview`** returning affected leaderboards + per-runner rank deltas + sample rows.
- Every write requires `reason` (min 10 chars), writes a `logs` row, and returns the affected leaderboards.
- Undo is reconstructable from the mod-actions feed (inverse op); add an explicit `batchId` undo for any multi-row op that must revert atomically.
- Plain-text error bodies (current behavior — keep it, the frontend won't `JSON.parse` them).

---

## The core model (read this first)

The leaderboard is a **pure derivation** — logically. Physically it stays materialized (the `isLeaderboardEntry` flags on `finished_runs` + a Redis read cache) and is rebuilt by the existing unified rebuild pipeline only when inputs change (a moderation write or a run ingest); public reads have no per-request compute (see API contract §A.1). For a slice `(game, category, subcategoryKey, timing)`, a runner's board time is:

```
min over CANDIDATES, where
  CANDIDATES = eligible finished_runs  ∪  manually-added times
  eligible(run) = leaderboard_eligible AND NOT excluded
                  AND verification_status <> 'rejected' AND passes board policies
```

Three of the four moderation primitives **filter** the run candidates (verdicts, exclusions, policies — mostly shipped); one **adds** a candidate (manual times — §1). Everything the brief calls "adjust a leaderboard time" is a combination of *excluding* bad runs and *adding* a manual time, with the `min` doing the rest. There is no override state, no supersession bookkeeping — see §1.

---

## Status at a glance

| Capability | Vision § | Status | Backend work |
|---|---|---|---|
| Bulk exclude/include — rule + ad-hoc | 3b, 5 | ✅ Done | — |
| Blast-radius preview (rank deltas) | 5, 10 | ✅ Done | — |
| Per-game audit feed + client-side undo | 8, 10 | ✅ Done | — |
| Single-run verify/reject (+ promotion) | 3a | ✅ Done | — |
| Minimum times (`below_minimum`) | 3d | ✅ Done | Fold into policies (below) |
| **Manual times (extra candidates in the `min`)** | 3c, 4B | ❗ **Missing** | **§1 — headline** |
| Bulk verify/reject verdicts | 3a, 5 | ❗ Missing | §2 |
| Triage queue + ingest-time auto-flag | 5 | ❗ Missing | §3 |
| Board policies (generalize minimums) | 3d | ◐ Partial | §4 |
| Self-service (trust-tiered) | 6 | ❗ Missing | §5 |
| Community reporting | 7 | ❗ Missing | §6 |
| Appeals + notifications + run history | 8 | ❗ Missing | §7 |
| Status vocab `unverified`≡`pending` | 3a | ◐ Nit | §8 |
| Overrides survive move-user / reassignment | 7 | ⚠ Verify | §8 |

Priority order = §1 → §7 (matches vision phases P2→P5; P1 is frontend-only against shipped endpoints).

---

## 1. Manual times ★ (the headline ask)

**Why:** the vision's defining capability — and it's deliberately small. Because the board is the `min` over *eligible runs + manually-added times*, a manual time is just **one more candidate**. It lets a mod or runner assert a time that **need not correspond to any `finished_run`** ("their real time is 35:48"). A manual time can only ever *lower* a runner's `min`; making someone *slower* is an **exclusion** of the faster (fake) run, never a manual time.

**This replaces the earlier "placement" idea.** There are **no** modes (`ceiling`/`pinned`), no `effectiveFrom`, no `active`/supersession state, and no reactivation. "Count it until they beat it" is not a feature — it is what `min` over current candidates does (a faster eligible run wins on its own; if it is later rejected the manual time wins again). "Ignore their fake faster runs" is an exclusion. Dropping all that state is the whole point.

### Data model — new table `manual_times`

```
id              bigserial pk
user_id         bigint null   -- null => guest
guest_name      text null     -- set iff user_id is null
game_id         bigint not null
category_id     bigint not null
subcategory_key text not null default ''
timing          text not null -- 'realtime' | 'gametime'
time_ms         bigint not null
evidence_url    text null
verification_status text not null default 'pending'  -- pending|verified|rejected (self-claims)
source          text not null -- 'mod' | 'self' | 'system'
created_by      bigint not null
reason          text not null
created_at      timestamptz not null default now()
-- one manual time per (runner, game, category, subcategory_key, timing); POST upserts on conflict
```

No `mode` / `effective_from` / `active` / `superseded_by` columns — the derivation makes them unnecessary.

### Board-compute change (the only real work)

Wherever a runner's best entry is resolved for a slice — the Redis board build, the `eligible-runs` reads, and the public board — **add manual times to the candidate set** before taking the `min`:

```
candidates(runner, slice) =
    { eligible finished_runs for (runner, slice) }
  ∪ { manual_times for (runner, slice)
        where verification_status <> 'rejected'
          AND (source = 'mod' OR passesPolicies(m)) }   -- self-claims still respect minimums
entry(runner, slice) = candidate with the smallest time_ms (on slice.timing)
```

A manual time is a board entry **even when the runner has no finished_run** on the slice — `rank`/`totalRunners` in every read must count it. Expose `source: 'run' | 'manual'` (and the manual-time id) on the entry so the UI can mark "set time."

There is **nothing to compute on supersession** — boards are recomputed from current candidates. No state transitions, no reactivation. Recompute is event-driven via the existing unified rebuild pipeline (`enqueueLeaderboardRebuild` → `rebuildComboFlags`) — not per read; public reads hit the materialized flags + Redis cache (contract §A.1, §H.3).

### Endpoints (full shapes in the API-contract doc §A)

```
GET    /leaderboards/games/{gameId}/manual-times
POST   /leaderboards/games/{gameId}/manual-times/preview      -- blast radius, like exclude/preview
POST   /leaderboards/games/{gameId}/manual-times              -- create/upsert (mod => verified)
PUT    /leaderboards/games/{gameId}/manual-times/{id}         -- edit timeMs / evidence / reason
DELETE /leaderboards/games/{gameId}/manual-times/{id}         -- body { reason }; board recomputes
POST   /leaderboards/games/{gameId}/manual-times/{id}/verdict -- mod confirm/deny a self-claim
```

`POST` body: `{ runnerRef: {userId} | {guestName}, categoryId, subcategoryKey, timing, timeMs, evidenceUrl?, reason }`. Gate `verify-reject-run` (mod); self-created manual times go through §5. Every write flushes the affected board's Redis cache and writes a `logs` row.

### Edge cases

- **Below a minimum:** a `source='mod'` manual time bypasses policies (explicit authority, audited); a `source='self'` one must pass them (enforced in §5), so a runner can't claim an impossible time.
- **Per-timing:** one manual time per `timing`; an RT manual time leaves GT derived from runs.
- **Guests:** keyed by `guest_name`; `move-user` must re-target onto the merged `user_id`.
- **Combined views:** recompute from slice-level candidates.
- **Self-claim provisional:** a `pending` self manual time is still a candidate (wins the `min` if fastest, shown "unverified"); a mod `reject` drops it from the set, exactly like a rejected run.

---

## 2. Bulk verify/reject verdicts

**Why:** mass-management bulk-*excludes*. The vision also needs bulk *verify* (clear a backlog of legit runs, satisfy `requireVideo`) and promotion-aware bulk *reject*. Single-run verify/reject already exists — this is the set form.

```
POST /leaderboards/games/{gameId}/verdicts/preview
POST /leaderboards/games/{gameId}/verdicts
  body: { action: 'verify'|'reject'|'unreject', runIds: number[], reason }
  resp: { affectedRunCount, affectedLeaderboards, promotions: [...], rankChanges: [...] }
```

Promotion-aware like the single reject's `nextRunIdForUser`, but for the whole set. Per-run `logs` rows; cross-game guard; undo via `unreject` / re-verify.

**Also clarify exclude-vs-reject for the frontend.** Both remove a run from the board. Recommended split to document: **reject** = "verification failed for *this run*" (per-run, promotion-aware); **exclude** = "remove from board, optionally as a rule that also catches future uploads" (bulk, cascade, runner-shaped). Keep both; state which to reach for.

---

## 3. Triage queue + ingest auto-flags

**Why:** "there will be a LOT of wrong runs." Mods must work a curated, prioritized feed — not scrub raw boards.

### Flag producers (extend the ingest path, `sync-runs-to-postgres`)

Compute on insert (and backfill): `impossible` (negative/zero, or faster than the category's known WR by > X%), `pb_jump` (improvement over runner's prior best > X%), `missing_vod` (top-N where `requireVideo`/`requireVideoTopN` set, no `vodUrl`), `duplicate` (identical time across runs/accounts), `fresh_account_top_n`, `reported` (from §6), `pending_self_claim` (from §5). `below_minimum` already exists.

Persist as `run_flags(run_id, reason, severity, created_at, resolved_at)` (or compute-on-read if cheaper). A run leaving the board via verdict/exclude/manual-time resolves its flags.

### Endpoint

```
GET  /leaderboards/games/{gameId}/queue?reason=&page=&pageSize=
     -> [{ run, flagReason, severity, suggestedAction, runnerContext }]
POST /leaderboards/games/{gameId}/queue/{flagId}/resolve   -- optional explicit dismiss
```

Plus a **global** queue for board-admin/admin across games. Thresholds (X%, N) should be configurable per §4.

---

## 4. Board policies (generalize minimums)

**Why:** minimums already prove the "standing rule evaluated at ingest" model. Generalize so the same machinery drives auto-flags and auto-rejects.

Generalize `/minimums` into `board_policies` per `(game[, category[, subcategoryKey]])`:

```
policy_type: 'min_time' | 'max_time' | 'require_video_top_n'
           | 'auto_flag_pb_jump_pct' | 'auto_flag_faster_than_wr_pct'
value: jsonb
```

Evaluated at ingest → set `ineligible_reason` (hard) or emit a `run_flags` row (soft). Keep `GET/PUT/DELETE /leaderboards/games/{id}/categories/{cid}/minimums` as a back-compat alias for `min_time`. New: `GET/POST/PUT/DELETE /leaderboards/games/{gameId}/policies`.

---

## 5. Self-service (trust-tiered) ★

**Why:** "moderate your own runs, or say 'hey my time is actually this' — and it should just work." Runners act on **their own** runs/manual times, gated by a server-side trust tier, not `verify-reject-run`.

```
POST /v1/me/runs/{runId}/verdict     -- body { action: 'reject'|'unreject', reason? }
POST /v1/me/manual-times             -- body { gameId, categoryId, subcategoryKey, timing, timeMs, evidenceUrl?, reason? }
DELETE /v1/me/manual-times/{id}
```

Server-side trust gate (the whole point — never trust the client for this):

- **Instant:** reject/hide own run; remove own manual time; a manual time that *can't* improve your rank (not faster than your current board time). No abuse incentive.
- **Provisional:** a *faster*/new-best self manual time, or un-rejecting own run → write it but mark `source='self'`, `verification_status='pending'`, and emit a `pending_self_claim` flag (§3). It shows on the board marked unverified and stays a candidate in the `min`. Mod confirm → `verified`; mod reject → dropped (+ optional trust penalty).
- A self manual time must also pass board policies (e.g. minimum); reject sub-floor claims.
- Evidence (`evidenceUrl`) **required** when the category has `requireVideo` and the claim enters the top-N.
- **Banned users:** blocked entirely. **Ownership:** the run/manual-time runner must equal the caller's resolved `users.id`.

Needs a **trust signal** — e.g. has ≥1 prior verified run / account age / patreon tier — to decide what auto-confirms vs. queues. Expose the thresholds as config.

---

## 6. Community reporting

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

**`POST /v1/reports`** — public (authed). Body `{ runId, reason }`. Rate-limit per reporter (e.g. ≤ 20/day). Dedupe per `(run_id, reporter)`. Emits a `reported` flag (§3); weight by reporter trust — low-trust reports aggregate (only flag once count ≥ threshold) rather than auto-flag. Response `{ result: { reported: true } }`.

**`GET /leaderboards/games/{gameId}/reports`** — mod view. Query `resolved?=false`. Returns reports joined to run + reporter name. Resolving the run closes its reports (`resolution='upheld'` on exclude/reject, `'dismissed'` on verify).

---

## 7. Appeals, notifications, run history

**Why:** keep disputes in-system; close the loop with runners (the reject reason is already "shown to runner" — generalize it).

```
POST /v1/runs/{runId}/appeal         -- runner disputes a verdict -> queue item
GET  /v1/runs/{runId}/history        -- public-safe verdict / manual-time timeline
```

**Notifications:** on every verdict/manual-time/claim decision affecting a runner, emit a notification with the reason. A `notifications(user_id, type, payload, read_at, created_at)` table feeding an in-app feed is enough for v1; email/Discord later.

---

## 8. Reconciliation items

- **Status vocabulary:** mass-management returns `unverified|verified|rejected`; `leaderboards.types.ts` uses `pending|verified|rejected`. Pick one canonical set (recommend `pending`) or document `unverified ≡ pending` as a stable contract so the frontend can normalize once.
- **Overrides survive identity/board moves (verify, then specify):** when `move-user` merges a runner or a game/category reassignment moves runs, do verdicts, `run_flags`, and manual times follow? Exclusion *rules* are keyed `(user, game[, category])` — after a game reassignment, do they re-target the new game id, or silently stop matching? Define and test this; the vision requires overrides to ride along and the boards to recompute.
- **Redis cache on writes:** confirm whether `exclude/include/verdict/manual-time` writes flush the Redis leaderboard build or rely on the 1h TTL. Manual times in particular **must** be reflected in the cached board immediately.
- **Preview rank deltas use RT ordering** for all categories (known mass-management follow-up). Manual times make GT-primary boards more common — fixing GT ranks in preview rises in priority.

---

## Build order

1. **Manual times** (§1) — thin candidate table + board-compute + preview. Unblocks the headline use case and vision P2.
2. **Bulk verify/reject verdicts** (§2).
3. **Triage queue + ingest flags + policies** (§3, §4).
4. **Self-service + trust** (§5).
5. **Reporting + appeals + notifications** (§6, §7).

§8 reconciliation items are small and can land alongside whichever phase touches them — but verify the move-user/reassignment override-carry behavior **before** manual times ship, since a merge that drops a manual time would silently corrupt a board.
