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
    loadRosterAction: vi.fn(),
    excludeAction: vi.fn(),
    previewExcludeAction: vi.fn(),
    restoreRunsAction: vi.fn(),
    createManualTimeAction: vi.fn(),
    markRunsAction: vi.fn(),
    moveRunAction: vi.fn(),
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
}));

vi.mock('../moderation/roster/actions/load-roster.action', () => ({
    loadRosterAction: mocks.loadRosterAction,
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
    useRouter: () => ({ refresh: mocks.routerRefresh }),
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
const ROW_B = rosterRow({
    runId: 2,
    userId: 6,
    runnerName: 'bob',
    time: 20_000,
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
});

afterEach(() => {
    cleanup();
});

describe("BoardCuration — a sibling row's reload must not kill a pending removal's slip", () => {
    it("keeps row A's slip pinned (and still resolvable) after row B's Later reloads the board without A", async () => {
        // Initial load has both rows on board. Every reload afterward
        // reflects A already excluded server-side — this is what a naive
        // "clear the slip whenever `rows` changes" implementation would
        // misread as "A is just gone, drop everything about it."
        mocks.loadRosterAction
            .mockResolvedValueOnce({ ok: true, rows: [ROW_A, ROW_B] })
            .mockResolvedValue({ ok: true, rows: [ROW_B] });
        mocks.excludeAction.mockResolvedValue({
            ok: true,
            result: { affectedRunCount: 1, affectedLeaderboards: [] },
        });
        mocks.loadUserEligibleRunsAction.mockResolvedValue({
            ok: true,
            rows: [CANDIDATE],
        });
        mocks.markRunsAction.mockResolvedValue({ ok: true, updated: 1 });

        renderBoard();

        await waitFor(() =>
            expect(mocks.loadRosterAction).toHaveBeenCalledTimes(1),
        );
        await waitFor(() => rowContaining('alice'));
        rowContaining('bob');

        // Remove row A — exclude succeeds, then the next-run slip appears.
        fireEvent.click(
            within(rowContaining('alice')).getByRole('button', {
                name: 'Remove',
            }),
        );
        await waitFor(() =>
            expect(mocks.excludeAction).toHaveBeenCalledWith('some-game', {
                runIds: [1],
                reason: 'Board curation during setup',
            }),
        );
        await waitFor(() => expect(screen.getByText(/next:/)).toBeTruthy());
        expect(screen.getByRole('button', { name: 'Keep it' })).toBeTruthy();

        // Now act on the SIBLING row: Later on bob. This goes through a
        // completely separate RowActions instance and calls the same
        // `onMutated`/`reload` BoardCuration hands to every row.
        fireEvent.click(
            within(rowContaining('bob')).getByRole('button', {
                name: 'Later',
            }),
        );
        await waitFor(() => expect(mocks.markRunsAction).toHaveBeenCalled());
        await waitFor(() =>
            expect(mocks.loadRosterAction).toHaveBeenCalledTimes(2),
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
            expect(mocks.loadRosterAction).toHaveBeenCalledTimes(3),
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
        mocks.loadRosterAction
            .mockResolvedValueOnce({ ok: true, rows: [ROW_A, ROW_B] })
            .mockResolvedValue({ ok: true, rows: [ROW_B] });
        mocks.excludeAction.mockResolvedValue({
            ok: true,
            result: { affectedRunCount: 1, affectedLeaderboards: [] },
        });
        mocks.loadUserEligibleRunsAction.mockResolvedValue({
            ok: true,
            rows: [CANDIDATE],
        });
        mocks.markRunsAction.mockResolvedValue({ ok: true, updated: 1 });
        mocks.restoreRunsAction.mockResolvedValue({ ok: true });

        renderBoard();

        await waitFor(() => rowContaining('alice'));
        fireEvent.click(
            within(rowContaining('alice')).getByRole('button', {
                name: 'Remove',
            }),
        );
        await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalled());

        fireEvent.click(
            within(rowContaining('bob')).getByRole('button', {
                name: 'Later',
            }),
        );
        await waitFor(() =>
            expect(mocks.loadRosterAction).toHaveBeenCalledTimes(2),
        );
        rowContaining('alice');

        // The undo toast's render-prop still works after the sibling
        // reload — it's independent of both the live `rows` state and the
        // pending-removal overlay.
        const undoRenderProp = mocks.toastSuccess.mock.calls[0][0];
        render(undoRenderProp({ closeToast: vi.fn() }));
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        await waitFor(() =>
            expect(mocks.restoreRunsAction).toHaveBeenCalledWith(
                'some-game',
                [1],
                'Undo of remove',
            ),
        );
    });
});
