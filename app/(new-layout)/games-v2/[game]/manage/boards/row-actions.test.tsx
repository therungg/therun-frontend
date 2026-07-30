// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type {
    LeaderboardRosterRow,
    UserEligibleRunRow,
} from '../../../../../../types/moderation.types';
import {
    type PendingRemoval,
    PendingRemovalCells,
    RowActions,
    type RowActionsProps,
} from './row-actions';

// vi.mock factories are hoisted above these imports, so the mock fns
// themselves must be created through vi.hoisted rather than referenced as
// plain outer `const`s (which would still be in their TDZ when the factory
// runs) — see variables-section.test.tsx for the same pattern.
const mocks = vi.hoisted(() => ({
    excludeAction: vi.fn(),
    previewExcludeAction: vi.fn(),
    createManualTimeAction: vi.fn(),
    markRunsAction: vi.fn(),
    moveRunAction: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
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

const CATEGORY_ALT: ResolvedCategory = {
    id: 20,
    name: 'all-bosses',
    display: 'All Bosses',
    primaryTiming: 'rt',
    archived: false,
    isMain: true,
    sortOrder: 2,
};

const NG_PLUS_VAR: VariableRow = {
    id: 100,
    gameId: 1,
    categoryId: CATEGORY.id,
    name: 'NG+',
    nameNormalized: 'ngplus',
    role: 'subcategory',
    values: [['No'], ['Yes']],
    defaultValueIndex: 0,
    sortOrder: 0,
    description: null,
    version: 1,
    published: true,
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
    const row = overrides.row ?? rosterRow({});
    const props: RowActionsProps = {
        row,
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
    return { onMutated, onRemove, row: props.row };
}

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    cleanup();
});

describe('RowActions — Later', () => {
    it('toggles optimistically and calls markRunsAction with the right args', () => {
        // Replaced synchronously below, before this default is ever
        // reachable — placeholder to satisfy the type until then.
        let resolveMark: (v: unknown) => void = () => {
            /* noop */
        };
        mocks.markRunsAction.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveMark = resolve;
                }),
        );
        renderRowActions();

        const laterBtn = screen.getByRole('button', { name: 'Later' });
        expect(laterBtn.getAttribute('aria-pressed')).toBe('false');

        fireEvent.click(laterBtn);

        // Optimistic: the button flips before the action resolves.
        expect(laterBtn.getAttribute('aria-pressed')).toBe('true');
        expect(mocks.markRunsAction).toHaveBeenCalledWith(
            'some-game',
            [1],
            true,
        );

        resolveMark({ ok: true, updated: 1 });
    });

    it('reverts the toggle and toasts on error', async () => {
        mocks.markRunsAction.mockResolvedValue({ error: 'nope' });
        renderRowActions();

        const laterBtn = screen.getByRole('button', { name: 'Later' });
        fireEvent.click(laterBtn);

        await waitFor(() =>
            expect(laterBtn.getAttribute('aria-pressed')).toBe('false'),
        );
        expect(mocks.toastError).toHaveBeenCalledWith('nope');
    });
});

// Remove's actual mutation (the exclude call, the undo toast, the next-run
// slip) is owned by `BoardCuration`, not `RowActions` — see the `removing`
// doc on `RowActionsProps`. That orchestration is covered by
// board-curation-remove-integration.test.tsx (which also carries the
// required regression coverage for a sibling row's reload). Here, `RowActions`
// only needs to prove it defers to the parent and respects `removing`.
describe('RowActions — Remove', () => {
    it('calls onRemove and does not talk to the exclude action itself', () => {
        const { onRemove } = renderRowActions();

        fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

        expect(onRemove).toHaveBeenCalledTimes(1);
        expect(mocks.excludeAction).not.toHaveBeenCalled();
    });

    it('disables the whole cluster while a removal is in flight for this row', () => {
        renderRowActions({ removing: true });

        for (const name of ['Later', 'Remove', 'Ban', 'Fix time', 'Move…']) {
            expect(
                (screen.getByRole('button', { name }) as HTMLButtonElement)
                    .disabled,
            ).toBe(true);
        }
    });
});

