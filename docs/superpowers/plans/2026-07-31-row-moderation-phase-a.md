# Row Moderation Model — Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the board-curation row cluster to `Remove · Run… · Runner…` — Run… holds Approve/Move/Adjust (Adjust = pick-the-valid-run with exclusion preview, or set a time), Runner… holds scope×effect moderation (Remove runs at board/game scope; site ban with treatment choice for admins). Later, Ban, Anonymize, and Fix time disappear as separate buttons.

**Architecture:** Frontend-only (Phase A of `docs/superpowers/specs/2026-07-31-row-moderation-model-design.md`). Two new dialog components in `manage/boards/` composed from existing server actions; the site-ban server action generalizes to take a treatment; `RowActions` shrinks to three entry points plus the popover menu pattern already used by `board-controls`.

**Tech Stack:** Next.js 16 App Router, React 19, vitest + @testing-library/react (jsdom), react-toastify.

**Spec:** `docs/superpowers/specs/2026-07-31-row-moderation-model-design.md`

## Global Constraints

- Repo `/home/joey/therun/therun-fr`, branch `mod-console-redesign`. NEVER push to main; do not open PRs. Do NOT touch `/home/joey/therun/therun`.
- `next-env.d.ts` is dirty in the working tree — never stage or commit it.
- Biome formatting (4-space indent, single quotes, trailing commas, semicolons) via husky pre-commit hook — if it rewrites staged files, re-stage and commit again.
- `npm run typecheck` has ~356 pre-existing errors repo-wide; gate on NEW errors mentioning touched files only.
- Dialog copy is exact as written per task — do not paraphrase. Em dashes and curly quotes/apostrophes as written.
- Guests (`row.userId == null`): no Runner… dialog, no pick-valid-run; they keep Remove/Approve/Move and "Set a time".
- The mark-for-later BACKEND flag, the toolbar "marked only" filter, bulk-accept, and the pin icon in `board-curation.tsx` all stay — ONLY the row's Later button (and its state/handlers in `row-actions.tsx`) is removed.
- Board scope = `categoryId` rule scope. On categories WITH subcategory variables it covers all sibling subcategory boards — the dialog says so (exact single-board scope arrives in Phase B).

## Shared contracts (verified against the codebase 2026-07-31)

- `excludeAction(gameSlug, input)` / `previewExcludeAction(gameSlug, target)` from `../moderation/shared/actions/exclude.action`; `ExcludeTarget = { runIds: number[] } | { rule: UserExclusionRuleInput }`; payload adds `reason: string`. `UserExclusionRuleInput = { type: 'user'; targetId: number; categoryId?: number | null }` (`types/moderation.types.ts:333`).
- `restoreRunsAction(gameSlug, runIds, reason)` from `../moderation/shared/actions/restore.action`.
- `applyVerdictsAction(gameSlug, action, runIds, reason)` with `action: 'verify' | 'reject' | 'unreject'` from `../moderation/shared/actions/verdicts.action`.
- `loadUserEligibleRunsAction(gameSlug, userId): Promise<{ ok: true; rows: UserEligibleRunRow[] } | { error: string }>` from `../moderation/shared/actions/eligible-runs.action`.
- `createManualTimeAction(gameSlug, { runnerRef, categoryId, subcategoryKey, timing, timeMs, reason })` from `../moderation/shared/actions/manual-times.action`; `ModTiming = 'realtime' | 'gametime'`; `RunnerRef = { userId: number } | { guestName: string }`.
- `moveRunAction(gameSlug, runId, target, affected)` from `../moderation/shared/actions/board-override.action`.
- `fireUndoToast(message, undo, onUndone)` from `../moderation/shared/undo-toast`.
- `primaryValueOf(row: UserEligibleRunRow, timing: 'rt' | 'gt'): number | null` exported from `./row-actions`.
- `msToTimeInput` / `parseTimeInput` from `../moderation/shared/time-format`.
- `BoardDialog` from `../../shared/board-dialog` (`size: 'sm' | 'md' | 'lg' | 'xl'`, `labelledBy`, `closeOnBackdropClick`).
- `usePopoverFocus({ open, onClose, panelRef })` from `../../shared/use-popover-focus` — popover convention per `board-controls.tsx`: trigger `aria-haspopup="dialog"`/`aria-expanded`, panel `role="dialog" aria-modal="true"`, caller adds a `mousedown` outside-click listener.
- `subcategoryVariablesFor(categoryId, variables)` from `./subcategory-bands`.
- Site-ban lib (Phase 0 of this branch): `createSiteBan(sessionId, { username, reason, runTreatment })`, `RunTreatment = 'exclude' | 'anonymize' | 'keep'` from `~src/lib/bans` / `types/bans.types`.

