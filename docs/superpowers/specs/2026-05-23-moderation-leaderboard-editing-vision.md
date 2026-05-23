# Moderation & Leaderboard Editing — Vision

**Date:** 2026-05-23
**Status:** Vision — north star for the moderation/editing system. Individual phases get their own design + plan.

---

## 1. The problem

therun.gg leaderboards are built from **auto-ingested** data. A runner's timer (LiveSplit et al.) uploads splits; the backend turns finished attempts into `finished_runs`, and each board slice shows a runner's best eligible run. Nobody curates the input. That means the boards carry a constant, high-volume stream of *wrong* runs:

- **Mislabeled** — wrong game name, wrong category, wrong timing method (RT logged as GT).
- **Garbage times** — fat-fingered splits, paused-timer artifacts, joke runs, 00:00:01 "runs."
- **Impossible times** — faster than the known world record, negative, sub-minimum.
- **Duplicates** — the same attempt uploaded many times, or copy-pasted across accounts.
- **Cheating** — spliced VODs, TAS, time manipulation.
- **Stale identity** — a guest run that's really an existing user; a renamed runner.

The volume is the defining constraint: **there will always be far more wrong runs than a moderator can hand-inspect.** A good system therefore has to (a) surface what's likely wrong instead of making mods hunt, (b) let one action fix many runs, (c) let runners correct their own data without a mod in the loop, and (d) never destroy the underlying facts, because cleanup at this volume *will* sometimes be wrong and must be reversible.

### What exists today

The platform already has the right instincts, scattered across single-purpose tools:

