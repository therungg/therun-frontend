# Board moderation — design & plan (2026-08-05)

Status: agreed design, largely built 2026-08-06. Backend branch stack (unpushed,
migration 0086 unapplied): `board-mod-unified-log` (A) → `board-mod-unverify` (D)
→ `board-mod-anonymize` (C rules/resolver) → `board-mod-anonymize-sweep` (in
flight). Frontend branch stack (pushed to origin): `board-bulk-select` (B) →
`board-mod-public-log` (F) → `board-mod-runner-panel` (E). Deploy order: frontend
reason-field absorption (in B) must ship before or with the backend push (backend
push = auto-deploy + migration). Remaining: anonymize UI, backend follow-up
(actor usernames in HistoryEvent, excluded-vs-rejected split on RunDetail,
provenance flags on LeaderboardEntry), console retreat, games-v2 gate lift.
Visual design approved 2026-08-06 — mocks in
`docs/plans/2026-08-05-board-moderation-mocks.html` (all seven states). Approved
interpretations from the mocks, now canon:

- Ban entries in the public log **name the banned runner**; only *anonymized*
  runners are redacted. A "Moderator view" toggle reveals redacted identities.
- Pending runs appear **inline on the board** (amber spine, provisional rank,
  inline Verify/Reject) — the queue stays its own surface, but a single pending
  run doesn't force a detour.
- Verbs are **disabled-with-reason, never hidden** when inapplicable.
- Provenance cue in the trailing cell; tombstone desaturates the page (time keeps
  its numeral, marked "Not ranked"); runner panel shares the board's checkbox
  column and bulk bar.

Spans both repos; backend work items are marked **[backend]**.

## Goal

Moderation happens **on the board itself**. For any run, anyone can see why it is there
and what happened to it. Mods can act on one or many runs/runners without the action
list turning into a combinatorial mess.

## Decisions (locked with Joey)

- **Audience:** game mods only for v1. The single `verify-reject-run` permission gates
  every verb — no per-verb tiers. Site-scope actions stay admin-only as today.
- **Transparency:** run history and the game's moderation log are **fully public**.
  Removing is always transparent: removed runs keep a reachable tombstone run page
  ("Removed by X on date: reason") and a log entry. No ban badge on user profiles.
- **Every action requires a reason** and lands in the visible log.
- **Ban (board/game scope) strips all existing runs and is reversible** — lifting the
  ban restores them. (The existing `exclusion_rules` model already does exactly this.)
- **Anonymize is a distinct verb**, not a ban flavor: the run/results stay on the
  board, the identity is hidden **from the public, permanently**. Mods always still
  see the real identity (they need it to enforce). Scopes: a single run or a
  user-within-game (game mods), and **user-global** (admins only) — for
  serious-abuse cases or on the runner's request.
- **Set time** covers both correcting an existing run and entering a run on behalf of
  a runner — including **unclaimed runners** (already supported).
- **Move** is within-game only: the "submitted to the wrong category" repair.
- **Verification queue is out of scope** — it stays its own surface.
- **Board is *the* moderation surface.** The console retreats to config/setup; setup
  embeds the same board view rather than a parallel curation UI.
- **Read-your-writes:** every mutation must be visible immediately
  (`updateTag`, never `revalidateTag`, on the mod path).

## The model: verbs × subject × scope

Don't build N bulk actions. Build a small verb set where subject and scope are
parameters. The UI is: select rows (or a runner) → one action panel that adapts.

| Verb | Subject | Scope | Backing today |
|---|---|---|---|
| verify / reject / restore | run(s) | — | `mod-verdicts-handler` (bulk, with preview) ✓ |
| remove / restore | run(s) | — | `exclude`/`include` (bulk, preview) ✓ |
| ban / unban | runner | board (category) / game | `exclusion_rules` type=user with scope ✓ |
| set / adjust time | run, or runner (new run) | — | manual-times layer ✓ (see verb reconciliation) |
| move | run(s) | within game | `run_board_overrides` ✓ |
| anonymize | run(s) or runner | game (mods) / global (admin) | **new** (site-ban `runTreatment: anonymize` exists but is coupled to banning) |
| mark for later | run(s) | — | `marks` ✓ |

## What already exists (survey 2026-08-05)

~70% of the primitives are built:

- Public board row menu (`leaderboard/row-actions-menu.tsx`) already carries approve,
  remove/restore, move, adjust/set time, runner ban (board/game/site), mark — reusing
  console dialogs via `load-mod-board-context.action.ts` (lazy mod payload) and
  `mod-row.ts` (public entry → roster row adapter). **Extend these, never fork them.**
- Multi-select + bulk bar exist only in `manage/boards/board-curation.tsx`
  (`selectedRunIds`, bulk accept, bulk ban with per-user preview).
- Backend bulk endpoints all take `runIds[]` and have `/preview` variants
  (`mod-mass-handler.ts`, `mod-verdicts-handler.ts`).
- Public run history: `GET /v1/runs/{id}/history` + `run-history-list.tsx`;
  mod provenance panel on the run page.
- Runner dossier: `manage/moderation/runner/[userId]` with `?from=board` return.

## The real gaps (the plan's substance)

### A. Unified moderation event log **[backend]** — the foundation

Today three audit surfaces disagree: `logs` (read by the feed), `auditLog`
(bulk-verify/reject, edit, move — **invisible in the feed**), plus purpose-built
history tables. `list-mod-actions.ts` whitelists 8 actions from `logs` only.
"Fully public and transparent" is impossible on this substrate.

