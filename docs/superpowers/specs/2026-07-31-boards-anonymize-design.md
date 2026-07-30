# Boards curation: Anonymize action — design

Date: 2026-07-31 · Branch: `mod-console-redesign` · Status: approved

## Goal

Admins can anonymize a runner directly from the board-curation table
(`app/(new-layout)/games-v2/[game]/manage/boards/`), alongside the existing
Remove and Ban actions. Anonymize is the site-wide ban with
`runTreatment: 'anonymize'`: the account is banned (login refused, profile
404s, removed from search and /live) but every run stays on every board and
still counts — the name renders publicly as `Anonymous Runner <id>` with
avatar/country nulled.

Frontend-only. The backend feature is complete and deployed
(`POST /admin/bans`, `DELETE /admin/bans/{id}`, admin-gated via
`confirmPermission(admin, 'moderate', 'admins')`).

## Decisions (settled with Joey)

- **Admins only.** No backend permission change. Game moderators never see
  the button.
- **Separate button**, not an escalation option inside the existing
  game-scoped Ban dialog. The action cluster (Later / Remove / Ban /
  Fix time / Move…) is otherwise unchanged.
- Hidden for guest rows (`row.userId == null` — no account to ban).

## Design

### Gating

The boards page (server component) computes
`canSiteBan = ability.can('moderate', 'admins')` — true only for the global
`admin` role, which CASL grants every action/subject pair — and threads the
boolean through `BoardCuration` → `RowActions`.

### Action

New server action `anonymize.action.ts` in
`manage/moderation/shared/actions/` following the shape of
`exclude.action.ts`:

- `anonymizeRunnerAction(gameSlug, { username, reason })` →
  `apiFetch('/admin/bans', { method: 'POST', sessionId, body:
  { username, reason, runTreatment: 'anonymize' } })`. Returns the created
  ban `id` (needed for undo) or `{ error }`.
- `liftBanAction(banId, liftReason)` →
  `DELETE /admin/bans/{banId}` with a `liftReason` body — used only by the
  undo toast, with a canned reason ("Undone from board curation").
- Both revalidate this game's leaderboard cache tags (same tags the exclude
  action invalidates). Cross-game public caches are the backend's job — it
  already enqueues leaderboard rebuilds and Algolia/live-run cleanup.

### UI

`RowActions` gains an "Anonymize" button, rendered only when
`canSiteBan && !isGuest`, disabled under the cluster's shared `busy` flag.
It opens a `BoardDialog` (same pattern as Ban):

- Copy states the blast radius plainly: site-wide, account banned, name
  masked as Anonymous Runner on all public boards of all games, runs stay
  and still count. Notes that this curation table keeps showing the real
  name (mod views are deliberately unmasked backend-side).
- Reason: required textarea.
- Confirm → action → success: close dialog, `onMutated()` reload, undo
  toast via `fireUndoToast` that calls `liftBanAction`.

### Errors

Backend refusals surface as toast/dialog errors verbatim: self-ban, target
is an admin, an active ban already exists (partial unique index — one
active ban per user).

### Testing

Component tests next to the existing ones (`row-actions.test.tsx` /
separate `anonymize` test file): button hidden for non-admins and guests,
dialog requires a reason, confirm calls the action with
`runTreatment: 'anonymize'` payload, error path renders, undo calls lift
with the ban id.

## Out of scope

- Any mod-facing anonymize (game-scoped mask, request/approval queue) —
  explicitly rejected during brainstorming.
- An `/admin/bans` management page (list/lift UI). Undo toast is the only
  lift surface for now.
- Rework of the existing Remove/Ban actions.
