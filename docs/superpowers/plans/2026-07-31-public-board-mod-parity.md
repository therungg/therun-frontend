# Public Board Mod Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mods/admins get the console's full per-row action set (Move…, Adjust/Set time…, Runner…, Mark for later) in the public leaderboard's row kebab.

**Architecture:** Extend `RowActionsMenu` (public board) with the console's dialogs imported as-is from `manage/boards/`; a pure adapter maps `LeaderboardEntry` → `LeaderboardRosterRow`; board context (ResolvedCategory[], VariableRow[]) loads lazily via a mod-gated server action on first dialog open; `canSiteBan` threads from the page's CASL ability. The console's inline Move dialog is first extracted to `move-dialog.tsx` so both surfaces share one implementation.

**Tech Stack:** Next.js 16 App Router, React 19, vitest + @testing-library/react (jsdom pragma), existing server actions (`moveRunAction`, `markRunsAction`, mod-fetch lib).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-31-public-board-mod-parity-design.md`
- Never push frontend main; work stays on branch `mod-console-redesign`.
- Biome formatting (4-space, single quotes); unused vars prefixed `_`.
- Manual-time rows (`runId == null`) render no menu (existing behavior, keep).
- Runner… only when `entry.userId != null`; Entire-site scope only when `canSiteBan`.
- Public payload (`LeaderboardEntry`) unchanged — no new fields for visitors.

---

### Task 1: Extract MoveDialog from console row-actions

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/boards/move-dialog.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/boards/row-actions.tsx` (delete inline move state/JSX ~lines 174-266 and 431-521; render `<MoveDialog>` instead)
- Test: existing `row-actions.test.tsx` must keep passing unchanged

**Interfaces:**
- Produces:
```tsx
export interface MoveDialogProps {
    open: boolean;
    onClose: () => void;
    row: LeaderboardRosterRow;
    category: ResolvedCategory;      // current placement
    categories: ResolvedCategory[];  // move targets (self included)
    variables: VariableRow[];
    subcategoryKey: string;          // current placement key
    gameSlug: string;
    onMutated: () => void;
}
export function MoveDialog(props: MoveDialogProps): JSX.Element | null;
```

- [ ] **Step 1:** Move the `// ---- Move ----` state block (`moveOpen` excluded — open/close become props), `openMove`'s seeding logic (runs in an effect keyed on `open`), `moveTargetCategoryId/moveSelectedValues/moveError/isMoving`, `confirmMove`, and the `{moveOpen && <BoardDialog…>}` JSX into `move-dialog.tsx`. Keep `fireUndoToast` usage and the source/target revalidation pair exactly as-is. Import `styles` from `./board-curation.module.scss` same as `row-actions.tsx` does.
- [ ] **Step 2:** In `row-actions.tsx`: keep only `const [moveOpen, setMoveOpen] = useState(false)`; Run…-menu Move… item does `setMoveOpen(true)`; render `<MoveDialog open={moveOpen} onClose={() => setMoveOpen(false)} …/>`. `busy` no longer includes `isMoving` (the dialog owns its pending state and blocks its own close, same contract as AdjustDialog/RunnerDialog).
- [ ] **Step 3:** Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/boards/"` — expect all pass.
- [ ] **Step 4:** Commit: `refactor(console): extract MoveDialog so the public board can reuse it`

### Task 2: Entry→roster-row adapter

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/leaderboard/mod-row.ts`
- Test: `app/(new-layout)/games-v2/[game]/leaderboard/mod-row.test.ts`

**Interfaces:**
- Produces:
```ts
/** null when the entry has no finished_run to act on (manual times). */
export function entryToRosterRow(
    entry: LeaderboardEntry,
    subcategoryKey: string, // the entry's OWN key, built by the caller
): LeaderboardRosterRow | null;
```

- [ ] **Step 1:** Write failing tests: maps a full entry (runId/userId/runnerName/realTime→time/gameTime/verificationStatus/vodUrl/runDate→endedAt, entry flags true, `markedForLater` undefined); guest (`userId: null`) maps with null userId; `runId: null`/`undefined` → null; null `runDate` → `endedAt: ''`.
- [ ] **Step 2:** Run: `npx vitest run "app/(new-layout)/games-v2/[game]/leaderboard/mod-row.test.ts"` — FAIL (module missing).
- [ ] **Step 3:** Implement:
```ts
export function entryToRosterRow(
    entry: LeaderboardEntry,
    subcategoryKey: string,
): LeaderboardRosterRow | null {
    if (entry.runId == null) return null;
    return {
        runId: entry.runId,
        userId: entry.userId ?? null,
        runnerName: entry.runnerName,
        subcategoryKey,
        time: entry.realTime ?? entry.time,
        gameTime: entry.gameTime,
        verificationStatus: entry.verificationStatus,
        vodUrl: entry.vodUrl ?? null,
        endedAt: entry.runDate ?? '',
        isLeaderboardEntry: true,
        isLeaderboardEntryGt: true,
    };
}
```
- [ ] **Step 4:** Run test — PASS. Commit: `feat(board): entry→roster-row adapter for public mod actions`

### Task 3: Lazy mod board context action

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/leaderboard/actions/load-mod-board-context.action.ts`

