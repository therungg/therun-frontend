# Boards Anonymize Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-only "Anonymize" action in the board-curation row cluster that files a site-wide anonymize ban (`POST /admin/bans`, `runTreatment: 'anonymize'`) with an undo toast that lifts it.

**Architecture:** Frontend-only, four layers matching the console's existing pattern: hand-mirrored types (`types/`), thin `apiFetch` wrappers (`src/lib/`), session-gated server actions (`manage/moderation/shared/actions/`), and the `RowActions` client component. The admin flag is computed server-side in `manage/page.tsx` from CASL and threaded down as a boolean prop.

**Tech Stack:** Next.js 16 App Router, React 19, vitest + @testing-library/react (jsdom), CASL, react-toastify.

**Spec:** `docs/superpowers/specs/2026-07-31-boards-anonymize-design.md`

## Global Constraints

- Repo: `/home/joey/therun/therun-fr`, branch `mod-console-redesign`. NEVER push to main; do not open PRs (Joey opens them).
- Backend is already deployed; do NOT touch `/home/joey/therun/therun`.
- Formatting is Biome (4-space indent, single quotes, trailing commas, semicolons); the husky pre-commit hook runs `biome check --write` on staged files — if it rewrites files, re-stage and commit again.
- `npm run typecheck` is NOT clean on main (~356 pre-existing errors). Gate on the diff: capture the error count before your change, and require no NEW errors mentioning the files you touched. `npm run typecheck 2>&1 | grep -c "error TS"` before vs after.
- Button/dialog copy is exact as written in Task 3 — do not paraphrase.
- The backend endpoint takes `username`, not userId. `row.runnerName` IS the canonical username for non-guest rows (the mod roster endpoint is deliberately unmasked). Guests (`row.userId == null`) can never be anonymized.

---

### Task 1: Types mirror + lib fetchers

**Files:**
- Create: `types/bans.types.ts`
- Create: `src/lib/bans.ts`

