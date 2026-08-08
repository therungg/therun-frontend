// @vitest-environment jsdom
//
// Unlike board-curation.test.tsx, `useBoardData` is NOT mocked here — this
// suite exercises the real hook (and BoardCuration's real `reload` wiring)
// so that a sibling row's reload is a genuine state update flowing through
// `rows`, not a hand-fed prop. Only the server-action boundary is mocked.
// This is what lets it catch the class of bug where `onMutated`/`reload` is
// a single function shared across every row: a reload triggered by ANY
// row's action replaces `rows` wholesale, and a naive implementation that
// keeps a removed row's "pending" state inside that same row's component
// would have it unmounted out from under the user by an unrelated sibling
// mutation.
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    ResolvedCategory,
    ResolvedGame,
} from '../../../../../../types/leaderboards.types';
import type {
    LeaderboardRosterRow,
    UserEligibleRunRow,
} from '../../../../../../types/moderation.types';
import { BoardCuration } from './board-curation';

const mocks = vi.hoisted(() => ({
    loadBoardPageAction: vi.fn(),
    excludeAction: vi.fn(),
    previewExcludeAction: vi.fn(),
    restoreRunsAction: vi.fn(),
    createManualTimeAction: vi.fn(),
    markRunsAction: vi.fn(),
    moveRunAction: vi.fn(),
    applyVerdictsAction: vi.fn(),
    loadUserEligibleRunsAction: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    createPolicyAction: vi.fn(),
    updatePolicyAction: vi.fn(),
    deletePolicyAction: vi.fn(),
    updateVariableAction: vi.fn(),
    updateCategorySettingsAction: vi.fn(),
    updateTimingSettingsAction: vi.fn(),
    reorderCategoriesAction: vi.fn(),
    reorderGroupsAction: vi.fn(),
    routerRefresh: vi.fn(),
    /** onUndoComplete captured at the dialog stub's last Confirm — stands in
     * for the real dialog's undo toast, which outlives both the dialog and
     * (crucially for these tests) any sibling reload. */
    lastUndoComplete: { current: null as null | (() => void) },
}));