**Interfaces:**
- Consumes: `resolveGame` (`~src/lib/games-v1`), `resolveCategory` (same loader `manage/page.tsx` uses — import from its module), `listGameVariables` (`~src/lib/leaderboard-variables`), `canModerateGame`.
- Produces:
```ts
export async function loadModBoardContextAction(gameSlug: string): Promise<
    | { ok: true; categories: ResolvedCategory[]; variables: VariableRow[] }
    | { error: string }
>;
```

- [ ] **Step 1:** Implement mirroring `load-board-page.action.ts`'s auth shape: `getSession()` → not signed in; `resolveGame` → not found; `canModerateGame` → not authorized; then `Promise.all([resolveCategory(game.id), listGameVariables(game.id)])`, return featured + archived categories as loaded (the console passes the same list). Catch → `{ error: 'Failed to load board data.' }`.
- [ ] **Step 2:** `npx tsc --noEmit` filtered to the new file — no errors. Commit: `feat(board): mod board-context action for public row menu`

### Task 4: RowActionsMenu — the four new items + dialogs

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/row-actions-menu.tsx`
- Test: `app/(new-layout)/games-v2/[game]/leaderboard/row-actions-menu.test.tsx` (new)

**Interfaces:**
- Consumes: `MoveDialog` (Task 1), `entryToRosterRow` (Task 2), `loadModBoardContextAction` (Task 3), `AdjustDialog`, `RunnerDialog`, `markRunsAction` (`../manage/moderation/shared/actions/marks.action`), `subcategoryVariablesFor` (`../manage/shared/subcategory-bands` re-export — same import `row-actions.tsx` uses).
- Produces: `RowActionsMenu` gains optional prop `canSiteBan?: boolean` (default false).

- [ ] **Step 1:** Write failing component tests (jsdom, mock the three actions + dialogs' server actions like `board-curation.test.tsx` does): (a) Moderator items Move…/Adjust time…/Runner…/Mark for later render only with `canManage`; (b) Runner… absent for guest entries; (c) Mark for later calls `markRunsAction(gameSlug, [runId], true)` and toasts; (d) opening Move… calls `loadModBoardContextAction` once, and a second open doesn't re-call; (e) context error → `toast.error`, no dialog.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement in `row-actions-menu.tsx`:
  - State: `const [modCtx, setModCtx] = useState<{categories: ResolvedCategory[]; variables: VariableRow[]} | null>(null);` plus `pendingDialog: 'move' | 'adjust' | 'runner' | null` and a `useTransition`.
  - `openModDialog(kind)`: if `modCtx` present → open immediately; else fetch via `loadModBoardContextAction(gameSlug)`, on `{error}` toast + reset, else `setModCtx` and open.
  - Derive on open: `row = entryToRosterRow(entry, entrySubcategoryKey)` (menu already computes `entrySubcategoryKey`); `category = modCtx.categories.find(c => c.name === categorySlug)` — when not found, toast `'Could not resolve this board's category.'` and bail; `timeMs = category.primaryTiming === 'gt' ? row.gameTime : row.time`.
  - Menu items after the existing Remove/Restore block: `Move…`, `Adjust time…` (`Set time…` when `entry.userId == null`), `Runner…` (only `entry.userId != null`), `Mark for later`.
  - Mark for later handler: `markRunsAction(gameSlug, [runId], true)` → error toast or `toast.success('Marked for later — it's in the console's marked pile.')`. No refresh needed (public board doesn't render the flag).
  - Render `<MoveDialog>`, `<AdjustDialog>`, `<RunnerDialog>` gated on `pendingDialog` + `modCtx` + `row` + `category`, with `variables={modCtx.variables}`, `subcategoryKey={entrySubcategoryKey}`, `canSiteBan={canSiteBan}` (Runner only), `onMutated={() => { setPendingDialog(null); router.refresh(); }}`.
- [ ] **Step 4:** Run the new test file + `npx vitest run "app/(new-layout)/games-v2/[game]/leaderboard/"` — PASS.
- [ ] **Step 5:** Commit: `feat(board): console-parity mod actions in the public row menu`

### Task 5: Thread canSiteBan to the menu

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/page.tsx` (or wherever `canManage`/`canManageRuns` are computed — pass `canSiteBan: ability.can('moderate', 'admins')`)
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx` (prop through to `LeaderboardPager`)
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-pager.tsx`, `leaderboard-table.tsx` (if it sits between), `leaderboard-row.tsx` (prop through to `RowActionsMenu`)

- [ ] **Step 1:** Add `canSiteBan?: boolean` (default false) at each hop; find the ability import already used for `canManage` on the page and reuse it.
- [ ] **Step 2:** `npx tsc --noEmit` — no new errors vs touched files; `npx vitest run "app/(new-layout)/games-v2/[game]/leaderboard/"` — PASS.
- [ ] **Step 3:** Commit: `feat(board): thread admin site-ban gate to the public row menu`

### Task 6: Verify + push

- [ ] **Step 1:** `npx vitest run` — only pre-existing failures (variables-section) allowed.
- [ ] **Step 2:** `npx tsc --noEmit` — zero errors in touched files; `npx biome check --write` on touched dirs.
- [ ] **Step 3:** Push `mod-console-redesign`.