describe('RowActions — Ban', () => {
    it('renders the preview sheet before excluding, and gates Confirm on a reason', async () => {
        mocks.previewExcludeAction.mockResolvedValue({
            ok: true,
            preview: {
                affectedRunCount: 3,
                affectedLeaderboards: [
                    {
                        categoryId: 10,
                        categoryName: 'Any%',
                        subcategoryKey: '',
                        affectedInThisLeaderboard: 3,
                        rankChanges: [],
                    },
                ],
                sampleRuns: [],
            },
        });
        mocks.excludeAction.mockResolvedValue({
            ok: true,
            result: { ruleId: 1, alreadyExists: false },
        });

        renderRowActions();

        fireEvent.click(screen.getByRole('button', { name: 'Ban' }));

        expect(mocks.previewExcludeAction).toHaveBeenCalledWith('some-game', {
            rule: { type: 'user', targetId: 5 },
        });
        expect(mocks.excludeAction).not.toHaveBeenCalled();

        await waitFor(() => expect(screen.getByText('3')).toBeTruthy());

        const confirmBtn = screen.getByRole('button', {
            name: 'Confirm ban',
        }) as HTMLButtonElement;
        expect(confirmBtn.disabled).toBe(true);

        fireEvent.change(screen.getByLabelText('Reason — required'), {
            target: { value: 'Repeated cheating.' },
        });
        expect(confirmBtn.disabled).toBe(false);

        fireEvent.click(confirmBtn);

        await waitFor(() =>
            expect(mocks.excludeAction).toHaveBeenCalledWith('some-game', {
                rule: { type: 'user', targetId: 5 },
                reason: 'Repeated cheating.',
            }),
        );
    });

    it('never renders Ban, and never calls exclude, for a guest row', () => {
        renderRowActions({ row: rosterRow({ userId: null }) });
        expect(screen.queryByRole('button', { name: 'Ban' })).toBeNull();
        expect(mocks.previewExcludeAction).not.toHaveBeenCalled();
        expect(mocks.excludeAction).not.toHaveBeenCalled();
    });
});