---

### Task 1: Generalize the site-ban server action

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/actions/anonymize.action.ts`
- Modify: `app/(new-layout)/games-v2/[game]/manage/boards/row-actions.tsx` (call site only)
- Modify: `app/(new-layout)/games-v2/[game]/manage/boards/row-actions-anonymize.test.tsx` (mock + assertion only)

**Interfaces:**
- Consumes: `createSiteBan` (already takes `runTreatment`), existing action structure.
- Produces (Tasks 2 and 4 rely on these exact names):
  - `siteBanRunnerAction(gameSlug: string, input: { username: string; reason: string; treatment: RunTreatment; board: AffectedLeaderboard }): Promise<{ ok: true; banId: number } | { error: string }>` — replaces `anonymizeRunnerAction`.
  - `liftSiteBanAction(banId, gameSlug, board)` — unchanged.

- [ ] **Step 1: Rename and parameterize**

In `anonymize.action.ts`: rename `anonymizeRunnerAction` → `siteBanRunnerAction`; add `treatment` to the input type (`import type { RunTreatment } from '../../../../../../../../types/bans.types';`); pass `runTreatment: input.treatment` instead of the hardcoded `'anonymize'`. Update the function doc comment: "Site-wide ban, filed from board curation. Admin-only. `treatment` decides what happens to the runs: 'exclude' removes them from all boards, 'anonymize' keeps them under a masked name, 'keep' leaves them untouched." Leave `liftSiteBanAction` alone.

- [ ] **Step 2: Update the call site**

In `row-actions.tsx` `confirmAnonymize`: import and call `siteBanRunnerAction(gameSlug, { username: row.runnerName, reason: anonReason.trim(), treatment: 'anonymize', board })`. Behavior unchanged.

- [ ] **Step 3: Update the test file**

In `row-actions-anonymize.test.tsx`: rename the mock key `anonymizeRunnerAction` → `siteBanRunnerAction` (both in `vi.hoisted` and the `vi.mock` factory), and extend the payload assertion in the confirm test with `treatment: 'anonymize'`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run row-actions-anonymize`
Expected: 7 passed (6 original + the busy mutual-exclusion test added by the previous fix wave).

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck 2>&1 | grep -E "anonymize.action|row-actions"` — expect no output.

```bash
git add "app/(new-layout)/games-v2/[game]/manage/moderation/shared/actions/anonymize.action.ts" "app/(new-layout)/games-v2/[game]/manage/boards/row-actions.tsx" "app/(new-layout)/games-v2/[game]/manage/boards/row-actions-anonymize.test.tsx"
git commit -m "refactor(console): generalize anonymize action to siteBanRunnerAction(treatment)"
```

---

### Task 2: Runner… dialog component (TDD)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/boards/runner-dialog.tsx`
- Test: `app/(new-layout)/games-v2/[game]/manage/boards/runner-dialog.test.tsx`

**Interfaces:**
- Consumes: `siteBanRunnerAction` / `liftSiteBanAction` (Task 1), `excludeAction` / `previewExcludeAction`, `fireUndoToast`, `BoardDialog`, `subcategoryVariablesFor`, styles from `./board-curation.module.scss` (`dialogHeader`, `dialogTitle`, `dialogBody`, `dialogFooter`, `dialogTextarea`, `fieldLabel`, `errorAlert`, `confirmBtn`, `slipAction`, `slipLoading`, `moveNote`).
- Produces (Task 4 mounts it):

