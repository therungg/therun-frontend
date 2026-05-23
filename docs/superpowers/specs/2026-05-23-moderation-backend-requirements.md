# Moderation Vision — Backend Requirements (Gap Analysis)

**Date:** 2026-05-23
**Status:** Backend ask — derived from the moderation vision.
**Reads with:**
- Vision (source of truth): `docs/superpowers/specs/2026-05-23-moderation-leaderboard-editing-vision.md`
- Shipped building block: `docs/frontend-guide-leaderboard-mod-mass-management.md`

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

## Status at a glance

| Capability | Vision § | Status | Backend work |
|---|---|---|---|
| Bulk exclude/include — rule + ad-hoc | 3b, 5 | ✅ Done | — |
| Blast-radius preview (rank deltas) | 5, 10 | ✅ Done | — |
| Per-game audit feed + client-side undo | 8, 10 | ✅ Done | — |
| Single-run verify/reject (+ promotion) | 3a | ✅ Done | — |
| Minimum times (`below_minimum`) | 3d | ✅ Done | Fold into policies (below) |
| **Manual placements (ceiling/pinned + supersession)** | 3c, 4B | ❗ **Missing** | **§1 — headline** |
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

## 1. Manual placements ★ (the headline ask)

**Why:** the vision's defining new capability. Lets a mod *or a runner* assert a leaderboard time that **need not correspond to any `finished_run`** — "their real time is 35:48; count it; if they get a better run later, count that." Nothing shipped does this; exclusion can only *remove*, never *assert*.

### Data model — new table `leaderboard_placements`

```
id              bigserial pk
user_id         bigint null            -- null => guest placement
guest_name      text null              -- set iff user_id is null
game_id         bigint not null
category_id     bigint not null
subcategory_key text not null default ''
timing          text not null          -- 'realtime' | 'gametime'
time_ms         bigint not null
mode            text not null          -- 'ceiling' | 'pinned'
effective_from  timestamptz not null default now()
evidence_url    text null
verification_status text not null default 'pending'  -- pending|verified|rejected
source          text not null          -- 'mod' | 'self' | 'system'
created_by      bigint not null        -- users.id
reason          text not null
active          boolean not null default true
created_at      timestamptz not null default now()
-- unique active placement per (runner, game, category, subcategory_key, timing)
```

### Board-compute change (the important part)

Wherever the best-per-user entry is resolved for a slice `(game, category, subcategoryKey, timing)` — the Redis leaderboard build **and** the `eligible-runs` reads — apply:

```
if active pinned placement      -> entry = placement (ignore this runner's runs on the slice)
else if active ceiling placement-> entry = min(placement.time_ms,
                                               best eligible run with ended_at > effective_from)
else                            -> best eligible finished_run   (today's behavior)
```

A placement is itself a board entry even when the runner has **no** finished_run on the slice. Rank/`totalRunners` in `eligible-runs` and the public board must count it.

### Supersession

- A ceiling placement is **superseded** by a later eligible run that is *faster* — recommended key: `ended_at > effective_from AND time_faster AND eligible`. Slower/older runs never supersede.
- If the superseding run is later excluded/rejected, **reactivate** the placement (or recompute and fall back to it if still active).
- "Eligible" for supersession = the same predicate (`leaderboard_eligible AND NOT excluded AND verification_status<>'rejected'`) **plus** policy checks — a future sub-minimum run cannot supersede.

### Endpoints

```
GET    /leaderboards/games/{gameId}/placements?categoryId=&subcategoryKey=&runner=
POST   /leaderboards/games/{gameId}/placements/preview   -- blast radius, like exclude/preview
POST   /leaderboards/games/{gameId}/placements           -- create
PUT    /leaderboards/games/{gameId}/placements/{id}      -- edit time/mode/reason
DELETE /leaderboards/games/{gameId}/placements/{id}      -- body { reason }
```

`POST` body: `{ runnerRef: {userId} | {guestName}, categoryId, subcategoryKey, timing, timeMs, mode, effectiveFrom?, evidenceUrl?, reason }`. Gate: `verify-reject-run` for mod source; the self source comes via §5. Cache: flush Redis for the affected board (placements must be reflected immediately, not at TTL).

### Edge cases

- **Below a minimum:** a mod/pinned placement is allowed below the policy floor (mod intent wins) — log it. A *future* sub-floor run still can't supersede.
- **Per-timing:** placement is per `timing`; setting an RT placement leaves GT computed.
- **Guests:** keyed by `guest_name`; `move-user` must re-target guest placements onto the merged `user_id`.
- **Combined views:** recompute from slice-level placements.

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

## 3. Triage queue + ingest-time auto-flag

**Why:** "there will be a LOT of wrong runs." Mods must work a curated, prioritized feed — not scrub raw boards.