vi.mock('./actions/load-board-page.action', () => ({
    loadBoardPageAction: mocks.loadBoardPageAction,
}));
vi.mock('../moderation/shared/actions/exclude.action', () => ({
    excludeAction: mocks.excludeAction,
    previewExcludeAction: mocks.previewExcludeAction,
}));
vi.mock('../moderation/shared/actions/restore.action', () => ({
    restoreRunsAction: mocks.restoreRunsAction,
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
vi.mock('../moderation/shared/actions/verdicts.action', () => ({
    applyVerdictsAction: mocks.applyVerdictsAction,
}));
vi.mock('../moderation/shared/actions/eligible-runs.action', () => ({
    loadUserEligibleRunsAction: mocks.loadUserEligibleRunsAction,
}));
vi.mock('react-toastify', () => ({
    toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));
// BoardControls (Task 12's toolbar) is mounted by BoardCuration whenever
// canConfigure is true — mocked here for the same hermeticity reason as the
// row-action modules above: these are real 'use server' modules.
vi.mock('../moderation/policies/actions/policies-actions.action', () => ({
    createPolicyAction: mocks.createPolicyAction,
    updatePolicyAction: mocks.updatePolicyAction,
    deletePolicyAction: mocks.deletePolicyAction,
}));
vi.mock('../variables/actions/update-variable.action', () => ({
    updateVariableAction: mocks.updateVariableAction,
}));
vi.mock('../category-tab/actions/update-category-settings.action', () => ({
    updateCategorySettingsAction: mocks.updateCategorySettingsAction,
}));
vi.mock('../timing/actions/update-timing-settings.action', () => ({
    updateTimingSettingsAction: mocks.updateTimingSettingsAction,
}));
vi.mock('../game-tab/actions/reorder-categories.action', () => ({
    reorderCategoriesAction: mocks.reorderCategoriesAction,
}));
vi.mock('~src/actions/category-group/reorder-groups.action', () => ({
    reorderGroupsAction: mocks.reorderGroupsAction,
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: mocks.routerRefresh, replace: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));
// The shared RunActionDialog performs the remove/approve mutations itself
// (and owns the undo toast) — stubbed to its callback surface. Confirm
// simulates the mutation having landed: it captures onUndoComplete the way
// the real dialog's toast does, then fires onDone. What this suite protects
// is everything BoardCuration does AROUND that boundary.
vi.mock('../moderation/shared/run-action-dialog', () => ({
    RunActionDialog: (props: {
        verb: string;
        onDone: () => void;
        onClose: () => void;
        onUndoComplete?: () => void;
    }) => (
        <div role="dialog" aria-label={`${props.verb} dialog`}>
            <button
                type="button"
                onClick={() => {
                    mocks.lastUndoComplete.current =
                        props.onUndoComplete ?? null;
                    props.onDone();
                }}
            >
                Confirm {props.verb}
            </button>
            <button type="button" onClick={() => props.onClose()}>
                Cancel {props.verb}
            </button>
        </div>
    ),
}));

const GAME: ResolvedGame = { id: 1, name: 'some-game', display: 'Some Game' };

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

const ROW_A = rosterRow({
    runId: 1,
    userId: 5,
    runnerName: 'alice',
    time: 10_000,
});
// Left `unverified` (not the fixture default `verified`) so the sibling
// action used below to trigger bob's own reload — Approve, via the Run…
// menu — isn't disabled.
const ROW_B = rosterRow({
    runId: 2,
    userId: 6,
    runnerName: 'bob',
    time: 20_000,
    verificationStatus: 'unverified',
});
const CANDIDATE: UserEligibleRunRow = {
    runId: 3,
    categoryId: CATEGORY.id,
    categoryName: 'Any%',
    subcategoryKey: '',
    time: 8_000,
    gameTime: null,
    primaryTiming: 'realtime',
    verificationStatus: 'verified',
    vodUrl: null,
    endedAt: '2026-01-01T00:00:00.000Z',
    isLeaderboardEntry: false,
    isLeaderboardEntryGt: false,
    rank: null,
    totalRunners: null,
};

/** Finds the `<tr>` whose rendered text includes `name` — avoids depending
 * on `UserLink`'s internal markup, matching board-curation.test.tsx's
 * existing textContent-based row lookups. */
function rowContaining(name: string): HTMLElement {
    const rows = screen.getAllByRole('row');
    const found = rows.find((r) => r.textContent?.includes(name));
    if (!found) throw new Error(`No row found containing "${name}"`);
    return found;
}

/** Drives the shared Remove dialog (stubbed above) for the row containing
 * `runnerName`: opens Remove… and confirms — simulating the dialog's
 * mutation having landed, which is the moment BoardCuration pins the row. */
function removeRow(runnerName: string) {
    const row = rowContaining(runnerName);
    fireEvent.click(within(row).getByRole('button', { name: 'Remove…' }));
    fireEvent.click(
        within(row).getByRole('button', { name: 'Confirm remove' }),
    );
}

/** Drives the sibling-row Approve through the same stubbed dialog — the
 * point is that its onDone→reload flows through BoardCuration's shared
 * `reload`, exactly like the old instant Approve did. */
function approveRow(runnerName: string) {
    const row = rowContaining(runnerName);
    fireEvent.click(within(row).getByRole('button', { name: 'Run…' }));
    fireEvent.click(within(row).getByRole('button', { name: 'Approve…' }));
    fireEvent.click(
        within(row).getByRole('button', { name: 'Confirm approve' }),
    );
}

function renderBoard() {
    return render(
        <BoardCuration
            game={GAME}
            categories={[CATEGORY]}
            groups={[]}
            variables={[]}
            policies={[]}
            canConfigure
            context="console"
        />,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.lastUndoComplete.current = null;
});

afterEach(() => {
    cleanup();
});

describe("BoardCuration — a sibling row's reload must not kill a pending removal's slip", () => {
    it("keeps row A's slip pinned (and still resolvable) after row B's Approve reloads the board without A", async () => {
        // Initial load has both rows on board. Every reload afterward
        // reflects A already excluded server-side — this is what a naive
        // "clear the slip whenever `rows` changes" implementation would
        // misread as "A is just gone, drop everything about it."
        mocks.loadBoardPageAction
            .mockResolvedValueOnce({
                ok: true,
                rows: [ROW_A, ROW_B],
                total: 2,
                markedTotal: 0,
            })
            .mockResolvedValue({
                ok: true,
                rows: [ROW_B],
                total: 1,
                markedTotal: 0,
            });
        mocks.loadUserEligibleRunsAction.mockResolvedValue({
            ok: true,
            rows: [CANDIDATE],
        });

        renderBoard();

        await waitFor(() =>
            expect(mocks.loadBoardPageAction).toHaveBeenCalledTimes(1),
        );
        await waitFor(() => rowContaining('alice'));
        rowContaining('bob');

        // Remove row A — the dialog's mutation lands, then the next-run
        // slip appears.
        removeRow('alice');
        await waitFor(() => expect(screen.getByText(/next:/)).toBeTruthy());
        expect(screen.getByRole('button', { name: 'Keep it' })).toBeTruthy();

        // Now act on the SIBLING row: Approve bob via the Run… menu. This
        // goes through a completely separate RowActions instance and calls
        // the same `onMutated`/`reload` BoardCuration hands to every row.
        approveRow('bob');
        await waitFor(() =>
            expect(mocks.loadBoardPageAction).toHaveBeenCalledTimes(2),
        );
        // `rows` has now resolved to [ROW_B] only — A is gone from the live
        // data reload just replaced.

        // REGRESSION CHECK: row A and its slip must still be visible. Under
        // the pre-fix design (Remove's pending state lived inside
        // RowActions, keyed off whether the row was still present in
        // `boardRows`), this reload would have unmounted row A's
        // RowActions instance — and the slip inside it — before the user
        // could act on it.
        rowContaining('alice');
        expect(screen.getByText(/next:/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Keep it' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Remove too' })).toBeTruthy();

        // Keep it resolves the slip's lifecycle: dismiss the overlay, then
        // reload — row A (already excluded server-side) then stops
        // rendering for good, and the board is back to a normal, consistent
        // state.
        fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
        await waitFor(() =>
            expect(mocks.loadBoardPageAction).toHaveBeenCalledTimes(3),
        );
        await waitFor(() => {
            expect(
                screen
                    .queryAllByRole('row')
                    .some((r) => r.textContent?.includes('alice')),
            ).toBe(false);
        });
        rowContaining('bob');
    });

    it("also keeps row A's undo affordance working after a sibling reload", async () => {
        mocks.loadBoardPageAction
            .mockResolvedValueOnce({
                ok: true,
                rows: [ROW_A, ROW_B],
                total: 2,
                markedTotal: 0,
            })
            .mockResolvedValue({
                ok: true,
                rows: [ROW_B],
                total: 1,
                markedTotal: 0,
            });
        mocks.loadUserEligibleRunsAction.mockResolvedValue({
            ok: true,
            rows: [CANDIDATE],
        });

        renderBoard();

        await waitFor(() => rowContaining('alice'));
        removeRow('alice');
        await waitFor(() => expect(screen.getByText(/next:/)).toBeTruthy());
        // Capture alice's undo NOW — bob's Approve confirm below also runs
        // through the stub and would overwrite the capture slot, exactly
        // like a newer toast appearing on screen.
        const aliceUndo = mocks.lastUndoComplete.current;
        expect(aliceUndo).toBeTruthy();

        approveRow('bob');
        await waitFor(() =>
            expect(mocks.loadBoardPageAction).toHaveBeenCalledTimes(2),
        );
        rowContaining('alice');

        // The dialog's undo toast outlives the dialog AND the sibling
        // reload — its onUndoComplete (captured at Confirm) must still
        // unpin row A and resync the board.
        act(() => aliceUndo?.());
        await waitFor(() =>
            expect(mocks.loadBoardPageAction).toHaveBeenCalledTimes(3),
        );
        await waitFor(() => {
            expect(
                screen
                    .queryAllByRole('row')
                    .some((r) => r.textContent?.includes('alice')),
            ).toBe(false);
        });
        rowContaining('bob');
    });
});

describe('BoardCuration — stale-closure reload after a category switch', () => {
    const CAT1: ResolvedCategory = {
        id: 10,
        name: 'any-percent',
        display: 'Any%',
        primaryTiming: 'rt',
        archived: false,
        isMain: true,
        sortOrder: 1,
    };
    const CAT2: ResolvedCategory = {
        id: 11,
        name: '100-percent',
        display: '100%',
        primaryTiming: 'rt',
        archived: false,
        isMain: true,
        sortOrder: 2,
    };

    // Guest (no userId) so Remove takes the no-slip path: the dialog's
    // mutation lands, then dropPending+reload immediately — same shape as a
    // resolved slip, just without the intermediate "next:" step.
    const GUEST_ROW = rosterRow({
        runId: 5,
        userId: null,
        runnerName: 'guestannie',
        time: 10_000,
    });
    const CAT2_ROW = rosterRow({
        runId: 6,
        userId: 8,
        runnerName: 'carol',
        time: 15_000,
    });

    it("does not let an undo triggered after switching category resolve the OLD category's roster into the new view", async () => {
        mocks.loadBoardPageAction.mockImplementation(
            async (_slug: string, categoryId: number) =>
                categoryId === CAT1.id
                    ? { ok: true, rows: [GUEST_ROW], total: 1, markedTotal: 0 }
                    : { ok: true, rows: [CAT2_ROW], total: 1, markedTotal: 0 },
        );
        render(
            <BoardCuration
                game={GAME}
                categories={[CAT1, CAT2]}
                groups={[]}
                variables={[]}
                policies={[]}
                canConfigure
                context="console"
            />,
        );

        await waitFor(() => rowContaining('guestannie'));

        // Remove the guest — no candidate flow, so this captures the undo
        // (its onRemoveUndone closure bound to CAT1's reload) and reloads
        // CAT1 immediately.
        removeRow('guestannie');
        await waitFor(() =>
            expect(mocks.loadBoardPageAction).toHaveBeenCalledTimes(2),
        );
        expect(mocks.lastUndoComplete.current).toBeTruthy();
        const staleUndo = mocks.lastUndoComplete.current;

        // Switch to CAT2 before touching the undo.
        fireEvent.click(screen.getByRole('button', { name: '100%' }));
        await waitFor(() => rowContaining('carol'));

        // Now resolve the STALE undo — its closure was captured while CAT1
        // was selected, so without the selection guard in useBoardData its
        // eventual `loadBoardPageAction(gameSlug, CAT1.id, ...)` result
        // would land in the shared `rows` state and silently replace what
        // CAT2's view is showing.
        act(() => staleUndo?.());
        // Three loadBoardPageAction calls total: initial CAT1 mount, the
        // immediate reload after Remove (CAT1), and the switch to CAT2. The
        // stale undo's reload never fires a fourth — its closure was
        // captured under CAT1's key, and useBoardData's selection guard now
        // no-ops the whole call instead of fetching-then-discarding.
        expect(mocks.loadBoardPageAction).toHaveBeenCalledTimes(3);

        // CAT2's roster must still be what's on screen — the stale CAT1
        // reload must not have replaced it.
        await waitFor(() => rowContaining('carol'));
        expect(
            screen
                .queryAllByRole('row')
                .some((r) => r.textContent?.includes('guestannie')),
        ).toBe(false);
    });
});