```typescript
export interface RunnerDialogProps {
    open: boolean;
    onClose: () => void;
    row: LeaderboardRosterRow; // caller guarantees row.userId != null
    category: ResolvedCategory;
    variables: VariableRow[];
    gameSlug: string;
    subcategoryKey: string;
    canSiteBan: boolean;
    onMutated: () => void;
}
export function RunnerDialog(props: RunnerDialogProps): JSX.Element | null;
```

**Behavior spec (exact):**

- Scope segmented control (buttons with `aria-pressed`, reusing the plain-button pattern — three options): `This board`, `Whole game`, `Entire site`. `Entire site` renders only when `canSiteBan`. Default scope: `This board`.
- When `category` has subcategory variables (`subcategoryVariablesFor(category.id, variables).length > 0`), a note under the scope control at `This board`: `Covers every subcategory board of {category.display} — exact single-board scope is coming later.`
- Board/game scope: effect is fixed at `Remove runs from boards` for Phase A (render as static text, not a control: `Effect: remove runs from boards. The account is unaffected.`). On open and on scope change (board/game only), fire `previewExcludeAction(gameSlug, { rule })` where `rule = { type: 'user', targetId: row.userId, categoryId: scope === 'board' ? category.id : undefined }` — show `{affectedRunCount} run(s) affected.` and the per-leaderboard list exactly like the old Ban dialog did (categoryName, subcategoryKey, affectedInThisLeaderboard). Preview errors render in `errorAlert` and block Confirm.
- Site scope (admins): no exclude preview. Treatment radio group, label `What happens to their runs`, three options with these exact labels/descriptions:
  - `Remove from boards` — `Runs come off every board, site-wide.`
  - `Hide name` — `Runs stay and count; the name shows as “Anonymous Runner” publicly.`
  - `Keep as-is` — `Runs and name untouched; only the account is locked.`
  Default: `Remove from boards`. Below the radios: `Site-wide ban: the account is locked out of therun.gg entirely.`
- Reason: required textarea, label `Reason — required`, id `runner-dialog-reason`.
- Confirm button label by scope: board/game → `Confirm removal` (in-flight `Removing…`); site → `Confirm site ban` (in-flight `Banning…`). Disabled while pending, while reason is empty/whitespace, or (board/game) while the preview errored.
- Confirm behavior:
  - board/game: `excludeAction(gameSlug, { rule, reason })` → on error `toast.error`, stay open; on success close, `onMutated()`, `toast.success('{runnerName} removed from boards.')` (no undo toast — rule deletion lives in the existing Active bans/rules UI).
  - site: `siteBanRunnerAction(gameSlug, { username: row.runnerName, reason, treatment, board: { categoryId: category.id, subcategoryKey } })` → on error `toast.error`, stay open; on success close, `onMutated()`, `fireUndoToast('{runnerName} banned site-wide.', () => liftSiteBanAction(banId, gameSlug, board), onMutated)`.
- Dialog: `BoardDialog size="sm"`, `labelledBy="runner-dialog-title"`, title `Moderate {row.runnerName}`, `closeOnBackdropClick` false while pending; Cancel button; close blocked while pending. All async work in `useTransition`; a `busy` guard on Confirm prevents same-tick double-fire.

- [ ] **Step 1: Write the failing tests**