describe('RowActions — Move', () => {
    it('opens with the current placement selected and Apply disabled (no-op)', () => {
        renderRowActions({
            categories: [CATEGORY, CATEGORY_ALT],
            variables: [NG_PLUS_VAR],
            subcategoryKey: 'ngplus=No',
        });

        fireEvent.click(screen.getByRole('button', { name: 'Move…' }));

        expect(
            (
                screen.getByRole('button', {
                    name: 'Apply',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
        expect(screen.getByText('Already placed here.')).toBeTruthy();
    });

    it('builds the target key from the selected bands and calls moveRunAction, then fires an undo toast', async () => {
        mocks.moveRunAction.mockResolvedValue({ ok: true });
        const { onMutated } = renderRowActions({
            categories: [CATEGORY, CATEGORY_ALT],
            variables: [NG_PLUS_VAR],
            subcategoryKey: 'ngplus=No',
        });

        fireEvent.click(screen.getByRole('button', { name: 'Move…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

        const applyBtn = screen.getByRole('button', {
            name: 'Apply',
        }) as HTMLButtonElement;
        expect(applyBtn.disabled).toBe(false);
        fireEvent.click(applyBtn);

        await waitFor(() =>
            expect(mocks.moveRunAction).toHaveBeenCalledWith('some-game', 1, {
                categoryId: CATEGORY.id,
                subcategoryKey: 'ngplus=Yes',
            }),
        );
        expect(onMutated).toHaveBeenCalled();
        expect(mocks.toastSuccess).toHaveBeenCalled();

        // The undo toast's render-prop calls the null variant to restore.
        const undoRenderProp = mocks.toastSuccess.mock.calls[0][0];
        render(undoRenderProp({ closeToast: vi.fn() }));
        mocks.moveRunAction.mockClear();
        mocks.moveRunAction.mockResolvedValue({ ok: true });
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        await waitFor(() =>
            expect(mocks.moveRunAction).toHaveBeenCalledWith(
                'some-game',
                1,
                null,
            ),
        );
    });

    it('calls moveRunAction with a different target category once selected', async () => {
        mocks.moveRunAction.mockResolvedValue({ ok: true });
        renderRowActions({
            categories: [CATEGORY, CATEGORY_ALT],
            variables: [],
            subcategoryKey: '',
        });

        fireEvent.click(screen.getByRole('button', { name: 'Move…' }));
        fireEvent.change(screen.getByLabelText('Category'), {
            target: { value: String(CATEGORY_ALT.id) },
        });

        const applyBtn = screen.getByRole('button', {
            name: 'Apply',
        }) as HTMLButtonElement;
        expect(applyBtn.disabled).toBe(false);
        fireEvent.click(applyBtn);

        await waitFor(() =>
            expect(mocks.moveRunAction).toHaveBeenCalledWith('some-game', 1, {
                categoryId: CATEGORY_ALT.id,
                subcategoryKey: '',
            }),
        );
    });

    it('surfaces a backend error inline instead of closing the sheet', async () => {
        mocks.moveRunAction.mockResolvedValue({
            error: 'Already placed there.',
        });
        renderRowActions({
            categories: [CATEGORY, CATEGORY_ALT],
            variables: [],
            subcategoryKey: '',
        });

        fireEvent.click(screen.getByRole('button', { name: 'Move…' }));
        fireEvent.change(screen.getByLabelText('Category'), {
            target: { value: String(CATEGORY_ALT.id) },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        await waitFor(() =>
            expect(screen.getByText('Already placed there.')).toBeTruthy(),
        );
        expect(screen.getByRole('button', { name: 'Apply' })).toBeTruthy();
    });
});

describe('RowActions — Fix time', () => {
    it('submits the parsed ms with a userId runnerRef for a registered runner', async () => {
        mocks.createManualTimeAction.mockResolvedValue({
            ok: true,
            result: { id: 1, affectedLeaderboards: [] },
        });
        renderRowActions();

        fireEvent.click(screen.getByRole('button', { name: 'Fix time' }));
        const input = screen.getByLabelText('Fix time for runner');
        fireEvent.change(input, { target: { value: '35:48' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() =>
            expect(mocks.createManualTimeAction).toHaveBeenCalledWith(
                'some-game',
                {
                    runnerRef: { userId: 5 },
                    categoryId: CATEGORY.id,
                    subcategoryKey: '',
                    timing: 'realtime',
                    timeMs: 35 * 60_000 + 48_000,
                    reason: 'Corrected during board curation',
                },
            ),
        );
    });

    it('submits a guestName runnerRef for a guest row', async () => {
        mocks.createManualTimeAction.mockResolvedValue({
            ok: true,
            result: { id: 1, affectedLeaderboards: [] },
        });
        renderRowActions({
            row: rosterRow({ userId: null, runnerName: 'guestrunner' }),
        });

        fireEvent.click(screen.getByRole('button', { name: 'Fix time' }));
        const input = screen.getByLabelText('Fix time for guestrunner');
        fireEvent.change(input, { target: { value: '10:00' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() =>
            expect(mocks.createManualTimeAction).toHaveBeenCalledWith(
                'some-game',
                expect.objectContaining({
                    runnerRef: { guestName: 'guestrunner' },
                }),
            ),
        );
    });

    it('cancels on Escape without submitting', () => {
        renderRowActions();
        fireEvent.click(screen.getByRole('button', { name: 'Fix time' }));
        const input = screen.getByLabelText('Fix time for runner');
        fireEvent.keyDown(input, { key: 'Escape' });

        expect(screen.queryByLabelText('Fix time for runner')).toBeNull();
        expect(mocks.createManualTimeAction).not.toHaveBeenCalled();
    });
});

const CANDIDATE: UserEligibleRunRow = {
    runId: 2,
    categoryId: CATEGORY.id,
    categoryName: 'Any%',
    subcategoryKey: '',
    time: 15_000,
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

function pendingRemoval(overrides: Partial<PendingRemoval>): PendingRemoval {
    return {
        row: rosterRow({}),
        timeMs: 20_000,
        nextRun: null,
        nextRunLoading: false,
        ...overrides,
    };
}

function renderPendingCells(overrides: Partial<PendingRemoval> = {}) {
    const onKeepIt = vi.fn();
    const onRemoveToo = vi.fn();
    render(
        <table>
            <tbody>
                <tr>
                    <PendingRemovalCells
                        pending={pendingRemoval(overrides)}
                        timing="rt"
                        onKeepIt={onKeepIt}
                        onRemoveToo={onRemoveToo}
                    />
                </tr>
            </tbody>
        </table>,
    );
    return { onKeepIt, onRemoveToo };
}

describe('PendingRemovalCells', () => {
    it('shows "Removed." with no slip when there is no candidate yet', () => {
        renderPendingCells({ nextRun: null, nextRunLoading: false });
        expect(screen.getByText('Removed.')).toBeTruthy();
        expect(screen.queryByText(/next:/)).toBeNull();
    });

    it('shows a loading note while checking for a replacement', () => {
        renderPendingCells({ nextRunLoading: true });
        expect(screen.getByText('Checking for a replacement…')).toBeTruthy();
    });

    it('shows the slip and wires Keep it / Remove too to the callbacks', () => {
        const { onKeepIt, onRemoveToo } = renderPendingCells({
            nextRun: CANDIDATE,
            nextRunLoading: false,
        });

        expect(screen.getByText(/next:/)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
        expect(onKeepIt).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: 'Remove too' }));
        expect(onRemoveToo).toHaveBeenCalledTimes(1);
    });
});
