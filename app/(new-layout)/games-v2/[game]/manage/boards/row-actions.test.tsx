// @vitest-environment jsdom
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
    applyVerdictsAction: vi.fn(),
    moveRunAction: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    RunnerDialog: vi.fn().mockReturnValue(null),
    AdjustDialog: vi.fn().mockReturnValue(null),
}));

vi.mock('../moderation/shared/actions/verdicts.action', () => ({
    applyVerdictsAction: mocks.applyVerdictsAction,
}));
vi.mock('../moderation/shared/actions/board-override.action', () => ({
    moveRunAction: mocks.moveRunAction,
}));
vi.mock('react-toastify', () => ({
    toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));
vi.mock('./runner-dialog', () => ({
    RunnerDialog: mocks.RunnerDialog,
}));
vi.mock('./adjust-dialog', () => ({
    AdjustDialog: mocks.AdjustDialog,
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

describe('RowActions — cluster surface', () => {
    it('shows Remove, Run… and Runner… for a registered user', () => {
        renderRowActions();

        expect(screen.getByRole('button', { name: 'Remove' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Run…' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Runner…' })).toBeTruthy();
    });

    it('shows only Remove and Run… for a guest row (no Runner…)', () => {
        renderRowActions({ row: rosterRow({ userId: null }) });

        expect(screen.getByRole('button', { name: 'Remove' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Run…' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Runner…' })).toBeNull();
    });

    it('never renders the removed Later/Ban/Anonymize/Fix time buttons', () => {
        renderRowActions();
        fireEvent.click(screen.getByRole('button', { name: 'Run…' }));

        for (const name of ['Later', 'Ban', 'Anonymize', 'Fix time']) {
            expect(screen.queryByRole('button', { name })).toBeNull();
        }
    });

    it('disables the whole cluster while a removal is in flight for this row', () => {
        renderRowActions({ removing: true });

        for (const name of ['Remove', 'Run…', 'Runner…']) {
            expect(
                (screen.getByRole('button', { name }) as HTMLButtonElement)
                    .disabled,
            ).toBe(true);
        }
    });
});

describe('RowActions — Remove', () => {
    it('opens a reason popover, keeps confirm disabled until a reason is entered, and calls onRemove with the trimmed reason', () => {
        const { onRemove } = renderRowActions();

        fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

        const panel = screen.getByRole('dialog', { name: 'Remove runner' });
        const confirmBtn = within(panel).getByRole('button', {
            name: 'Remove',
        }) as HTMLButtonElement;
        expect(confirmBtn.disabled).toBe(true);

        fireEvent.change(screen.getByLabelText('Reason — required'), {
            target: { value: '  spam  ' },
        });
        expect(confirmBtn.disabled).toBe(false);

        fireEvent.click(confirmBtn);

        expect(onRemove).toHaveBeenCalledWith('spam');
        expect(mocks.applyVerdictsAction).not.toHaveBeenCalled();
        expect(mocks.moveRunAction).not.toHaveBeenCalled();
        expect(
            screen.queryByRole('dialog', { name: 'Remove runner' }),
        ).toBeNull();
    });

    it('confirms on Enter in the reason input', () => {
        const { onRemove } = renderRowActions();

        fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
        const input = screen.getByLabelText('Reason — required');
        fireEvent.change(input, { target: { value: 'spam' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(onRemove).toHaveBeenCalledWith('spam');
        expect(
            screen.queryByRole('dialog', { name: 'Remove runner' }),
        ).toBeNull();
    });

    it('Escape closes the popover without calling onRemove', () => {
        const { onRemove } = renderRowActions();

        fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
        fireEvent.change(screen.getByLabelText('Reason — required'), {
            target: { value: 'spam' },
        });
        fireEvent.keyDown(document, { key: 'Escape' });

        expect(
            screen.queryByRole('dialog', { name: 'Remove runner' }),
        ).toBeNull();
        expect(onRemove).not.toHaveBeenCalled();
    });
});

describe('RowActions — Run… menu', () => {
    it('lists Approve/Move…/Adjust… for a registered user', () => {
        renderRowActions({ row: rosterRow({ verificationStatus: 'pending' }) });
        fireEvent.click(screen.getByRole('button', { name: 'Run…' }));

        expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Move…' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Adjust…' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Set time…' })).toBeNull();
    });

    it('lists Approve/Move…/Set time… for a guest row', () => {
        renderRowActions({
            row: rosterRow({ userId: null, verificationStatus: 'pending' }),
        });
        fireEvent.click(screen.getByRole('button', { name: 'Run…' }));

        expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Move…' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Set time…' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Adjust…' })).toBeNull();
    });

    it('calls applyVerdictsAction on Approve and closes the menu', async () => {
        mocks.applyVerdictsAction.mockResolvedValue({
            ok: true,
            result: { affectedRunCount: 1, affectedLeaderboards: [] },
        });
        const { onMutated } = renderRowActions({
            row: rosterRow({ verificationStatus: 'pending' }),
        });

        fireEvent.click(screen.getByRole('button', { name: 'Run…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

        await waitFor(() =>
            expect(mocks.applyVerdictsAction).toHaveBeenCalledWith(
                'some-game',
                'verify',
                [1],
                'Approved from board curation',
            ),
        );
        await waitFor(() => expect(onMutated).toHaveBeenCalled());
        expect(mocks.toastSuccess).toHaveBeenCalled();
        expect(screen.queryByRole('button', { name: 'Move…' })).toBeNull();
    });

    it('disables Approve and relabels it "Approved" when already verified', () => {
        renderRowActions({
            row: rosterRow({ verificationStatus: 'verified' }),
        });
        fireEvent.click(screen.getByRole('button', { name: 'Run…' }));

        const approveBtn = screen.getByRole('button', {
            name: 'Approved',
        }) as HTMLButtonElement;
        expect(approveBtn.disabled).toBe(true);
        expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();

        fireEvent.click(approveBtn);
        expect(mocks.applyVerdictsAction).not.toHaveBeenCalled();
    });

    it('toasts an error and keeps the row usable when Approve fails', async () => {
        mocks.applyVerdictsAction.mockResolvedValue({ error: 'nope' });
        const { onMutated } = renderRowActions({
            row: rosterRow({ verificationStatus: 'pending' }),
        });

        fireEvent.click(screen.getByRole('button', { name: 'Run…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

        await waitFor(() =>
            expect(mocks.toastError).toHaveBeenCalledWith('nope'),
        );
        expect(onMutated).not.toHaveBeenCalled();
    });
});

describe('RowActions — Runner… dialog', () => {
    it('mounts RunnerDialog closed, then opens it with the right props on click', () => {
        renderRowActions({ canSiteBan: true });

        expect(mocks.RunnerDialog).toHaveBeenCalled();
        const initialProps =
            mocks.RunnerDialog.mock.calls[
                mocks.RunnerDialog.mock.calls.length - 1
            ][0];
        expect(initialProps.open).toBe(false);
        expect(initialProps.canSiteBan).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: 'Runner…' }));

        const openedProps =
            mocks.RunnerDialog.mock.calls[
                mocks.RunnerDialog.mock.calls.length - 1
            ][0];
        expect(openedProps.open).toBe(true);
        expect(openedProps.canSiteBan).toBe(true);
        expect(openedProps.row.runId).toBe(1);
        expect(openedProps.gameSlug).toBe('some-game');
    });

    it('defaults canSiteBan to false when not supplied', () => {
        renderRowActions();

        const initialProps =
            mocks.RunnerDialog.mock.calls[
                mocks.RunnerDialog.mock.calls.length - 1
            ][0];
        expect(initialProps.canSiteBan).toBe(false);
    });
});

describe('RowActions — Adjust… dialog', () => {
    it('mounts AdjustDialog closed, then opens it with the right props via the Run… menu', () => {
        renderRowActions({ timeMs: 12_345 });

        expect(mocks.AdjustDialog).toHaveBeenCalled();
        const initialProps =
            mocks.AdjustDialog.mock.calls[
                mocks.AdjustDialog.mock.calls.length - 1
            ][0];
        expect(initialProps.open).toBe(false);
        expect(initialProps.timeMs).toBe(12_345);

        fireEvent.click(screen.getByRole('button', { name: 'Run…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Adjust…' }));

        const openedProps =
            mocks.AdjustDialog.mock.calls[
                mocks.AdjustDialog.mock.calls.length - 1
            ][0];
        expect(openedProps.open).toBe(true);
        expect(openedProps.timeMs).toBe(12_345);
        expect(openedProps.row.runId).toBe(1);
        expect(screen.queryByRole('button', { name: 'Adjust…' })).toBeNull();
    });
});

describe('RowActions — Move', () => {
    it('opens (via Run… → Move…) with the current placement selected and Apply disabled (no-op)', () => {
        renderRowActions({
            categories: [CATEGORY, CATEGORY_ALT],
            variables: [NG_PLUS_VAR],
            subcategoryKey: 'ngplus=no',
        });

        fireEvent.click(screen.getByRole('button', { name: 'Run…' }));
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
            subcategoryKey: 'ngplus=no',
        });

        fireEvent.click(screen.getByRole('button', { name: 'Run…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Move…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

        const applyBtn = screen.getByRole('button', {
            name: 'Apply',
        }) as HTMLButtonElement;
        expect(applyBtn.disabled).toBe(false);
        fireEvent.click(applyBtn);

        await waitFor(() =>
            expect(mocks.moveRunAction).toHaveBeenCalledWith(
                'some-game',
                1,
                { categoryId: CATEGORY.id, subcategoryKey: 'ngplus=yes' },
                [
                    { categoryId: CATEGORY.id, subcategoryKey: 'ngplus=no' },
                    { categoryId: CATEGORY.id, subcategoryKey: 'ngplus=yes' },
                ],
            ),
        );
        expect(onMutated).toHaveBeenCalled();
        expect(mocks.toastSuccess).toHaveBeenCalled();

        // The undo toast's render-prop calls the null variant to restore,
        // with the same pair reversed (target loses it, source regains it).
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
                [
                    { categoryId: CATEGORY.id, subcategoryKey: 'ngplus=yes' },
                    { categoryId: CATEGORY.id, subcategoryKey: 'ngplus=no' },
                ],
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

        fireEvent.click(screen.getByRole('button', { name: 'Run…' }));
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
            expect(mocks.moveRunAction).toHaveBeenCalledWith(
                'some-game',
                1,
                { categoryId: CATEGORY_ALT.id, subcategoryKey: '' },
                [
                    { categoryId: CATEGORY.id, subcategoryKey: '' },
                    { categoryId: CATEGORY_ALT.id, subcategoryKey: '' },
                ],
            ),
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

        fireEvent.click(screen.getByRole('button', { name: 'Run…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Move…' }));
        fireEvent.change(screen.getByLabelText('Category'), {
            target: { value: String(CATEGORY_ALT.id) },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        await waitFor(() =>
            expect(screen.getByText('Already placed there.')).toBeTruthy(),
        );
        // findByRole, not getByRole: the error alert can render a beat before
        // the move transition settles, while the button still reads "Moving…".
        expect(
            await screen.findByRole('button', { name: 'Apply' }),
        ).toBeTruthy();
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
        reason: 'Board curation during setup',
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