`runner-dialog.test.tsx`, following `row-actions-anonymize.test.tsx`'s structure (jsdom banner, `vi.hoisted` mocks, `beforeEach` clearAllMocks, `afterEach` cleanup). Mock modules: `../moderation/shared/actions/exclude.action` (excludeAction, previewExcludeAction), `../moderation/shared/actions/anonymize.action` (siteBanRunnerAction, liftSiteBanAction), `../moderation/shared/undo-toast` (fireUndoToast), `react-toastify`. Fixtures: reuse the `CATEGORY` and `rosterRow` shapes from `row-actions-anonymize.test.tsx` verbatim (copy them — fixtures are per-file by convention here); `VariableRow` fixture only for the subcategory-note test (copy `NG_PLUS_VAR` from `row-actions.test.tsx`, with `categoryId: CATEGORY.id`). Default render helper mounts `<RunnerDialog open onClose={vi.fn()} row={rosterRow({})} category={CATEGORY} variables={[]} gameSlug="some-game" subcategoryKey="" canSiteBan={false} onMutated={vi.fn()} />` with overrides. `previewExcludeAction` default mock resolves `{ ok: true, preview: { affectedRunCount: 3, affectedLeaderboards: [] } }`.

Test cases (9):
1. `board scope previews a category-scoped rule on open` — expect `previewExcludeAction` called with `('some-game', { rule: { type: 'user', targetId: 5, categoryId: 10 } })`; `await screen.findByText(/3 runs? affected/)`.
2. `switching to Whole game re-previews without categoryId` — click `Whole game`, expect a second preview call with `{ rule: { type: 'user', targetId: 5, categoryId: undefined } }` (or without the key — assert with `expect.objectContaining({ rule: expect.objectContaining({ type: 'user', targetId: 5 }) })` and explicitly that `categoryId` is not `10`).
3. `Entire site hidden without canSiteBan` — `queryByRole('button', { name: 'Entire site' })` is null.
4. `subcategory note shows only for subcategoried category at board scope` — render with `variables: [NG_PLUS_VAR]`, expect the note text; re-render with `variables: []`, expect absent.
5. `confirm disabled until reason` — board scope, empty reason → `Confirm removal` disabled; type reason → enabled.
6. `board confirm files the scoped rule` — type reason `spam`, click `Confirm removal`, `await waitFor` → `excludeAction` called with `('some-game', { rule: { type: 'user', targetId: 5, categoryId: 10 }, reason: 'spam' })`, `onMutated` called, `toastSuccess` called with `'runner removed from boards.'`.
7. `site confirm bans with the chosen treatment` — `canSiteBan: true`, click `Entire site`, choose `Hide name` radio, reason `tos`, click `Confirm site ban` → `siteBanRunnerAction` called with `('some-game', { username: 'runner', reason: 'tos', treatment: 'anonymize', board: { categoryId: 10, subcategoryKey: '' } })`; `fireUndoToast` called; undo closure invokes `liftSiteBanAction` with the returned `banId`.
8. `treatment labels map correctly` — site scope: `Remove from boards` radio → confirm payload `treatment: 'exclude'`; (separate render) `Keep as-is` → `treatment: 'keep'`.
9. `error keeps the dialog open` — `excludeAction` resolves `{ error: 'nope' }` → `toastError('nope')`, `Confirm removal` still in the document.

- [ ] **Step 2: Run tests — verify they fail**

Run: `npx vitest run runner-dialog`
Expected: FAIL — module `./runner-dialog` not found.

- [ ] **Step 3: Implement `runner-dialog.tsx`**

`'use client'`. Structure (state names binding for readability, not tests): `scope: 'board' | 'game' | 'site'`, `treatment: RunTreatment` (default `'exclude'`), `reason`, `preview`/`previewError` state pair, `isPreviewing`/`isConfirming` transitions. `useEffect` on `[open, scope]` fires the preview for board/game scopes (skip when `!open || scope === 'site'`), resetting state on open. Map scope→rule exactly as the tests assert. Confirm handler branches on scope; guards `if (isConfirming || reason.trim().length === 0) return;`. Radios: native `<input type="radio" name="runner-treatment">` with visible labels and the description text in a `<small>` under each label. JSX skeleton mirrors the Ban dialog's `dialogHeader/dialogBody/dialogFooter` layout from the pre-Task-4 `row-actions.tsx` (git show `e4f98912` if needed). Return `null` when `!open || row.userId == null`.

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx vitest run runner-dialog`
Expected: 9 passed.

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck 2>&1 | grep "runner-dialog"` — expect no output.