| Capability | Mechanism | Scope |
|---|---|---|
| Reject one run | `POST /v1/leaderboards/reject/{runId}` (auto-promotes runner's next-best via `nextRunIdForUser`) | one run |
| Exclude a runner | `POST /admin/exclusions` (`type=user`, optional game/category scope); materialized `excluded` flag | one user, admin-only |
| Hide impossibly-fast times | Per-category **minimum time**; runs below are flagged/hidden | one board slice |
| Verification | `verificationStatus: pending \| verified \| rejected`; `requireVideo` / `requireVideoTopN` on categories | per run / per category |
| Merge wrong-named games/categories | **Reassignment** — preview → async execute → poll → **undo**, with an undo log | bulk, board-admin+ |
| Reassign a runner's identity | `POST /admin/move-user {from, to}` | one identity |
| **Bulk exclude / include runs** | **Mass-management** (shipped) — `/leaderboards/games/{id}/{exclude,include,preview}`; *rule* (user→game or user→category, covers future uploads) or *ad-hoc* `runIds[]`; blast-radius preview with rank deltas; reason-required; client-side undo via the mod-actions feed | bulk, per-game mod |
| Audit | `logs` table (`action`, `entity`, `target`, `data`); per-game feed via `/leaderboards/games/{id}/mod-actions` | platform-wide |

Since this list was first drafted, the backend shipped a **mass-management** layer (`docs/frontend-guide-leaderboard-mod-mass-management.md`): per-game mods can now bulk-exclude/include runs — by declarative *rule* (which also covers future uploads) or by ad-hoc `runIds` — with a blast-radius preview, mandatory reasons, a per-game audit feed, and client-side undo. That closes the "bulk remove wrong runs" gap and validates this vision's bulk-first, preview-then-undo, audit-everything stance — the frontend just has to wire it up.

What remains genuinely missing — the rest of this document — is: **a way to assert a leaderboard time that isn't backed by a `finished_run`** (the "their real time is 35:48" case), **bulk *verify/reject verdicts* beyond plain exclusion**, **a triage queue that surfaces likely-bad runs instead of making mods hunt**, **self-service for runners**, and **community reporting / appeals / notifications.** The admin-exclusions guide's reference to "the leaderboard mod queue" still points at something unbuilt; this vision specifies it.

---

## 2. Principles

These are the non-negotiables every phase must honor.

1. **Raw runs are immutable facts; moderation is a layer on top.** A `finished_run` records "this timer uploaded this time at this moment." We never edit or delete it to moderate. Instead we attach *verdicts* and *manual times* that change how the board interprets the raw data. (This is exactly how exclusions already work — the row stays, an `excluded` flag is materialized.)
2. **Everything is reversible.** Every moderation action is a record. Undo deletes/deactivates the record and the board recomputes. Bulk actions undo as a unit. (This is exactly how reassignment already works.)
3. **Everything is audited.** Who, what, when, why — written to `logs`, surfaced to mods, and the runner-visible slice of it surfaced to the runner.
4. **Bulk is the default.** Single-run moderation is just "bulk of one." Every action takes a *set* of targets — an explicit list, or a filter/query that resolves to a set.
5. **Trust-tiered self-service.** The corrections with no abuse incentive (lowering your own time, hiding your own junk) happen instantly with no mod. The abusable ones (claiming a *faster* time) appear immediately but marked and queued for confirmation.
6. **Surface, don't hunt.** Board policies and anomaly heuristics push likely-wrong runs into a triage queue. Mods work a curated, prioritized feed, not raw boards.
7. **A leaderboard position is a decision with provenance.** It can come from a real run or a manually-asserted time. Every entry knows which, who decided it, and why.

---

## 3. Core model — the leaderboard is a derivation

Define the leaderboard as a **pure function** of the raw `finished_runs` plus a small set of moderation records that either **filter** those runs or **add** a candidate time. The board is always recomputed from current inputs — there is no separate "standings" state to keep in sync. Nothing else moves a runner on a board.

For a board *slice* — `(game, category, subcategoryKey, timing)` — a runner's effective entry is the **fastest surviving candidate**:

```
effective_entry(runner, slice) = min time over CANDIDATES, where
  CANDIDATES = { r in finished_runs(runner, slice) : eligible(r) }   # surviving raw runs
             ∪ { m in manual_times(runner, slice) }                  # asserted times
  eligible(r) = NOT rejected
              AND runner NOT excluded from this scope
              AND r passes the board's standing policies (minimum, etc.)
```

No "mode," no `effectiveFrom`, no supersession state, no "pinned vs ceiling." The board is just the `min` over surviving candidates, recomputed on demand. Everything the brief asks for emerges from this (§4): a verdict/exclusion **removes** a candidate, a manual time **adds** one, and a later faster eligible run wins the `min` on its own.

The model has exactly **four moderation record types** — three that *filter* runs (verdict, exclusion, policy) and one that *adds* a candidate (manual time). Everything else in this document — queue, bulk, self-service, reporting — is just a way of *creating, previewing, and undoing* these four records. Each record shares a common envelope:

```
{ id, active, scope, createdBy, createdAt, reason,
  source: 'mod' | 'self' | 'system',   // who/what created it
  batchId?: string }                    // groups bulk actions for undo
```

### 3a. Run verdict — per `runId`

`verified | rejected | pending`. Generalizes today's reject and the existing `verificationStatus`.

- **rejected** → run is removed from board math (runner's next-best promotes; the backend already computes this).
- **verified** → a positive assertion. Satisfies `requireVideo`, and immunizes the run against auto-flags re-queuing it.
- **pending** → default for ingested runs; eligible for the board but flaggable.

A verdict never deletes the run. `rejected` is reversible (`unreject`) — restoring it to board math.

**Two removal paths, reconciled.** A run leaves the board two ways today: `verification_status = 'rejected'` (the verdict) and `excluded = true` with `ineligible_reason = 'mod_override'` (what shipped mass-management flips in bulk). Both fail the eligibility predicate (`excluded=false AND verification_status<>'rejected'`). The vision uses **exclude as the bulk-removal path** (it has preview, undo, and rule-cascade today) and **reject as the single-run, promotion-aware path** — bulk *reject* verdicts are a later addition (§10). Vocabulary differs across endpoints: mass-management returns `unverified | verified | rejected`; `leaderboards.types.ts` uses `pending | verified | rejected`. Treat `unverified` ≡ `pending` and normalize at the types boundary.

### 3b. Runner exclusion — per `(user, scope)`

`scope ∈ {global, game, category}`. Removes a runner from a board scope wholesale (cheaters, banned users). This has a **shipped, two-shape implementation** — match it rather than reinventing:

- **Rule** (declarative, future-proof): an `exclusion_rules` row — *user→game* or *user→category*. The backend cascades `excluded=true` to every matching run now **and to future uploads.** Deleting the rule un-propagates (except where another rule still covers a row). This is today's `/admin/exclusions` `type=user`, except per-game mods now manage the game/category-scoped variants themselves via `/leaderboards/games/{id}/exclude` (rule form); global rules stay admin-only.
- **Ad-hoc** (snapshot): flip `excluded=true` on a specific set of `runIds`. Future runs unaffected. This is the bulk run-removal primitive, and where arbitrary "these specific rows are wrong" selections land.

The UI infers the shape from the selection (all-one-user-one-category → category rule; all-one-user-many-categories → game rule; mixed → ad-hoc only). The `type=run/game/category` admin exclusions remain for their niche uses.

### 3c. Manual time — per `(runner, slice, timing)` ★

**This is the new primitive that makes "adjust a leaderboard time" possible** — and it's deliberately dumb. A manual time is just **one more candidate** in the `min`, asserted by a mod or runner, that *need not correspond to any `finished_run`.*

```
{ ...envelope,
  runnerRef:   { userId } | { guestName },
  slice:       { gameId, categoryId, subcategoryKey, timing },
  time:        ms,
  evidenceUrl?:  string,            // optional VOD/proof
  verification:  'pending' | 'verified' | 'rejected' }   // self-claims start pending; mod-added = verified
```

No `mode`, no `effectiveFrom`, no "supersede" flag. A manual time can only ever **win the `min` by being the fastest surviving candidate** — it never raises a runner's time and never deletes a run. The behaviors my earlier draft modeled as "ceiling" and "pinned" are unnecessary:

- *"Count 35:48 until they beat it"* → add a 35:48 manual time. A later faster eligible run wins the `min` on its own; a slower one doesn't. **Supersession is emergent, not tracked state.**
- *"Ignore their (fake) faster runs"* → that's an **exclusion** (§3b) — the one mechanism that removes candidates. Don't invent a second way to make a run "not count."

So a manual time is purely additive; making a runner *slower* is always done by excluding the faster (fake) run, never by a manual time. Manual times carry provenance + verification so a self-claim shows "unverified" until a mod confirms — a rejected manual time is simply dropped from the candidate set, exactly like a rejected run.

### 3d. Board policy — per slice or category

Declarative standing rules, evaluated **on ingest** so wrong runs are caught automatically. Generalizes today's minimum-time (which becomes the `minTime` policy). Examples: `minTime`, `maxTime`, `requireVideoTopN`, `autoFlagPbJumpPct`, `autoFlagFasterThanWrPct`. A policy either *auto-rejects* (high confidence: negative time, below a hard floor) or *creates a queue item* (needs human eyes).

---

## 4. The "adjust a leaderboard time" scenarios

The whole model exists to make these three concrete cases trivial. Working through the examples from the brief:

### Example A — "the 35:00 and the 35:30 are fake; the 35:45 they have is accurate"

The 35:45 already exists as a `finished_run`. Two equivalent paths, both one gesture:

- **Bulk reject** the 35:00 and 35:30 (select both → Reject). The 35:45 auto-promotes — reject already returns the promoted run.
- **Set authoritative run** → pick the 35:45 → the system rejects everything of theirs *faster than it* on the slice in one batch. (A convenience wrapper over bulk-reject for the common "their real PB is this row, kill everything above it" case.)

### Example B — "they have a 35:48 that isn't in `finished_runs`; count it; if they get a better run later, count that" ★

Two records, both from primitives we already have: **exclude** their existing (fake, faster) runs on the slice — §3b — and **add a 35:48 manual time** — §3c. The board is now `min({35:48})` = 35:48; no `finished_run` required. When they later upload an eligible run **under** 35:48, it joins the candidate set and wins the `min` automatically; a slower run doesn't. "Supersede if they get a better run later" isn't a feature we build — it's what `min` over current candidates *does*. And if that faster run is itself later rejected, the `min` recomputes and 35:48 returns — no reactivation logic.

### Example C — self-service "hey, my time is actually this"

Same primitives, created by the runner. To assert a *faster* real time with no run, they add a manual time; to disown a fake fast run, they exclude it (you can't make yourself slower by adding a time — you remove the faster thing). The **trust tier** (§6) gates only the abusable direction:

- Excluding/hiding your own run, or a manual time that *can't* improve your rank → instant.
- A manual time that would become your new (faster) board entry → appears immediately, marked "self-reported · unverified," and queued for confirmation. Evidence (VOD) required if the category requires video.

"That should just work, even if there is no finished run for that time" — it does: the manual time is just a candidate, no run needed.

---

## 5. Moderation surfaces — bulk-first

There is **one selection+action model** with three entry points. In all three: select targets (checkboxes, or "select all matching the current filter"), pick an action, **preview** the impact, confirm, and the action executes as one undoable batch — the same preview → confirm → execute → undo flow reassignment already uses. For **exclusion specifically, this flow is already wired on the backend** (`/exclude/preview` returns affected leaderboards + per-runner rank deltas; `/exclude` and `/include` mutate and log; undo is reconstructed from the mod-actions feed). The roster and runner lists below are likewise backed by shipped endpoints — what's *new* in §5 is the triage queue and the actions *beyond exclusion*.

### (1) Triage queue — the primary surface

`/(new-layout)/games-v2/[game]/manage/queue` per game, plus a global queue for board-admins/admins. A **prioritized feed of runs needing attention**, populated by board policies, anomaly heuristics, and user reports. Each item shows the run in context — runner, time, VOD, *why it was flagged*, and the runner's recent history — with one-tap verdicts. Keyboard-driven, multi-select, and an "apply to all N like this one" affordance (e.g. "reject all 40 sub-minimum runs in this category").

Flag sources:

| Flag | Heuristic |
|---|---|
| Below minimum / above maximum | board policy bounds |
| Impossible | negative, zero, or faster than the game's known WR by > X% |
| Sudden PB jump | improvement over runner's prior best > X% |
| Missing VOD | top-N where `requireVideo` is set, no `vodUrl` |
| Duplicate | identical time across runs/accounts |
| Fresh-account top time | new account lands in top-N |
| Reported | a user reported the run (§7) |
| Pending self-claim | a faster self-claimed manual time awaiting confirmation (§6) |

### (2) Board inline

On any leaderboard, mods get per-row checkboxes and a bulk action bar: Exclude · Verify · Reject · Set minimum here · Require VOD. Backed by `GET /leaderboards/games/{id}/categories/{categoryId}/eligible-runs` (filters: `subcategoryKey`, `verificationStatus`, `hasVod`, `runnerName`, `endedAfter/Before`; up to 2000 rows) — fetch the filtered roster, select, and pass the resulting `runIds` to `/exclude`. **Exclude is the shipped action**; bulk Verify/Reject verdicts are the §10 additions. This is where "these specific rows are fake" gets handled fast.

### (3) Runner view — "mass edit for one user"

`/(new-layout)/games-v2/[game]/manage/runner/[id]` (and a global variant). Backed by `GET /leaderboards/games/{id}/users/{userId}/eligible-runs` (includes live rank + total runners). Every run by one runner, with bulk actions across all of them: "exclude all of this runner's runs in this game" (ad-hoc or a game-scoped rule), "exclude from all boards," "their real time in X is T" (manual time). This is the direct answer to *"mass edit runs for one user."*

---

## 6. Self-service & trust tiers

Runners already have `edit run` on their own runs in CASL (`can(action, 'run', { run: user.username })`). Today there's no UI for it and no way to assert a time. The vision gives self-service a real surface (run page + profile) and gates each action by a **trust tier** so that "it just works" without opening a fake-WR hole.

| Action | Tier | Behavior |
|---|---|---|
| Reject / hide your own run | **Instant** | No abuse incentive — you're removing yourself. |
| Exclude yourself from a board | **Instant** | Same. |
| Manual time that can't improve your rank (slower than current) | **Instant** | Harmless — can't win the `min`. |
| Remove your own manual time | **Instant** | Board recomputes from runs. |
| Manual time that becomes your new (faster) entry | **Provisional** | Appears immediately, marked "self-reported · unverified," queued for mod confirm. Reversible. Evidence required if category requires video. |
| Un-reject your own previously-rejected run | **Provisional** | Same as above. |

A **trust signal** modulates where the provisional line sits — accounts with prior *verified* runs, long history, or Patreon status can auto-confirm faster claims; brand-new accounts always queue; **banned users get no self-service.** Mod confirmation of a provisional claim promotes it to `verified`; rejection removes it and may apply a trust penalty to deter spam.

**Guests** (runs with no `userId`) can't self-serve. Mods moderate them directly, and `move-user` folds a guest's runs into a claimed account (carrying overrides — see §7).

---

## 7. Edge cases

| Case | Resolution |
|---|---|
| **Guest runs** | No account → no self-service. Mods can reject/place/exclude by guest name. `move-user` merges guest → account and **re-evaluates** overrides onto the new identity. |
| **Identity merge / reassignment carries overrides** | When `move-user` or a game/category reassignment moves runs, their verdicts and manual times move with them and the affected boards recompute. (Reassignment already moves runs + has an undo log; overrides ride along.) |
| **Superseding run later rejected** | Nothing special — the board recomputes from current candidates, so dropping the faster run lets the manual time win the `min` again. No reactivation code. |
| **Manual time vs. a board minimum** | A run below the minimum is filtered out (ineligible). A **mod**-added manual time bypasses policies (explicit human authority, audited); a **self**-added one is subject to them (and to the trust gate), so a runner can't claim an impossible time. |
| **Per-timing manual times** | A manual time is per `timing`. Set an authoritative RT and leave GT derived from runs, or vice-versa. |
| **"Make me slower" is an exclusion, not a manual time** | Manual times only add candidates and can only lower a runner's `min`. Correcting a runner *down* (fake fast run; real time is slower) means **excluding the fake run**; the slower real run or manual time then wins. One mechanism for "doesn't count" (exclusion), one for "also consider this" (manual time). |
| **Combined / subcategory views** | Records live at the slice level; combined views recompute from slice-level records. |
| **Reject ≠ delete** | A rejected run stays in `finished_runs` (off-board). If the identical attempt re-uploads, dedup + the existing verdict keep it off the board. |
| **Concurrent edits / races** | Idempotent where possible; last-writer-wins otherwise; surface the backend's message verbatim (matches reassignment's `tombstone_race` handling). |
| **Cache invalidation** | Every batch invalidates all affected `lb:*` tags **and** flushes Redis via `POST /v1/leaderboards/invalidate-cache/{gameId}` (exclusions/reassignments already require this — it's not automatic). |
| **Bulk undo fidelity** | Undo of a batch restores the prior state exactly (records keyed by `batchId`). |
| **Report spam / abuse** | Reports are rate-limited, deduped per (reporter, run), and weighted by reporter trust; low-trust reports don't auto-flag, they aggregate. |
| **Appeals** | A runner can appeal a verdict → creates a queue item routed to mods (§8). |
| **Banned user keeps uploading** | New runs land `excluded=true` at ingest (already the behavior) — they never reach a board. |

---

## 8. Transparency, notifications & appeals

- **Per-run history** — `GET /v1/runs/{runId}/history` surfaces the verdict / manual-time timeline. The runner-visible slice ("rejected by a mod on May 3 — reason: spliced VOD; later beaten by your 35:12") shows on their run page.
- **Notifications** — any verdict or manual-time decision affecting a runner notifies them with the reason. The reject reason is *already* "shown to runner"; this generalizes it to all actions. Channel: in-app feed first (email/Discord later).
- **Appeals** — a one-click "appeal" on a runner-visible verdict opens a lightweight queue item. Keeps disputes in the system instead of in Twitch DMs.

---

## 9. Permissions

Built on the existing CASL mirror (`src/rbac/ability.ts`). Boards are already scopable per game via `moderatedGames` and the `{ game }` condition on `leaderboard`.

| Persona | Capabilities |
|---|---|
| **Runner (self)** | Self-service per §6 on own runs/manual times only. |
| **Per-game mod** (`moderatedGames`, `board-moderator` scoped) | Shipped gate is **`verify-reject-run` on the game** (same check as single-run verify/reject). *Already* grants bulk exclude/include + game/category-scoped exclusion rules for their games. Vision adds — same per-game gate — manual times, board policies, queue, and bulk verify/reject. Global exclusion stays board-admin+. |
| **board-admin** | All of the above globally + manage moderators + reassignment. |
| **admin** | Everything. |

CASL changes: the backend gate is `verify-reject-run` on a game; the frontend mirror expresses this as `edit`/`moderate` on `leaderboard`/`run` with a `{ game }` condition — keep that as the core gate and ensure it tracks `verify-reject-run`. Add a `place` action for manual times and a `moderation-queue` subject with `view`. The backend re-checks every endpoint regardless of UI gating.

---

## 10. Backend API (proposed)

The brief says any endpoint can be built. The detailed, build-ready backend ask lives in its companion doc, **`docs/superpowers/specs/2026-05-23-moderation-backend-requirements.md`** — read that for data models, request/response shapes, behavior, and edge cases. This section is the map.

### Already shipped — reuse, don't reinvent

The mass-management guide (`docs/frontend-guide-leaderboard-mod-mass-management.md`) is the contract for everything exclusion-shaped. All under `/leaderboards/games/{gameId}/...`, gated by `verify-reject-run`, with **plain-text error bodies** (don't `JSON.parse`):

- `GET .../users/{userId}/eligible-runs` — runner view (live rank + total runners).
- `GET .../categories/{categoryId}/eligible-runs` — roster with filters (`subcategoryKey`, `verificationStatus`, `hasVod`, `runnerName`, `endedAfter/Before`, `limit≤2000`).
- `GET .../exclusion-rules` · `DELETE .../exclusion-rules/{ruleId}` (body `{ reason }`).
- `GET .../mod-actions` — per-game audit feed (powers client-side undo).
- `POST .../exclude/preview` — blast radius (affected leaderboards, per-runner rank deltas, sample runs).
- `POST .../exclude` · `POST .../include` — rule or ad-hoc `runIds`; `reason` min 10 chars.

Single-run verify/reject (`/leaderboards/{verify,reject}/{runId}`), `move-user`, reassignment, and `invalidate-cache/{gameId}` also stay.

### To build (net-new) — what makes the vision real

Follow the shipped conventions — bearer auth, per-game `verify-reject-run` gate, a `preview` paired with every bulk mutation, mandatory reason, an audit row, and ad-hoc-vs-rule where it fits.

- **Manual times** ★ — `GET/POST/PUT/DELETE /leaderboards/games/{gameId}/manual-times` + `manual-times/preview`; **board-compute must add manual times to the candidate set** before the `min` (§3). A thin table of extra candidates — no modes, no supersession state. The headline ask; nothing else delivers the 35:48 case.
- **Bulk verify/reject verdicts** — `POST .../verdicts` + `.../verdicts/preview` `{ action:'verify'|'reject'|'unreject', runIds[], reason }`, promotion-aware. (Exclude already covers bulk *removal*; this adds bulk *verify* and promotion-aware *reject*.)
- **Triage queue + ingest flags** — `GET .../queue`; flag producers in the ingest path (`sync-runs-to-postgres`): impossible time, PB jump, missing-VOD-in-top-N, duplicate, fresh-account-top-N, reported, pending self-claim.
- **Board policies** — generalize `/minimums` into `.../policies` (`minTime`/`maxTime`/`requireVideoTopN`/auto-flag thresholds); the `below_minimum` ineligible_reason already exists.
- **Self-service** — `POST /v1/me/runs/{runId}/verdict`, `POST /v1/me/manual-times`; **trust tier enforced server-side.**
- **Reporting / appeals / notifications** — `POST /v1/reports`, `GET .../reports`; `POST /v1/runs/{runId}/appeal`; emit a notification on every verdict/manual-time decision; `GET /v1/runs/{runId}/history` for transparency.

---

## 11. Phased rollout

The vision is the end state. Each phase ships independently, top-to-bottom in value-per-effort.

- **P1 — Wire up shipped bulk exclusion (frontend-only).** Roster + runner views, multi-select with rule-shape suggestion, the blast-radius preview sheet, the per-game audit feed, and 24h client-side undo — all against endpoints that **already exist**. Highest value-per-effort: it's the "mass edit for many or one user" need, and the backend is done.
- **P2 — Manual times.** A thin candidate-time table + board-compute integration (new backend + UI). Answers the 35:48 case and "adjust a leaderboard time." The true novel core of the vision.
- **P3 — Bulk verify/reject verdicts.** Extend the bulk model from exclude-only to verify and promotion-aware reject.
- **P4 — Triage & auto-flag.** The queue + ingest-time anomaly heuristics + minimums-as-policies. Answers "a LOT of wrong runs" and "super easy to manage."
- **P5 — Self-service & community.** Trust-tiered self verdicts/claims + reporting + appeals + notifications.

Each phase gets its own `docs/superpowers/specs/` design and a `docs/superpowers/plans/` implementation plan before any code.

---

## 12. Success criteria

- A mod can clear a category of obviously-wrong runs in **one preview-confirm**, not dozens of clicks — and undo it if they overreached.
- A runner can fix their own board time — including a time with no `finished_run` — without contacting anyone, and a faster claim is visibly provisional until confirmed.
- The set of wrong runs a mod must look at is a **curated queue**, not the whole board.
- No moderation action ever destroys raw data, and every one is reversible and attributable.
- Setting "their real time is 35:45 / 35:48" is a single, obvious gesture in all three forms (exclude-the-fakes, add a manual time, self-claim).