### Flag producers (extend the ingest path, `sync-runs-to-postgres`)

Compute on insert (and backfill): `impossible` (negative/zero, or faster than the game's known WR by > X%), `pb_jump` (improvement over runner's prior best > X%), `missing_vod` (top-N where `requireVideo`/`requireVideoTopN` set, no `vodUrl`), `duplicate` (identical time across runs/accounts), `fresh_account_top_n`, `reported` (from §6), `pending_self_claim` (from §5). `below_minimum` already exists.

Persist as `run_flags(run_id, reason, severity, created_at, resolved_at)` (or compute-on-read if cheaper). A run leaving the board via verdict/exclude/placement resolves its flags.

### Endpoint

```
GET  /leaderboards/games/{gameId}/queue?reason=&page=&pageSize=
     -> [{ run, flagReason, severity, suggestedAction, runnerContext }]
POST /leaderboards/games/{gameId}/queue/{itemId}/resolve   -- optional explicit dismiss
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

**Why:** "moderate your own runs, or say 'hey my time is actually this' — and it should just work." Runners act on **their own** runs/placements, gated by a server-side trust tier, not `verify-reject-run`.

```
POST /v1/me/runs/{runId}/verdict     -- body { action: 'reject'|'unreject', reason? }
POST /v1/me/placements               -- body { categoryId, subcategoryKey, timing, timeMs, evidenceUrl?, reason? }
DELETE /v1/me/placements/{id}
```

Server-side trust gate (the whole point — never trust the client for this):

- **Instant:** reject/hide own run; remove own placement; placement *slower* than the runner's current board time. No abuse incentive.
- **Provisional:** a *faster*/new-best self-placement, or un-rejecting own run → write it but mark `source='self'`, `verification_status='pending'`, and emit a `pending_self_claim` flag (§3). It shows on the board marked unverified and is superseded normally. Mod confirm → `verified`; mod reject → removed (+ optional trust penalty).
- Evidence (`evidenceUrl`) **required** when the category has `requireVideo` and the claim enters the top-N.
- **Banned users:** blocked entirely. **Ownership:** the run/placement runner must equal the caller's resolved `users.id`.

Needs a **trust signal** — e.g. has ≥1 prior verified run / account age / patreon tier — to decide what auto-confirms vs. queues. Expose the thresholds as config.

---

## 6. Community reporting

**Why:** crowd-source detection; feed the queue.

```
POST /v1/reports                     -- authed, rate-limited, dedupe per (reporter, runId)
     body { runId, reason }
GET  /leaderboards/games/{gameId}/reports    -- mod view
```

A report emits a `reported` flag (§3). Weight by reporter trust — low-trust reports aggregate rather than auto-flag. Resolving the run (verdict/exclude/placement) closes its reports.

---

## 7. Appeals, notifications, run history

**Why:** keep disputes in-system; close the loop with runners (the reject reason is already "shown to runner" — generalize it).

```
POST /v1/runs/{runId}/appeal         -- runner disputes a verdict -> queue item
GET  /v1/runs/{runId}/history        -- public-safe verdict/placement timeline
```

**Notifications:** on every verdict/placement/claim decision affecting a runner, emit a notification with the reason. A `notifications(user_id, type, payload, read_at, created_at)` table feeding an in-app feed is enough for v1; email/Discord later.

---

## 8. Reconciliation items

- **Status vocabulary:** mass-management returns `unverified|verified|rejected`; `leaderboards.types.ts` uses `pending|verified|rejected`. Pick one canonical set (recommend `pending`) or document `unverified ≡ pending` as a stable contract so the frontend can normalize once.
- **Overrides survive identity/board moves (verify, then specify):** when `move-user` merges a runner or a game/category reassignment moves runs, do verdicts, `run_flags`, and placements follow? Exclusion *rules* are keyed `(user, game[, category])` — after a game reassignment, do they re-target the new game id, or silently stop matching? Define and test this; the vision requires overrides to ride along and the boards to recompute.
- **Redis cache on writes:** confirm whether `exclude/include/verdict/placement` writes flush the Redis leaderboard build or rely on the 1h TTL. Placements in particular **must** be reflected in the cached board immediately.
- **Preview rank deltas use RT ordering** for all categories (known mass-management follow-up). Placements make GT-primary boards more common — fixing GT ranks in preview rises in priority.

---

## Build order

1. **Manual placements** (§1) + board-compute + preview — unblocks the headline use case and vision P2.
2. **Bulk verify/reject verdicts** (§2).
3. **Triage queue + ingest flags + policies** (§3, §4).
4. **Self-service + trust** (§5).
5. **Reporting + appeals + notifications** (§6, §7).

§8 reconciliation items are small and can land alongside whichever phase touches them — but verify the move-user/reassignment override-carry behavior **before** placements ship, since a merge that drops placements would silently corrupt a board.
