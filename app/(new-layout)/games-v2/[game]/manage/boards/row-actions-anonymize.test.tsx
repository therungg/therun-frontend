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
        expect(screen.queryByRole('button', { name: 'Anonymize' })).toBeNull();
    });

    it('is hidden by default (prop omitted)', () => {
        renderRowActions({ canSiteBan: undefined });
        expect(screen.queryByRole('button', { name: 'Anonymize' })).toBeNull();
    });

    it('is hidden for guest rows even for admins', () => {
        renderRowActions({ row: rosterRow({ userId: null }) });
        expect(screen.queryByRole('button', { name: 'Anonymize' })).toBeNull();
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