```bash
git add "app/(new-layout)/games-v2/[game]/manage/boards/runner-dialog.tsx" "app/(new-layout)/games-v2/[game]/manage/boards/runner-dialog.test.tsx"
git commit -m "feat(console): Runner dialog — scoped remove-runs + site ban with treatments"
```

---

### Task 3: Adjust dialog component (TDD)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/boards/adjust-dialog.tsx`
- Test: `app/(new-layout)/games-v2/[game]/manage/boards/adjust-dialog.test.tsx`

**Interfaces:**
- Consumes: `loadUserEligibleRunsAction`, `excludeAction`, `restoreRunsAction`, `createManualTimeAction`, `fireUndoToast`, `primaryValueOf` from `./row-actions`, `msToTimeInput`/`parseTimeInput`, `BoardDialog`, `DurationToFormatted` from `~src/components/util/datetime`, same scss module classes as Task 2.
- Produces (Task 4 mounts it):

```typescript
export interface AdjustDialogProps {
    open: boolean;
    onClose: () => void;
    row: LeaderboardRosterRow;
    category: ResolvedCategory;
    gameSlug: string;
    subcategoryKey: string;
    /** Currently-displayed time for the row, seed for the set-time input. */
    timeMs: number | null;
    onMutated: () => void;
}
export function AdjustDialog(props: AdjustDialogProps): JSX.Element | null;
```

**Behavior spec (exact):**

- `BoardDialog size="lg"`, `labelledBy="adjust-dialog-title"`, title `Adjust {row.runnerName}’s entry`.
- **Pick-the-valid-run section** (users only — hidden entirely when `row.userId == null`): on open, `loadUserEligibleRunsAction(gameSlug, row.userId)`; filter rows to `r.categoryId === category.id && r.subcategoryKey === subcategoryKey`, drop rows whose `primaryValueOf(r, timing) == null` (`timing = category.primaryTiming === 'gt' ? 'gt' : 'rt'`), sort ascending by that value. Render as a radio list: each row shows `DurationToFormatted` of its primary value, its `verificationStatus`, and `— current entry` appended on the row whose `runId === row.runId`. Radio checked = selected target (default: current entry).
- Consequence line, always visible under the list once loaded: with `fasterIds` = runIds of listed runs whose primary value is strictly less than the selected target's, the line reads `This removes {n} faster run{s}.` when `n > 0`, else `No faster runs to remove.`
- `Make this the entry` button: disabled while loading, while pending, or when the selected target is the current entry AND `fasterIds.length === 0` (no-op). On confirm: if `fasterIds.length > 0`, `excludeAction(gameSlug, { runIds: fasterIds, reason: 'Adjusted during board curation' })` → error: `toast.error`, stay open; success: close, `onMutated()`, `fireUndoToast('Adjusted {row.runnerName}’s entry.', () => restoreRunsAction(gameSlug, fasterIds, 'Undo of adjust'), onMutated)`. (Excluding every faster run makes the chosen run the board entry — boards always surface the best eligible run; no pin mechanism exists or is needed.)
- **Set a time instead section** (always rendered; the ONLY section for guests): heading `Set a time instead`, explanatory line `Files a moderator manual time for this board.` Text input seeded with `msToTimeInput(timeMs)`, placeholder `e.g. 35:48`, label `Time`, id `adjust-time`; reason input label `Reason — required`, id `adjust-time-reason`. `Save time` button → `parseTimeInput`; invalid → inline error `Enter a valid time (h:mm:ss, m:ss, or m:ss.SSS).`; valid → `createManualTimeAction(gameSlug, { runnerRef: row.userId == null ? { guestName: row.runnerName } : { userId: row.userId }, categoryId: category.id, subcategoryKey, timing: category.primaryTiming === 'gt' ? 'gametime' : 'realtime', timeMs: parsed, reason })` → error inline; success: close, `toast.success('Time set.')`, `onMutated()`.
- All async in `useTransition`; a shared pending flag disables both confirm buttons; close blocked while pending. Return `null` when `!open`.

