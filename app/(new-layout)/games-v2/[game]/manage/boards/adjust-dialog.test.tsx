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
import type {
    LeaderboardRosterRow,
    UserEligibleRunRow,
} from '../../../../../../types/moderation.types';
import { AdjustDialog, type AdjustDialogProps } from './adjust-dialog';

// vi.mock factories are hoisted above these imports, so the mock fns
// themselves must be created through vi.hoisted rather than referenced as
// plain outer `const`s — see row-actions.test.tsx for the same
// pattern.
const mocks = vi.hoisted(() => ({
    loadUserEligibleRunsAction: vi.fn(),
    excludeAction: vi.fn(),
    restoreRunsAction: vi.fn(),
    createManualTimeAction: vi.fn(),
    fireUndoToast: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
}));

vi.mock('../moderation/shared/actions/eligible-runs.action', () => ({
    loadUserEligibleRunsAction: mocks.loadUserEligibleRunsAction,
}));
vi.mock('../moderation/shared/actions/exclude.action', () => ({
    excludeAction: mocks.excludeAction,
}));
vi.mock('../moderation/shared/actions/restore.action', () => ({
    restoreRunsAction: mocks.restoreRunsAction,
}));
vi.mock('../moderation/shared/actions/manual-times.action', () => ({
    createManualTimeAction: mocks.createManualTimeAction,
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

function eligibleRun(o: Partial<UserEligibleRunRow>): UserEligibleRunRow {
    return {
        runId: 1,
        categoryId: 10,
        categoryName: 'Any%',
        subcategoryKey: '',
        time: 20_000,
        gameTime: null,
        primaryTiming: 'realtime',
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

const DEFAULT_ELIGIBLE: UserEligibleRunRow[] = [
    eligibleRun({ runId: 1, time: 20_000 }),
    eligibleRun({ runId: 2, time: 25_000 }),
    eligibleRun({ runId: 3, time: 30_000 }),
];

function renderDialog(overrides: Partial<AdjustDialogProps> = {}) {
    const onClose = vi.fn();
    const onMutated = vi.fn();
    const props: AdjustDialogProps = {
        open: true,
        onClose,
        row: rosterRow({}),
        category: CATEGORY,
        gameSlug: 'some-game',
        subcategoryKey: '',
        timeMs: 20_000,
        onMutated,
        ...overrides,
    };
    const view = render(<AdjustDialog {...props} />);
    return { onClose, onMutated, ...view };
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadUserEligibleRunsAction.mockResolvedValue({
        ok: true,
        rows: DEFAULT_ELIGIBLE,
    });
});

afterEach(() => {
    cleanup();
});

describe('AdjustDialog', () => {
    it('lists this board’s eligible runs sorted, current entry marked', async () => {
        renderDialog();

        expect(
            screen.getByRole('heading', { name: 'Adjust runner’s entry' }),
        ).toBeTruthy();
        const radios = await screen.findAllByRole('radio');
        expect(radios).toHaveLength(3);

        const currentRadio = screen.getByRole('radio', {
            name: /current entry/,
        });
        expect(currentRadio).toHaveProperty('checked', true);
        expect(currentRadio.closest('label')?.textContent).toMatch(/0:20/);
    });

    it('filters other boards out', async () => {
        mocks.loadUserEligibleRunsAction.mockResolvedValue({
            ok: true,
            rows: [
                ...DEFAULT_ELIGIBLE,
                eligibleRun({ runId: 4, categoryId: 20, time: 15_000 }),
                eligibleRun({
                    runId: 5,
                    subcategoryKey: 'ngplus=Yes',
                    time: 16_000,
                }),
            ],
        });
        renderDialog();

        const radios = await screen.findAllByRole('radio');
        expect(radios).toHaveLength(3);
    });

    it('selecting a slower run previews the removals', async () => {
        renderDialog();
        await screen.findAllByRole('radio');

        fireEvent.click(screen.getByRole('radio', { name: /0:30/ }));
        expect(screen.getByText('This removes 2 faster runs.')).toBeTruthy();

        fireEvent.click(screen.getByRole('radio', { name: /0:25/ }));
        expect(screen.getByText('This removes 1 faster run.')).toBeTruthy();
    });

    it('no-op guard', async () => {
        renderDialog();
        await screen.findAllByRole('radio');

        expect(screen.getByText('No faster runs to remove.')).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Make this the entry' }),
        ).toHaveProperty('disabled', true);
    });

    it('ties: selecting a non-current run with an equal time disables confirm', async () => {
        mocks.loadUserEligibleRunsAction.mockResolvedValue({
            ok: true,
            rows: [
                eligibleRun({ runId: 1, time: 20_000 }),
                eligibleRun({ runId: 2, time: 20_000 }),
            ],
        });
        renderDialog();
        const radios = await screen.findAllByRole('radio');
        expect(radios).toHaveLength(2);

        const nonCurrentRadio = radios.find(
            (r) => !r.closest('label')?.textContent?.includes('current entry'),
        );
        expect(nonCurrentRadio).toBeTruthy();
        fireEvent.click(nonCurrentRadio as HTMLElement);

        expect(screen.getByText('No faster runs to remove.')).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Make this the entry' }),
        ).toHaveProperty('disabled', true);
    });

    it('confirm excludes exactly the faster runs, with undo', async () => {
        mocks.excludeAction.mockResolvedValue({
            ok: true,
            result: { affectedCount: 2 },
        });
        const { onMutated } = renderDialog();
        await screen.findAllByRole('radio');

        fireEvent.click(screen.getByRole('radio', { name: /0:30/ }));
        fireEvent.click(
            screen.getByRole('button', { name: 'Make this the entry' }),
        );

        await waitFor(() =>
            expect(mocks.excludeAction).toHaveBeenCalledWith('some-game', {
                runIds: [1, 2],
                reason: 'Adjusted during board curation',
            }),
        );
        await waitFor(() => expect(onMutated).toHaveBeenCalled());
        expect(mocks.fireUndoToast).toHaveBeenCalledWith(
            'Adjusted runner’s entry.',
            expect.any(Function),
            onMutated,
        );

        const undo = mocks.fireUndoToast.mock.calls[0][1];
        await undo();
        expect(mocks.restoreRunsAction).toHaveBeenCalledWith(
            'some-game',
            [1, 2],
            'Undo of adjust',
        );
    });

    it('guest sees only the time section', async () => {
        mocks.createManualTimeAction.mockResolvedValue({
            ok: true,
            result: {},
        });
        renderDialog({ row: rosterRow({ userId: null }) });

        expect(
            screen.getByRole('heading', { name: 'Set a time for runner' }),
        ).toBeTruthy();
        expect(screen.queryByRole('radio')).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Make this the entry' }),
        ).toBeNull();
        expect(screen.getByRole('button', { name: 'Save time' })).toBeTruthy();
        expect(mocks.loadUserEligibleRunsAction).not.toHaveBeenCalled();

        fireEvent.change(screen.getByLabelText('Time'), {
            target: { value: '35:48' },
        });
        fireEvent.change(screen.getByLabelText('Reason — required'), {
            target: { value: 'manual correction' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save time' }));

        await waitFor(() =>
            expect(mocks.createManualTimeAction).toHaveBeenCalledWith(
                'some-game',
                expect.objectContaining({
                    runnerRef: { guestName: 'runner' },
                    timeMs: 2_148_000,
                }),
            ),
        );
    });

    it('manual time validation', async () => {
        renderDialog();
        await screen.findAllByRole('radio');

        fireEvent.change(screen.getByLabelText('Time'), {
            target: { value: 'garbage' },
        });
        fireEvent.change(screen.getByLabelText('Reason — required'), {
            target: { value: 'manual correction' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save time' }));

        expect(
            screen.getByText(
                'Enter a valid time (h:mm:ss, m:ss, or m:ss.SSS).',
            ),
        ).toBeTruthy();
        expect(mocks.createManualTimeAction).not.toHaveBeenCalled();
    });

    it('blank reason disables Save time', async () => {
        renderDialog();
        await screen.findAllByRole('radio');

        fireEvent.change(screen.getByLabelText('Time'), {
            target: { value: '35:48' },
        });

        expect(
            screen.getByRole('button', { name: 'Save time' }),
        ).toHaveProperty('disabled', true);
        expect(mocks.createManualTimeAction).not.toHaveBeenCalled();
    });
});
