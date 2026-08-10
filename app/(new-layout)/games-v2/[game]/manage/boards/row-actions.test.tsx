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
import type { LeaderboardRosterRow } from '../../../../../../types/moderation.types';
import { RowActions, type RowActionsProps } from './row-actions';

// vi.mock factories are hoisted above these imports, so the mock fns
// themselves must be created through vi.hoisted rather than referenced as
// plain outer `const`s (which would still be in their TDZ when the factory
// runs) — see variables-section.test.tsx for the same pattern.
const mocks = vi.hoisted(() => ({
    moveRunAction: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    RunnerDialog: vi.fn().mockReturnValue(null),
    AdjustDialog: vi.fn().mockReturnValue(null),
    /** Records every RunActionDialog render's props. */
    dialogRender: vi.fn(),
    /** The onUndoComplete captured at the stub's last Confirm — stands in
     * for the real dialog's undo toast, which outlives the dialog. */
    lastUndoComplete: { current: null as null | (() => void) },
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
// The shared RunActionDialog performs the remove/approve mutations itself
// and has its own suite — here a stub exposes the three callbacks so tests
// assert RowActions' wiring: Confirm → onDone (capturing onUndoComplete the
// way the real dialog's undo toast does), Cancel → onClose.
vi.mock('../moderation/shared/run-action-dialog', () => ({
    RunActionDialog: (props: {
        verb: string;
        gameSlug: string;
        target: unknown;
        onDone: () => void;
        onClose: () => void;
        onUndoComplete?: () => void;
    }) => {
        mocks.dialogRender(props);
        return (
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
        );
    },
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
    const onRemoved = vi.fn();
    const onRemoveUndone = vi.fn();
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
        onRemoved,
        onRemoveUndone,
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
    return { onMutated, onRemoved, onRemoveUndone, row: props.row };
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.lastUndoComplete.current = null;
});

afterEach(() => {
    cleanup();
});

describe('RowActions — cluster surface', () => {
    it('shows Remove…, Run… and Runner… for a registered user', () => {
        renderRowActions();

        expect(screen.getByRole('button', { name: 'Remove…' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Run…' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Runner…' })).toBeTruthy();
    });

    it('shows only Remove… and Run… for a guest row (no Runner…)', () => {
        renderRowActions({ row: rosterRow({ userId: null }) });

        expect(screen.getByRole('button', { name: 'Remove…' })).toBeTruthy();
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
});

describe('RowActions — Remove (shared dialog)', () => {
    it('opens the shared dialog with verb remove targeting this run', () => {
        renderRowActions();

        expect(
            screen.queryByRole('dialog', { name: 'remove dialog' }),
        ).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Remove…' }));

        expect(
            screen.getByRole('dialog', { name: 'remove dialog' }),
        ).toBeTruthy();
        const props =
            mocks.dialogRender.mock.calls[
                mocks.dialogRender.mock.calls.length - 1
            ][0];
        expect(props.verb).toBe('remove');
        expect(props.gameSlug).toBe('some-game');
        expect(props.target).toEqual({
            kind: 'runs',
            runIds: [1],
            label: "runner's run",
            // The row's displayed time and date — the dialog's "This run"
            // card names the run being judged.
            runTimeMs: 20000,
            runDate: '2026-01-01T00:00:00.000Z',
            // Carries who and where, which is what unlocks Remove's
            // "every run on this board" option.
            runner: {
                id: 5,
                name: 'runner',
                categoryId: CATEGORY.id,
                categoryDisplay: CATEGORY.display,
                subcategoryKey: '',
                primaryTiming: CATEGORY.primaryTiming,
            },
        });
    });

    it('fires onRemoved when the dialog lands, and closes it', () => {
        const { onRemoved, onMutated } = renderRowActions();

        fireEvent.click(screen.getByRole('button', { name: 'Remove…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Confirm remove' }));

        expect(onRemoved).toHaveBeenCalledTimes(1);
        expect(onMutated).not.toHaveBeenCalled();
        expect(
            screen.queryByRole('dialog', { name: 'remove dialog' }),
        ).toBeNull();
    });

    it("routes the dialog's undo back through onRemoveUndone", () => {
        const { onRemoveUndone } = renderRowActions();

        fireEvent.click(screen.getByRole('button', { name: 'Remove…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Confirm remove' }));

        // The real dialog's undo toast outlives the dialog — the stub
        // captured onUndoComplete at Confirm, exactly like the toast does.
        expect(mocks.lastUndoComplete.current).toBeTruthy();
        mocks.lastUndoComplete.current?.();
        expect(onRemoveUndone).toHaveBeenCalledTimes(1);
    });

    it('cancelling the dialog fires nothing', () => {
        const { onRemoved } = renderRowActions();

        fireEvent.click(screen.getByRole('button', { name: 'Remove…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel remove' }));

        expect(
            screen.queryByRole('dialog', { name: 'remove dialog' }),
        ).toBeNull();
        expect(onRemoved).not.toHaveBeenCalled();
    });
});

describe('RowActions — Run… menu', () => {
    it('lists Approve…/Move…/Adjust… for a registered user', () => {
        renderRowActions({ row: rosterRow({ verificationStatus: 'pending' }) });
        fireEvent.click(screen.getByRole('button', { name: 'Run…' }));

        expect(screen.getByRole('button', { name: 'Approve…' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Move…' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Adjust…' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Set time…' })).toBeNull();
    });

    it('lists Approve…/Move…/Set time… for a guest row', () => {
        renderRowActions({
            row: rosterRow({ userId: null, verificationStatus: 'pending' }),
        });
        fireEvent.click(screen.getByRole('button', { name: 'Run…' }));

        expect(screen.getByRole('button', { name: 'Approve…' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Move…' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Set time…' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Adjust…' })).toBeNull();
    });

    it('opens the shared dialog with verb approve and fires onMutated on Confirm', () => {
        const { onMutated } = renderRowActions({
            row: rosterRow({ verificationStatus: 'pending' }),
        });

        fireEvent.click(screen.getByRole('button', { name: 'Run…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Approve…' }));

        // Opening the dialog also closes the Run… menu.
        expect(screen.queryByRole('button', { name: 'Move…' })).toBeNull();
        const props =
            mocks.dialogRender.mock.calls[
                mocks.dialogRender.mock.calls.length - 1
            ][0];
        expect(props.verb).toBe('approve');
        expect(props.target.runIds).toEqual([1]);

        fireEvent.click(
            screen.getByRole('button', { name: 'Confirm approve' }),
        );
        expect(onMutated).toHaveBeenCalledTimes(1);
        expect(
            screen.queryByRole('dialog', { name: 'approve dialog' }),
        ).toBeNull();
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
        expect(screen.queryByRole('button', { name: 'Approve…' })).toBeNull();

        fireEvent.click(approveBtn);
        expect(
            screen.queryByRole('dialog', { name: 'approve dialog' }),
        ).toBeNull();
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