- [ ] **Step 1: Write the failing tests**

`adjust-dialog.test.tsx`, same harness conventions as Task 2 (jsdom, hoisted mocks for `../moderation/shared/actions/eligible-runs.action`, `exclude.action`, `restore.action`, `manual-times.action`, `undo-toast`, `react-toastify`). Fixture builder:

```typescript
function eligibleRun(o: Partial<UserEligibleRunRow>): UserEligibleRunRow {
    return {
        runId: 1,
        categoryId: 10,
        categoryName: 'Any%',
        subcategoryKey: '',
        time: 20_000,
        gameTime: null,
        primaryTiming: 'rt',
        verificationStatus: 'verified',
        vodUrl: null,
        endedAt: '2026-01-01T00:00:00.000Z',
        isLeaderboardEntry: true,
        isLeaderboardEntryGt: false,
        rank: 1,
        totalRunners: 5,
        ...o,
    };
}
```

Default eligible mock: rows `[{runId: 1, time: 20_000}, {runId: 2, time: 25_000}, {runId: 3, time: 30_000}]` (runId 1 = current entry per `rosterRow({ runId: 1 })`). Test cases (7):
1. `lists this board's eligible runs sorted, current entry marked` — three radios; the 20s row's label contains `current entry`.
2. `filters other boards out` — add a row with `categoryId: 20` and one with `subcategoryKey: 'ngplus=Yes'`; only three radios remain.
3. `selecting a slower run previews the removals` — select the 30s radio → text `This removes 2 faster runs.`; select 25s → `This removes 1 faster run.`
4. `no-op guard` — with current entry selected, text `No faster runs to remove.` and `Make this the entry` disabled.
5. `confirm excludes exactly the faster runs, with undo` — select 30s, click `Make this the entry` → `excludeAction('some-game', { runIds: [1, 2], reason: 'Adjusted during board curation' })`; `onMutated` called; `fireUndoToast` called; its undo closure calls `restoreRunsAction('some-game', [1, 2], 'Undo of adjust')`.
6. `guest sees only the time section` — `row: rosterRow({ userId: null })` → no radios, no `Make this the entry`; `Save time` present; `loadUserEligibleRunsAction` NOT called; filling time `35:48` + reason then Save → `createManualTimeAction` called with `runnerRef: { guestName: 'runner' }` and `timeMs: 2_148_000`.
7. `manual time validation` — enter `garbage`, Save → inline `Enter a valid time` error, `createManualTimeAction` not called.

- [ ] **Step 2: Run tests — verify they fail**

Run: `npx vitest run adjust-dialog`
Expected: FAIL — module `./adjust-dialog` not found.

- [ ] **Step 3: Implement `adjust-dialog.tsx`**

Per the behavior spec. Load effect keyed on `[open]`; reset selection to `row.runId` on open. Compute `boardRuns` (filtered+sorted) and `fasterIds` with `useMemo`. Radios: native inputs, `name="adjust-target"`. Time parse note: `parseTimeInput('35:48')` = 35m48s = 2 148 000 ms (matches test 6).

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx vitest run adjust-dialog`
Expected: 7 passed.

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck 2>&1 | grep "adjust-dialog"` — expect no output.

```bash
git add "app/(new-layout)/games-v2/[game]/manage/boards/adjust-dialog.tsx" "app/(new-layout)/games-v2/[game]/manage/boards/adjust-dialog.test.tsx"
git commit -m "feat(console): Adjust dialog — pick the valid run with exclusion preview, or set a time"
```

---