Work:
1. Pick `logs` as the single write path for all mod verbs (it's what run history
   already reads). Migrate the four `auditLog` writers (bulk-verify, bulk-reject,
   edit-run, move-run) to also/instead write `logs` rows with structured `data`.
   Backfill is optional; the feed being complete *going forward* is the requirement.
2. Extend `list-mod-actions.ts` to cover the full verb set (verdicts, time
   edits/manual times, moves, bans, anonymize) — drop the whitelist in favor of a
   deny-list of noise actions.
3. Public per-game mod-log endpoint: **ride an existing route with body/query
   dispatch — the `api` CFN stack has ONE resource slot left; a new route costs 2
   and breaks the deploy.** The existing public `/v1/runs/{id}/history` pattern is
   the template; a `/v1/leaderboards/games/{id}` sub-path likely already exists to
   ride.
4. Every log row needs `reason` (make it required at the handler for all verbs) and
   enough structure for the redaction pass (below) to strip identity.

### B. Board multi-select + bulk action bar (frontend)

Port BoardCuration's selection machinery to the public board table, mods only:

- Checkbox column on `leaderboard-row.tsx` (rendered only when `canManageRuns`),
  shift-click range select, "select all by this runner" affordance on a row.
- Sticky bulk bar when selection is non-empty: the verb set, adapting to selection
  (mixed-runner selection disables runner-scoped verbs; single-runner selection
  offers "ban runner…" with scope choice).
- Every destructive/bulk verb goes **preview → confirm → apply**, using the existing
  `/preview` endpoints (copy the plan/apply shape from setup step 4's bulk config).
- Reason field is part of the confirm step, required.
- Apply → `updateTag` the board tags (extend `revalidate-boards.ts` helper) so the
  mod sees the result instantly.

### C. Anonymize as a first-class verb **[backend + frontend]**

- New scoped record (mirror the `exclusion_rules` shape: `type: run | user`,
  `targetId`, optional `gameId`/`categoryId` scope — **NULL scope = global**,
  reason, createdBy, createdAt). Game mods create run- and user-in-game-scoped
  rows; **global (NULL-scope) rows are admin-only** — enforce at the handler, and
  note this is distinct from the site-ban `runTreatment: anonymize` path (that one
  is coupled to banning; this verb anonymizes without touching board membership).
  Permanent by design; a lift path can exist but admin-only, as a safety valve.
- Global scope means the redaction resolution step runs on **every** public
  identity read site-wide, not just games-v2 — profile pages, global recent PBs,
  search. One shared resolver, applied per-surface.
- **Public-only redaction, resolved at read time in one place.** All public reads
  that surface runner identity go through a single resolution step that swaps in a
  stable placeholder ("Anonymous runner #NNNN", keyed per user+game) so an anonymous
  runner's runs still group into one PB line and can't farm extra board slots.
  Surfaces to cover: board rows, run detail, public run history, public mod log,
  recent PBs, standings, WR history, search. Mod-context reads bypass redaction.
- The public mod log shows the *event* ("a runner was banned from this game:
  [reason]") with the identity redacted; the mod view shows the name.

### D. Verb reconciliation **[backend handoff, mostly]**

The frontend deliberately uses reversible layers (manual-time overlay, board
overrides) while true edit/move handlers exist unused. Keep the layers — they are
what makes reversibility cheap — but:

1. Make the layers **legible in history**: manual-time and board-override
   set/clear must produce clear public log entries ("time corrected 1:23.45 →
   1:22.90 by X: reason").
2. Add `unverify` (verified → pending) — the one missing inverse, already
   documented in `docs/backend-handoffs-leaderboard-ux.md` §3.
3. Decide the fate of the unused true-edit/true-move handlers (likely: keep for
   admin repair, don't surface).

### E. Runner-scope mass management

The runner dossier (reachable from any board row) becomes the "everything about
this runner in this game" surface: all their runs across the game's boards, ban
state per scope, one-click ban/unban with preview of affected runs, anonymize,
and their slice of the mod log. Most of `runner-model.ts` exists; add the
cross-board run list + bulk verbs.

### F. Public transparency surfaces (frontend)

- **Per-game mod log**: public page/tab on the board (e.g. a "Moderation" view next
  to the existing view tabs), fed by the unified feed. Filterable by verb/runner.
- **Run tombstones**: removed/rejected runs keep their run page, greyed, with the
  event that removed them front and center. (Run pages already exist; this is
  state-rendering, not new routes.)
- **Board-row provenance cue**: subtle marker on rows that have history (moved,
  time-corrected, restored) opening the existing history dialog.

## Sequencing

1. **A** (unified log) — everything else renders from it; do this first.
2. **B** (multi-select + bulk bar) — pure frontend against existing endpoints; can
   run in parallel with A.
3. **F** (public log + tombstones) — needs A.
4. **C** (anonymize) — needs A for redaction of the log; biggest new backend piece.
5. **D** (unverify + history legibility) — with A's writer migration.
6. **E** (dossier mass management) — last; composes the above.
7. Console retreat: point setup's board step at the real board view; retire
   BoardCuration once B reaches parity (selection, bulk, pending cells, add-runner).

## Constraints & traps (from memory / survey)

- `api` CFN stack is at 499/500 resources — **no new API Gateway routes**; body/query
  dispatch on existing paths only.
- games-v2 is admin-gated (`page.tsx:32`) — all of this ships dark until the gate lifts.
- RBAC cache (`role:*`, 300s Redis) delays grant/revoke visibility.
- Frontend CASL can't see the 9-role backend hierarchy — fine for v1 (single
  permission), blocks per-verb tiers later.
- `updateTag` not `revalidateTag` for the mod's own mutations (read-your-writes).
- Backend bulk responses return `affectedLeaderboards` — keep using it for targeted
  invalidation.