**Interfaces:**
- Consumes: `apiFetch<T>(path, { method, sessionId, body })` from `~src/lib/api-client` (unwraps the backend's `{ result }` envelope; throws `ApiError` on failure).
- Produces: `SiteBan` type; `createSiteBan(sessionId, input): Promise<SiteBan>`; `liftSiteBan(sessionId, banId, liftReason): Promise<SiteBan>` — Task 2 imports all three.

No unit tests here: `src/lib` fetchers are thin `apiFetch` wrappers and are untested by convention in this repo (see `src/lib/exclusions.ts`). Coverage lands at the component seam in Task 3.

- [ ] **Step 1: Write `types/bans.types.ts`**

Hand-mirror of the backend's `BanRecord` (`therun/src/services/ban-service.ts`, `userBans.$inferSelect`), subset of fields the UI needs. Dates arrive as ISO strings over JSON.

```typescript
// Hand-mirrored subset of the backend BanRecord
// (therun/src/services/ban-service.ts). Site-wide bans, admin-only API.

export type RunTreatment = 'exclude' | 'anonymize' | 'keep';

export interface SiteBan {
    id: number;
    userId: number;
    username: string;
    reason: string;
    runTreatment: RunTreatment;
    expiresAt: string | null;
    liftedAt: string | null;
}

export interface CreateSiteBanInput {
    username: string;
    reason: string;
    runTreatment: RunTreatment;
}
```

- [ ] **Step 2: Write `src/lib/bans.ts`**

```typescript
import { apiFetch } from '~src/lib/api-client';
import type { CreateSiteBanInput, SiteBan } from '../../types/bans.types';

/** Admin-only (backend enforces `moderate admins`). Creates a site-wide
 * ban; `runTreatment: 'anonymize'` keeps the runs on boards but masks the
 * name as "Anonymous Runner <id>" on all public reads. */
export async function createSiteBan(
    sessionId: string,
    input: CreateSiteBanInput,
): Promise<SiteBan> {
    return apiFetch<SiteBan>('/admin/bans', {
        method: 'POST',
        sessionId,
        body: input,
    });
}

/** Lifts a site-wide ban (admin-only). `liftReason` is required by the
 * backend. Idempotent on the backend for already-lifted bans. */
export async function liftSiteBan(
    sessionId: string,
    banId: number,
    liftReason: string,
): Promise<SiteBan> {
    return apiFetch<SiteBan>(`/admin/bans/${banId}`, {
        method: 'DELETE',
        sessionId,
        body: { liftReason },
    });
}
```

- [ ] **Step 3: Typecheck (baseline diff)**

Run: `npm run typecheck 2>&1 | grep -E "bans.types|src/lib/bans"`
Expected: no output (no errors in the new files).

- [ ] **Step 4: Commit**

```bash
git add types/bans.types.ts src/lib/bans.ts
git commit -m "feat(console): site-wide ban types + /admin/bans fetchers"
```

---

### Task 2: Server actions

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/actions/anonymize.action.ts`

**Interfaces:**
- Consumes: `createSiteBan` / `liftSiteBan` from Task 1; `getSession` from `~src/actions/session.action` (returns the User directly — `session.id` is the bearer token, `session.username` the caller); `defineAbilityFor` from `~src/rbac/ability`; `resolveGame` from `~src/lib/games-v1`; `revalidateAffectedBoards(gameId, gameSlug, AffectedLeaderboard[])` from `~src/lib/moderation/revalidate-boards`; `ApiError` from `~src/lib/api-client`; `AffectedLeaderboard` (`{ categoryId: number; subcategoryKey: string }`) from `types/moderation.types`.
- Produces (Task 3 imports both):
  - `anonymizeRunnerAction(gameSlug: string, input: { username: string; reason: string; board: AffectedLeaderboard }): Promise<{ ok: true; banId: number } | { error: string }>`
  - `liftSiteBanAction(banId: number, gameSlug: string, board: AffectedLeaderboard): Promise<{ ok: true } | { error: string }>`

No direct tests (server actions in this directory are session-bound and untested by convention — `exclude.action.ts` etc.; Task 3's component tests mock this module).

- [ ] **Step 1: Write `anonymize.action.ts`**

Admin gate is `defineAbilityFor(session).can('moderate', 'admins')` — only the global `admin` role has it (CASL grants admins every action/subject pair; no other role gets `moderate admins`). The backend re-checks with `confirmPermission`, so this is UX, not security. Backend refusals (self-ban, target is admin, active ban already exists, user not found) arrive as `ApiError` with a human-readable message — pass it through verbatim.

```typescript
'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { createSiteBan, liftSiteBan } from '~src/lib/bans';
import { resolveGame } from '~src/lib/games-v1';
import { revalidateAffectedBoards } from '~src/lib/moderation/revalidate-boards';
import { defineAbilityFor } from '~src/rbac/ability';
import type { AffectedLeaderboard } from '../../../../../../../../types/moderation.types';

/**
 * Site-wide anonymize ban, filed from board curation. Admin-only — a game
 * moderator role is NOT enough (this bans the account everywhere). The
 * backend queues cross-game cache rebuilds itself; `board` is only used to
 * refresh the frontend cache for the board the admin is looking at.
 */
export async function anonymizeRunnerAction(
    gameSlug: string,
    input: { username: string; reason: string; board: AffectedLeaderboard },
): Promise<{ ok: true; banId: number } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };
    if (!defineAbilityFor(session).can('moderate', 'admins')) {
        return { error: 'Only site admins can anonymize a runner.' };
    }

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };

    try {
        const ban = await createSiteBan(session.id, {
            username: input.username,
            reason: input.reason,
            runTreatment: 'anonymize',
        });
        await revalidateAffectedBoards(game.id, game.name, [input.board]);
        return { ok: true, banId: ban.id };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to anonymize.' };
    }
}