### Task 4: Restructure the row cluster

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/boards/row-actions.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/boards/row-actions.test.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/boards/row-actions-anonymize.test.tsx` (delete — superseded, see Step 3)
- Modify: `app/(new-layout)/games-v2/[game]/manage/boards/board-curation.module.scss` (popover styles if none reusable)

**Interfaces:**
- Consumes: `RunnerDialog` (Task 2), `AdjustDialog` (Task 3), `applyVerdictsAction`, `usePopoverFocus`, existing Move dialog code (kept, relocated behind the menu).
- Produces: `RowActionsProps` unchanged EXCEPT `canSiteBan` stays (now feeding `RunnerDialog`); the rendered cluster becomes `Remove · Run… · Runner…`. `primaryValueOf`, `PendingRemoval`, `PendingRemovalCells` exports unchanged (board-curation depends on them).

**What is removed from `row-actions.tsx`:** the Later button + `optimisticLater`/`isMarking`/`handleLater` + the reconcile effect + the `markRunsAction` import; the Ban button/dialog/state (`banOpen`, `banPreview`, `openBan`, `confirmBan` — superseded by RunnerDialog's board/game scope); the Anonymize button/dialog/state (superseded by RunnerDialog's site scope); the Fix time button and inline time-cell editor (`editingTime`, `timeText`, `submitEditTime` — superseded by AdjustDialog's time section; the time cell renders read-only again); the top-level Move… button (dialog and handlers KEPT, opened from the Run… menu). Imports that become unused go too (`previewExcludeAction`, `siteBanRunnerAction`/`liftSiteBanAction`, `createManualTimeAction`, `msToTimeInput`/`parseTimeInput` — all now live in the dialogs).

**What is added:**

- State: `menuOpen` (Run… popover), `runnerOpen`, `adjustOpen`, `isApproving` transition.
- Cluster JSX (replaces the old five buttons; `styles.actionBtn` throughout):

```tsx
<button type="button" className={styles.actionBtn} onClick={onRemove} disabled={busy}>
    Remove
</button>
<div className={styles.menuRoot}>
    <button
        type="button"
        className={styles.actionBtn}
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        disabled={busy}
    >
        Run…
    </button>
    {menuOpen && (
        <div ref={menuRef} role="dialog" aria-modal="true" aria-label={`Run actions for ${row.runnerName}`} className={styles.menuPanel}>
            <button type="button" className={styles.menuItem} onClick={handleApprove} disabled={busy || row.verificationStatus === 'verified'}>
                {row.verificationStatus === 'verified' ? 'Approved' : 'Approve'}
            </button>
            <button type="button" className={styles.menuItem} onClick={() => { setMenuOpen(false); openMove(); }} disabled={busy}>
                Move…
            </button>
            <button type="button" className={styles.menuItem} onClick={() => { setMenuOpen(false); setAdjustOpen(true); }} disabled={busy}>
                {isGuest ? 'Set time…' : 'Adjust…'}
            </button>
        </div>
    )}
