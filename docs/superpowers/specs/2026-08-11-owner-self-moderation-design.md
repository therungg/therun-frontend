# Owner self-moderation on games-v2 boards — design

Date: 2026-08-11. Status: approved by Joey (conversation), pre-implementation.

## Problem

A runner has no way to manage their own run on a games-v2 leaderboard beyond the run
page's "Hide my run" / "Correct this time". Mods have a full toolkit (remove wizard,
move, hide identity). Runners should get the same flows for their own runs.

## Decisions (made with Joey)

- **Hide identity is a board-level privacy toggle**, not a per-run anonymize: a
  user-scope anonymize rule for the game, covering current and future runs there.
- **Owner-move re-verifies**: a run moved by its owner enters the target category as
  pending, never carries verified status over.
- **Owner actions are logged** to the moderation log with actor = the runner, visible
  to mods, undoable via existing mechanisms where applicable.
- **Backend shape: extend the `/v1/me` self-service family** (precedent:
  `POST /v1/me/runs/{runId}/verdict`, `/v1/me/manual-times`). No "or owner" branches
  inside `requireMod` on mod routes.
- **Frontend surface: own row gets the mods' entry point** — a button on your own
  board row opening the run inspector drawer in owner mode, plus the same verbs on
  the run detail page.

## Backend

All new handlers live in `src/api/me/` and follow the existing self-service gate
order: session → `isBanned(callerId)` → load run → `run.userId === callerId` →
verb-specific validation. Routes must ride the existing `/v1/me` dispatch in
`api-entry.ts`/`me/handler.ts` — the `api` CFN stack is at 499/500 resources, so no
new API Gateway resources may be added; verify with `cdk synth api` before deploy.

### 1. Remove (exists, extended)

- Quiet remove = existing `POST /v1/me/runs/{runId}/verdict` (`self_reject_run`).
- **Set time**: existing `POST /v1/me/manual-times` (self manual time), used by the
  wizard as the replacement time.
- **Select run**: the wizard needs the runner's other eligible runs. Add an owner
  variant of the eligible-runs lookup under `/v1/me` (mods use
  `loadUserEligibleRunsAction`, mod-gated). Promotion semantics = same as the mod
  wizard: chosen run stands, faster runs than it are self-rejected in the same
  request (cascade computed and shown in the UI, as in the mod flow).
- Restore = existing self-unreject (trust-tiered: instant vs provisional).

### 2. Move — `POST /v1/me/runs/{runId}/move`

- Body: `{ toCategoryId, subcategoryKey? }`, validated like the mod move
  (`run-mgmt-handler.ts handleMoveRun`) minus the permission check.
- After move, run status is forced to **pending** in the target category
  (re-verification), regardless of prior status. If the target category has
  auto-verify policies, they apply as they would to a fresh submission.
- Mod-log action `self_move_run` with the same before/after diff shape as
  `move_run`.

### 3. Hide identity — self-anonymize

- `POST /v1/me/anonymize` body `{ gameId }`: creates a **user-scope anonymize rule**
  `{ type: 'user', gameId, categoryId: null }` via the existing
  `anonymize-service`, flagged as self-applied (e.g. `extra.selfApplied: true` on
  the rule/log). Reuses `runAnonymizeInvalidation` (awaited) — derived caches bake
  identity.
- `DELETE /v1/me/anonymize` body `{ gameId }`: soft-lifts the rule **only if it was
  self-applied**. Mod/admin-applied rules remain admin-liftable only (existing
  rule). Same anon number is reused on re-apply (existing idempotent anonId).
- Mod-log actions `self_anonymize_apply` / `self_anonymize_lift`.

### 4. Logging vocabulary fix (included in scope)

Existing self verbs (`self_reject_run`, `self_unreject_run`,
`self_create_manual_time`, `self_delete_manual_time`) bypass `MOD_LOG_ACTIONS` and
insert into `logs` ad hoc, so feed/public-log renderers don't know them. All self
actions (existing + new) get added to `MOD_LOG_ACTIONS` and to the renderers
(`describe-log-action`, mod feed, public log), written via `writeModLog` with
identity only under `data.subject` (redaction contract).

### 5. Guardrails

- `isBanned` blocks everything.
- `evaluateTrust` applies where the existing family uses it (restore/unreject:
  instant vs provisional). Remove, move, hide identity do not need trust gating —
  they only reduce the runner's own presence — but move re-verification is itself
  the guardrail against category-shopping.

## Frontend

### Surfaces

- **Board row**: when `isSameRunner(sessionUsername, entry.runnerName)` (prefer
  `entry.userId` join where present; anonymized rows have `userId: null`), the row
  shows the Manage entry point even without `canManage`. Opens `RunInspector` in
  **owner mode**.
- **Run inspector owner mode** (`asOwner` prop): verb bar restricted to Remove;
  secondary bar shows Move… and Hide identity…; no Verify/Unverify/Ban/Adjust
  time-of-others; copy switches to self-serve ("your run", "your identity on this
  board"). `RunActionForm` gets the same `asOwner` restriction: remove-only verbs,
  runner-scope step omitted (no self-ban), set time / select run kept.
- **Run detail page** (`run-view/run-actions.tsx`): gains Move… and Hide identity…
  next to the existing owner verbs, using the same dialogs.

### Actions / fetch layer

New owner server actions in `src/actions/run-user-actions.action.ts` shape
(session-only, backend enforces ownership) calling new fetchers in
`src/lib/moderation/self-service.ts` (`meFetch('/v1/me/…')`). No `canModerateGame`
gate. After mutation, same board revalidation the mod actions use.

### Gating notes

- games-v2 is still admin-gated at the page level (`page.tsx` notFound unless
  admin) — owner controls ship behind that same gate and become publicly visible
  when the page gate lifts; no extra work needed here.
- Mods who are also the runner see the union (mod surface already covers all owner
  verbs; owner mode only renders when `!canManage`).

## Error handling

- Backend returns the self-service family's existing error shapes (`forbidden("not
  your run")`, ban → forbidden, validation 400s). Frontend surfaces them through the
  existing dialog error states (`ModError` equivalent on `meFetch`).
- Anonymize apply/lift awaits cache invalidation before returning, as the mod path
  does.

## Testing

- Backend: unit tests per handler (owner check, banned, wrong owner, move
  status-reset, self-lift refuses mod-applied rule), following the existing
  `me/` handler tests.
- Frontend: `run-action-dialog.test.tsx`-style tests for owner mode (verb
  restriction, no runner-scope step), plus action-model tests for any new
  vocabulary. Browser pass by Joey.

## Out of scope

- Lifting the games-v2 admin page gate.
- Owner verify/unverify of own runs (stays self-reject/unreject semantics).
- Per-run owner anonymize (Joey chose the board-level toggle).