/** Inverse of `anonymizeRunnerAction`, used only by its undo toast. */
export async function liftSiteBanAction(
    banId: number,
    gameSlug: string,
    board: AffectedLeaderboard,
): Promise<{ ok: true } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };
    if (!defineAbilityFor(session).can('moderate', 'admins')) {
        return { error: 'Only site admins can lift a site-wide ban.' };
    }

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };

    try {
        await liftSiteBan(session.id, banId, 'Undone from board curation');
        await revalidateAffectedBoards(game.id, game.name, [board]);
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to lift the ban.' };
    }
}
```

- [ ] **Step 2: Typecheck (baseline diff)**

Run: `npm run typecheck 2>&1 | grep "anonymize.action"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/moderation/shared/actions/anonymize.action.ts"
git commit -m "feat(console): anonymize + lift-ban server actions (admin-only)"
```

---

### Task 3: RowActions — Anonymize button + dialog (TDD)

**Files:**
- Test: `app/(new-layout)/games-v2/[game]/manage/boards/row-actions-anonymize.test.tsx` (create)
- Modify: `app/(new-layout)/games-v2/[game]/manage/boards/row-actions.tsx`

**Interfaces:**
- Consumes: `anonymizeRunnerAction` / `liftSiteBanAction` from Task 2 (exact signatures in Task 2's Produces block); `fireUndoToast(message: string, undo: () => Promise<{ ok: true } | { error: string }>, onUndone: () => void)` from `../moderation/shared/undo-toast`; `BoardDialog` from `../../shared/board-dialog` (already imported in the file).
- Produces: `RowActionsProps` gains optional `canSiteBan?: boolean` (default false — the existing render site in `board-curation.tsx` and existing tests compile unchanged). Task 4 relies on this prop name.

- [ ] **Step 1: Write the failing tests**

Create `row-actions-anonymize.test.tsx`. Fixtures mirror `row-actions.test.tsx` (same directory) but this file mocks the anonymize action module and `fireUndoToast`. The unrelated action modules are mocked too because `row-actions.tsx` imports them at module scope.

```tsx
// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import type { LeaderboardRosterRow } from '../../../../../../types/moderation.types';
import { RowActions, type RowActionsProps } from './row-actions';

const mocks = vi.hoisted(() => ({
    anonymizeRunnerAction: vi.fn(),
    liftSiteBanAction: vi.fn(),
    excludeAction: vi.fn(),
    previewExcludeAction: vi.fn(),
    createManualTimeAction: vi.fn(),
    markRunsAction: vi.fn(),
    moveRunAction: vi.fn(),
    fireUndoToast: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
}));