</div>
{!isGuest && (
    <button type="button" className={styles.actionBtn} onClick={() => setRunnerOpen(true)} disabled={busy}>
        Runner…
    </button>
)}
```

- Popover wiring: `const menuRef = useRef<HTMLDivElement>(null); usePopoverFocus({ open: menuOpen, onClose: () => setMenuOpen(false), panelRef: menuRef });` plus the `mousedown` outside-click effect copied from the `board-controls.tsx:145-153` pattern.
- `handleApprove`: `setMenuOpen(false); startApprove(async () => { const res = await applyVerdictsAction(gameSlug, 'verify', [row.runId], 'Approved from board curation'); if ('error' in res) { toast.error(res.error); return; } toast.success('Run approved.'); onMutated(); });`
- Dialog mounts after the Move dialog block: `<RunnerDialog open={runnerOpen} onClose={() => setRunnerOpen(false)} row={row} category={category} variables={variables} gameSlug={gameSlug} subcategoryKey={subcategoryKey} canSiteBan={canSiteBan} onMutated={onMutated} />` and `<AdjustDialog open={adjustOpen} onClose={() => setAdjustOpen(false)} row={row} category={category} gameSlug={gameSlug} subcategoryKey={subcategoryKey} timeMs={timeMs} onMutated={onMutated} />`.
- `busy` disjunction shrinks to `isApproving || removing || isMoving` (dialogs own their pending states and block their own close; the cluster's buttons are what `busy` protects).
- SCSS: add `.menuRoot { position: relative; }`, `.menuPanel` (absolute, right-aligned below the trigger, surface background, border, radius, small shadow, `z-index` above the row, min-width ~10rem, padding 0.25rem), `.menuItem` (block, full-width, text-left, quiet button matching `.actionBtn`'s type scale, hover background) — match the tokens `board-controls`' popover uses in this same module; reuse its classes outright if they exist there.
- Component doc comment updates to "(Remove, Run… menu: Approve/Move/Adjust, Runner…)".

- [ ] **Step 1: Rewrite the tests first**

`row-actions.test.tsx` — this file currently tests Later/Ban/Fix-time/Move through the old cluster. Rewrite to the new surface, keeping the harness/fixtures and the Move dialog tests (Move now opens via Run… → Move…, so those tests add two clicks). New/changed cases: (1) cluster shows exactly `Remove`, `Run…` for guests (no `Runner…`); users get all three; (2) no `Later`/`Ban`/`Anonymize`/`Fix time` buttons anywhere; (3) Run… menu lists Approve/Move…/Adjust… (users) and Approve/Move…/Set time… (guests); (4) Approve calls `applyVerdictsAction('some-game', 'verify', [1], 'Approved from board curation')` and is disabled+relabeled `Approved` when `verificationStatus: 'verified'`; (5) Remove still calls `onRemove`; (6) Runner…/Adjust… clicks mount the (mocked) dialogs — mock `./runner-dialog` and `./adjust-dialog` as `vi.fn(() => null)` components and assert they receive `open: true` and the right props (`canSiteBan`, `timeMs`). Mock `../moderation/shared/actions/verdicts.action`. Delete `row-actions-anonymize.test.tsx` in this step — its subject (the in-file Anonymize dialog) no longer exists; its behaviors now live in `runner-dialog.test.tsx` (site scope) from Task 2.

- [ ] **Step 2: Run to verify the new tests fail against the old cluster**

Run: `npx vitest run row-actions`
Expected: FAIL (old buttons still rendered, menu absent).

- [ ] **Step 3: Implement the restructure**

Apply the removals/additions above. `git rm` `row-actions-anonymize.test.tsx`.

- [ ] **Step 4: Run the boards suites**

Run: `npx vitest run row-actions adjust-dialog runner-dialog board-curation`
Expected: all pass. `board-curation.test.tsx` / `board-curation-remove-integration.test.tsx` may reference the Later button or Fix time — if they do, update those assertions to the new cluster (Remove/undo/next-run-slip flows are unchanged and must keep passing untouched).

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck 2>&1 | grep -E "row-actions|board-curation"` — expect no output.

```bash
git add -A "app/(new-layout)/games-v2/[game]/manage/boards/"
git commit -m "feat(console): row cluster becomes Remove / Run… / Runner…, drops Later, Ban, Anonymize, Fix time"
```

---

### Task 5: Full-suite verification + docs

**Files:**
- Modify: `docs/superpowers/specs/2026-07-31-row-moderation-model-design.md` (status line only)

**Interfaces:** none — verification task.

- [ ] **Step 1: Full test suite**

Run: `npm run test`
Expected: no NEW failures vs the branch baseline (baseline has 2 pre-existing failures in `variables-section.test.tsx`; anything else new must be fixed before committing).

- [ ] **Step 2: Repo-wide typecheck gate**

Run: `npm run typecheck 2>&1 | grep -cE "error TS"` and compare against the pre-Task-1 count; then `npm run typecheck 2>&1 | grep -E "boards/|anonymize.action"` — expect no output.

- [ ] **Step 3: Mark Phase A shipped in the spec**

In the spec's Status line: `Status: approved — Phase A implemented (this branch); Phases B/C pending backend`.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-07-31-row-moderation-model-design.md
git commit -m "docs: mark row-moderation Phase A implemented"
```