vi.mock('../moderation/shared/actions/anonymize.action', () => ({
    anonymizeRunnerAction: mocks.anonymizeRunnerAction,
    liftSiteBanAction: mocks.liftSiteBanAction,
}));
vi.mock('../moderation/shared/actions/exclude.action', () => ({
    excludeAction: mocks.excludeAction,
    previewExcludeAction: mocks.previewExcludeAction,
}));
vi.mock('../moderation/shared/actions/manual-times.action', () => ({
    createManualTimeAction: mocks.createManualTimeAction,
}));
vi.mock('../moderation/shared/actions/marks.action', () => ({
    markRunsAction: mocks.markRunsAction,
}));
vi.mock('../moderation/shared/actions/board-override.action', () => ({
    moveRunAction: mocks.moveRunAction,
}));
vi.mock('../moderation/shared/undo-toast', () => ({
    fireUndoToast: mocks.fireUndoToast,
}));
vi.mock('react-toastify', () => ({
    toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

const CATEGORY: ResolvedCategory = {
    id: 10,
    name: 'any-percent',
    display: 'Any%',
    primaryTiming: 'rt',
    archived: false,
    isMain: true,
    sortOrder: 1,
};

function rosterRow(
    overrides: Partial<LeaderboardRosterRow>,
): LeaderboardRosterRow {
    return {
        runId: 1,
        userId: 5,
        runnerName: 'runner',
        subcategoryKey: '',
        time: 20_000,
        gameTime: null,
        verificationStatus: 'verified',
        vodUrl: null,
        endedAt: '2026-01-01T00:00:00.000Z',
        isLeaderboardEntry: true,
        isLeaderboardEntryGt: false,
        ...overrides,
    };
}

function renderRowActions(overrides: Partial<RowActionsProps> = {}) {
    const onMutated = vi.fn();
    const onRemove = vi.fn();
    const props: RowActionsProps = {
        row: rosterRow({}),
        category: CATEGORY,
        categories: [CATEGORY],
        variables: [],
        subcategoryKey: '',
        gameSlug: 'some-game',
        timeMs: 20_000,
        belowMinimum: false,
        removing: false,
        onRemove,
        onMutated,
        canSiteBan: true,
        ...overrides,
    };
    render(
        <table>
            <tbody>
                <tr>
                    <RowActions {...props} />
                </tr>
            </tbody>
        </table>,
    );
    return { onMutated, onRemove };
}

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    cleanup();
});

describe('RowActions — Anonymize', () => {
    it('is hidden without canSiteBan', () => {
        renderRowActions({ canSiteBan: false });
        expect(
            screen.queryByRole('button', { name: 'Anonymize' }),
        ).toBeNull();
    });

    it('is hidden by default (prop omitted)', () => {
        renderRowActions({ canSiteBan: undefined });
        expect(
            screen.queryByRole('button', { name: 'Anonymize' }),
        ).toBeNull();
    });

    it('is hidden for guest rows even for admins', () => {
        renderRowActions({ row: rosterRow({ userId: null }) });
        expect(
            screen.queryByRole('button', { name: 'Anonymize' }),
        ).toBeNull();
    });

    it('opens a dialog whose confirm is disabled until a reason is given', () => {
        renderRowActions();
        fireEvent.click(screen.getByRole('button', { name: 'Anonymize' }));
        const confirm = screen.getByRole('button', {
            name: 'Confirm anonymize',
        });
        expect(confirm).toHaveProperty('disabled', true);
        fireEvent.change(screen.getByLabelText('Reason — required'), {
            target: { value: 'ToS violation' },
        });
        expect(confirm).toHaveProperty('disabled', false);
    });

    it('confirm calls the action, reloads, and fires the undo toast', async () => {
        mocks.anonymizeRunnerAction.mockResolvedValue({ ok: true, banId: 77 });
        mocks.liftSiteBanAction.mockResolvedValue({ ok: true });
        const { onMutated } = renderRowActions();

        fireEvent.click(screen.getByRole('button', { name: 'Anonymize' }));
        fireEvent.change(screen.getByLabelText('Reason — required'), {
            target: { value: 'ToS violation' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Confirm anonymize' }),
        );

        await waitFor(() =>
            expect(mocks.anonymizeRunnerAction).toHaveBeenCalledWith(
                'some-game',
                {
                    username: 'runner',
                    reason: 'ToS violation',
                    board: { categoryId: 10, subcategoryKey: '' },
                },
            ),
        );
        await waitFor(() => expect(onMutated).toHaveBeenCalled());
        expect(mocks.fireUndoToast).toHaveBeenCalledWith(
            'runner anonymized site-wide.',
            expect.any(Function),
            onMutated,
        );
        // Dialog closed.
        expect(
            screen.queryByRole('button', { name: 'Confirm anonymize' }),
        ).toBeNull();

        // The undo closure lifts the ban that was just created.
        const undo = mocks.fireUndoToast.mock.calls[0][1];
        await undo();
        expect(mocks.liftSiteBanAction).toHaveBeenCalledWith(77, 'some-game', {
            categoryId: 10,
            subcategoryKey: '',
        });
    });

    it('shows the backend error and keeps the dialog open on failure', async () => {
        mocks.anonymizeRunnerAction.mockResolvedValue({
            error: 'You cannot ban an admin',
        });
        renderRowActions();

        fireEvent.click(screen.getByRole('button', { name: 'Anonymize' }));
        fireEvent.change(screen.getByLabelText('Reason — required'), {
            target: { value: 'nope' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Confirm anonymize' }),
        );

        await waitFor(() =>
            expect(mocks.toastError).toHaveBeenCalledWith(
                'You cannot ban an admin',
            ),
        );
        expect(mocks.fireUndoToast).not.toHaveBeenCalled();
        expect(
            screen.getByRole('button', { name: 'Confirm anonymize' }),
        ).toBeTruthy();
    });
});
```

Note: `getByLabelText('Reason — required')` collides with the Ban dialog's identical label only if both dialogs are open — they never are, so this is safe. Use an em dash (`—`) exactly as in the label.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run row-actions-anonymize`
Expected: FAIL — `canSiteBan` does not exist on `RowActionsProps` (TS) / no "Anonymize" button rendered.

- [ ] **Step 3: Implement in `row-actions.tsx`**

3a. Add imports (extend the existing import block from `../moderation/shared/actions/`):

```typescript
import {
    anonymizeRunnerAction,
    liftSiteBanAction,
} from '../moderation/shared/actions/anonymize.action';
```

3b. Add to `RowActionsProps` (after `belowMinimum`):

```typescript
    /** Viewer may file a SITE-WIDE anonymize ban — admins only
     * (`ability.can('moderate', 'admins')`), never game moderators.
     * Defaults to false so the wizard mounts and older render sites are
     * unaffected. */
    canSiteBan?: boolean;
```

and destructure it in the component signature: `canSiteBan = false,` (between `belowMinimum` and `removing`).

3c. Add state + handlers after the `// ---- Ban ----` block:

```typescript
    // ---- Anonymize (site-wide ban, admins only) -----------------------
    const [anonOpen, setAnonOpen] = useState(false);
    const [anonReason, setAnonReason] = useState('');
    const [isAnonymizing, startAnonymize] = useTransition();

    const openAnonymize = () => {
        if (row.userId == null) return;
        setAnonReason('');
        setAnonOpen(true);
    };

    const closeAnonymize = () => {
        if (isAnonymizing) return;
        setAnonOpen(false);
    };

    const confirmAnonymize = () => {
        if (row.userId == null || anonReason.trim().length === 0) return;
        const board = { categoryId: category.id, subcategoryKey };
        startAnonymize(async () => {
            const res = await anonymizeRunnerAction(gameSlug, {
                username: row.runnerName,
                reason: anonReason.trim(),
                board,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setAnonOpen(false);
            onMutated();
            // Same portal-based toast Move uses — survives this row
            // unmounting when the reload drops the (now-masked) roster row.
            fireUndoToast(
                `${row.runnerName} anonymized site-wide.`,
                () => liftSiteBanAction(res.banId, gameSlug, board),
                onMutated,
            );
        });
    };
```

3d. Add `isAnonymizing` to the `busy` disjunction.

3e. Add the button between Ban and Fix time (inside the `actionCluster` div):

```tsx
                    {canSiteBan && !isGuest && (
                        <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={openAnonymize}
                            disabled={busy}
                        >
                            Anonymize
                        </button>
                    )}
```

3f. Add the dialog after the Ban dialog block, before the Move dialog:

```tsx
            {anonOpen && !isGuest && (
                <BoardDialog
                    open
                    onClose={closeAnonymize}
                    labelledBy="anonymize-sheet-title"
                    size="sm"
                    closeOnBackdropClick={!isAnonymizing}
                >
                    <div className={styles.dialogHeader}>
                        <h5
                            id="anonymize-sheet-title"
                            className={styles.dialogTitle}
                        >
                            Anonymize {row.runnerName}
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={closeAnonymize}
                            disabled={isAnonymizing}
                        />
                    </div>
                    <div className={styles.dialogBody}>
                        <p>
                            <strong>Site-wide ban, runs kept.</strong>{' '}
                            {row.runnerName}’s account is locked out of
                            therun.gg entirely. Their name shows as
                            “Anonymous Runner” on public boards across every
                            game; their runs stay on the boards and still
                            count.
                        </p>
                        <p>
                            Moderation views (including this table) keep
                            showing the real name.
                        </p>
                        <label
                            htmlFor="anonymize-reason"
                            className={styles.fieldLabel}
                        >
                            Reason — required
                        </label>
                        <textarea
                            id="anonymize-reason"
                            className={styles.dialogTextarea}
                            rows={3}
                            value={anonReason}
                            onChange={(e) => setAnonReason(e.target.value)}
                            disabled={isAnonymizing}
                        />
                    </div>
                    <div className={styles.dialogFooter}>
                        <button
                            type="button"
                            className={styles.slipAction}
                            onClick={closeAnonymize}
                            disabled={isAnonymizing}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.confirmBtn}
                            onClick={confirmAnonymize}
                            disabled={
                                isAnonymizing ||
                                anonReason.trim().length === 0
                            }
                        >
                            {isAnonymizing
                                ? 'Anonymizing…'
                                : 'Confirm anonymize'}
                        </button>
                    </div>
                </BoardDialog>
            )}
```

3g. Update the component's doc comment action list from "(Later, Remove, Ban, Fix time, Move)" to "(Later, Remove, Ban, Anonymize, Fix time, Move)".

`fireUndoToast` and `toast` are already imported in this file.

- [ ] **Step 4: Run the new tests — verify they pass**

Run: `npx vitest run row-actions-anonymize`
Expected: 6 passed.

- [ ] **Step 5: Run the neighboring suites for regressions**

Run: `npx vitest run row-actions board-curation`
Expected: all pass (existing `row-actions.test.tsx` builds full `RowActionsProps` without `canSiteBan` — optional prop keeps it compiling).

- [ ] **Step 6: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/boards/row-actions.tsx" "app/(new-layout)/games-v2/[game]/manage/boards/row-actions-anonymize.test.tsx"
git commit -m "feat(console): admin-only Anonymize action in board curation rows"
```

---

### Task 4: Thread `canSiteBan` from the server page to the row

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/nav-model.ts` (NavFlags, ~line 37)
- Modify: `app/(new-layout)/games-v2/[game]/manage/page.tsx` (flags object, ~line 232)
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/console-shell.tsx` (ContentRouter render, ~line 418)
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/content-router.tsx` (props + BoardCuration render, ~line 163)
- Modify: `app/(new-layout)/games-v2/[game]/manage/boards/board-curation.tsx` (props ~line 67, component signature ~line 151, RowActions render ~line 1159)

**Interfaces:**
- Consumes: `RowActionsProps.canSiteBan?: boolean` from Task 3; `ability = defineAbilityFor(session)` already computed in `page.tsx:74`.
- Produces: nothing downstream — this completes the wire.

No new tests: this is prop plumbing through five components; the behavior at both ends is already covered (Task 3's component tests; `buildNav` ignores the new optional flag so `tile-grid.test.tsx`'s `NO_FLAGS` fixtures compile unchanged).

- [ ] **Step 1: `nav-model.ts` — add the optional flag**

Append to `NavFlags`:

```typescript
    /** ability.can('moderate','admins') — global admins only. Rides
     * NavFlags for transport; buildNav does not read it. */
    canSiteBan?: boolean;
```

- [ ] **Step 2: `page.tsx` — compute it**

In the `flags={{ ... }}` object passed to `ConsoleShell` (~line 232), add:

```typescript
                    canSiteBan: ability.can('moderate', 'admins'),
```

- [ ] **Step 3: `console-shell.tsx` — pass it to ContentRouter**

At the `<ContentRouter` render (near the existing `canConfigureBoards={flags.canConfigure}` at ~line 418), add:

```tsx
                    canSiteBan={flags.canSiteBan ?? false}
```

- [ ] **Step 4: `content-router.tsx` — accept and forward**

Add to `ContentRouterProps` (after `canConfigureBoards`):

```typescript
    /** Viewer may file site-wide anonymize bans from the Boards pane —
     * admins only, threaded through to RowActions. */
    canSiteBan: boolean;
```

In the `case 'boards':` render, add to `<BoardCuration`:

```tsx
                    canSiteBan={props.canSiteBan}
```

- [ ] **Step 5: `board-curation.tsx` — accept and forward**

Add to `BoardCurationProps` (after `canConfigure`):

```typescript
    /** Admin-only site-wide anonymize in row actions. Optional so the
     * setup-wizard mounts (which never pass it) stay admin-feature-free. */
    canSiteBan?: boolean;
```

Destructure in the component signature with default: `canSiteBan = false,`.

At the `<RowActions` render (~line 1159), add:

```tsx
                                                        canSiteBan={
                                                            canSiteBan
                                                        }
```

(Biome will settle the exact wrapping on commit.)

- [ ] **Step 6: Typecheck (baseline diff)**

Run: `npm run typecheck 2>&1 | grep -E "nav-model|console-shell|content-router|board-curation|manage/page"`
Expected: no NEW errors in these files (compare against the same grep on the pre-change tree if anything shows up — the baseline has ~356 errors repo-wide).

- [ ] **Step 7: Full test suite**

Run: `npm run test`
Expected: same pass/fail set as before this branch's changes (no new failures; the suite is expected green in `app/(new-layout)` tests).

- [ ] **Step 8: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/manage/console/nav-model.ts" "app/(new-layout)/games-v2/[game]/manage/page.tsx" "app/(new-layout)/games-v2/[game]/manage/console/console-shell.tsx" "app/(new-layout)/games-v2/[game]/manage/console/content-router.tsx" "app/(new-layout)/games-v2/[game]/manage/boards/board-curation.tsx"
git commit -m "feat(console): thread admin canSiteBan flag to board-curation rows"
```

---

## Verification checklist (post-implementation)

- `npx vitest run row-actions-anonymize row-actions board-curation` — green.
- `npm run typecheck` — no new errors vs baseline (repo baseline is ~356 pre-existing).
- Spec deviations: none expected. If the wizard mounts of `BoardCuration` (`setup/steps/step-boards.tsx`, `step-category-setup.tsx`) show type errors, something added `canSiteBan` as required — it must stay optional.
- Out of scope (per spec): mod-facing anonymize, an `/admin/bans` list/lift page, Remove/Ban rework.
