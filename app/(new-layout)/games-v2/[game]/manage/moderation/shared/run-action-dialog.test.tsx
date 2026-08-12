// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserEligibleRunRow } from '../../../../../../../types/moderation.types';

const mocks = vi.hoisted(() => ({
    createManualTimeAction: vi.fn(),
    deleteManualTimeAction: vi.fn(),
    loadUserEligibleRunsAction: vi.fn(),
    excludeAction: vi.fn(),
    previewExcludeAction: vi.fn(),
    applyVerdictsAction: vi.fn(),
    previewVerdictsAction: vi.fn(),
    restoreRunsAction: vi.fn(),
    manualTimesBulkAction: vi.fn(),
    deleteRuleAction: vi.fn(),
    fireUndoToast: vi.fn(),
    toastSuccess: vi.fn(),
}));

vi.mock('./actions/eligible-runs.action', () => ({
    loadUserEligibleRunsAction: mocks.loadUserEligibleRunsAction,
}));
vi.mock('./actions/exclude.action', () => ({
    excludeAction: mocks.excludeAction,
    previewExcludeAction: mocks.previewExcludeAction,
}));
vi.mock('./actions/verdicts.action', () => ({
    applyVerdictsAction: mocks.applyVerdictsAction,
    previewVerdictsAction: mocks.previewVerdictsAction,
}));
vi.mock('./actions/restore.action', () => ({
    restoreRunsAction: mocks.restoreRunsAction,
}));
vi.mock('./actions/manual-times.action', () => ({
    createManualTimeAction: mocks.createManualTimeAction,
    deleteManualTimeAction: mocks.deleteManualTimeAction,
    manualTimesBulkAction: mocks.manualTimesBulkAction,
}));
vi.mock('../rules/actions/delete-rule.action', () => ({
    deleteRuleAction: mocks.deleteRuleAction,
}));
vi.mock('./undo-toast', () => ({ fireUndoToast: mocks.fireUndoToast }));
vi.mock('react-toastify', () => ({
    toast: { success: mocks.toastSuccess, error: vi.fn() },
}));

import { RunActionForm } from './run-action-dialog';

const eligible = (runId: number, time: number): UserEligibleRunRow => ({
    runId,
    categoryId: 10,
    categoryName: 'any-percent',
    subcategoryKey: '',
    time,
    gameTime: null,
    primaryTiming: 'realtime',
    verificationStatus: 'pending',
    vodUrl: null,
    endedAt: '2026-08-01T00:00:00Z',
    isLeaderboardEntry: true,
    isLeaderboardEntryGt: false,
    rank: null,
    totalRunners: null,
});

const RUNNER_TARGET = {
    kind: 'runs' as const,
    runIds: [99],
    label: "greensuigi's run",
    runner: {
        id: 1,
        name: 'greensuigi',
        categoryId: 10,
        categoryDisplay: '120 Star',
        subcategoryKey: '',
        primaryTiming: 'rt' as const,
    },
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.previewVerdictsAction.mockResolvedValue({
        preview: {
            affectedRunCount: 1,
            affectedLeaderboards: [{}],
            sampleRuns: [],
        },
    });
    mocks.previewExcludeAction.mockResolvedValue({
        preview: {
            affectedRunCount: 1,
            affectedLeaderboards: [{}],
            sampleRuns: [],
        },
    });
});
afterEach(cleanup);

function renderRemove(rows: UserEligibleRunRow[]) {
    mocks.loadUserEligibleRunsAction.mockResolvedValue({
        ok: true,
        rows,
    });
    return render(
        <RunActionForm
            gameSlug="mario64"
            verb="remove"
            target={RUNNER_TARGET}
            onDone={vi.fn()}
            onClose={vi.fn()}
        />,
    );
}

describe('remove step flow', () => {
    it('two steps when the runner has other times: Decide then Confirm', async () => {
        renderRemove([eligible(1, 5_725_000), eligible(2, 5_728_000)]);
        // Decide screen: scope + cutoff, no reason field yet.
        await screen.findByRole('radiogroup', {
            name: 'What are you removing?',
        });
        expect(screen.queryByLabelText('Reason')).toBeNull();
        expect(
            screen.getByRole('radiogroup', {
                name: "Fastest time you've verified as legit",
            }),
        ).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        // Confirm screen: context line + reason, no cutoff.
        expect(screen.getByText('Removing this run only.')).toBeTruthy();
        expect(screen.getByLabelText('Reason')).toBeTruthy();
        expect(
            screen.queryByRole('radiogroup', {
                name: "Fastest time you've verified as legit",
            }),
        ).toBeNull();
        // Back returns to Decide with state intact.
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(
            screen.getByRole('radiogroup', { name: 'What are you removing?' }),
        ).toBeTruthy();
    });

    it('asks the scope question immediately even with no other times', async () => {
        renderRemove([]);
        // Decide screen renders without waiting on the other-times fetch:
        // the question is up right away, the cutoff area resolves to a note.
        expect(
            screen.getByRole('radiogroup', { name: 'What are you removing?' }),
        ).toBeTruthy();
        expect(screen.queryByLabelText('Reason')).toBeNull();
        await screen.findByText('They have no other times on this board.');
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        expect(screen.getByText('Removing this run only.')).toBeTruthy();
        expect(screen.getByLabelText('Reason')).toBeTruthy();
    });

    it('singular context line when the legit run is the fastest other run', async () => {
        renderRemove([eligible(1, 5_725_000), eligible(2, 5_728_000)]);
        await screen.findByRole('radiogroup', {
            name: "Fastest time you've verified as legit",
        });
        // Call the FASTEST run (id 1) legit -> nothing is faster than it,
        // so only the target run itself is removed.
        fireEvent.click(screen.getByRole('radio', { name: /1:35:25/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        expect(
            screen.getByText(
                (_, el) =>
                    el?.tagName === 'P' &&
                    (el?.textContent ?? '').startsWith(
                        'Removing this run only. Nothing faster than the',
                    ) &&
                    (el?.textContent ?? '').endsWith('you called legit.'),
            ),
        ).toBeTruthy();
    });

    it('cutoff selection carries into the confirm payload', async () => {
        renderRemove([eligible(1, 5_725_000), eligible(2, 5_728_000)]);
        await screen.findByRole('radiogroup', {
            name: "Fastest time you've verified as legit",
        });
        // Call the SLOWER run (id 2, 5_728_000ms) legit -> the faster one
        // (id 1) goes too. Match the row by its formatted duration text
        // rather than a brittle radio index.
        fireEvent.click(screen.getByRole('radio', { name: /1:35:28/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        fireEvent.change(screen.getByLabelText('Reason'), {
            target: { value: 'spliced VOD, checked frames' },
        });
        mocks.excludeAction.mockResolvedValue({ result: { excluded: 2 } });
        mocks.applyVerdictsAction.mockResolvedValue({
            result: { affectedRunCount: 2 },
        });
        // The cutoff change re-triggers the affected-runs preview fetch;
        // Confirm stays disabled (remove gates on it) until that settles.
        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: 'Confirm remove' }),
            ).not.toBeDisabled();
        });
        fireEvent.click(screen.getByRole('button', { name: 'Confirm remove' }));
        await waitFor(() => {
            // notify defaults ON for cheating -> verdict (reject) path.
            expect(mocks.applyVerdictsAction).toHaveBeenCalledWith(
                'mario64',
                'reject',
                [99, 1],
                'spliced VOD, checked frames',
            );
        });
        // Checkbox untouched -> no set time filed.
        expect(mocks.createManualTimeAction).not.toHaveBeenCalled();
    });

    it('cutoff pick and custom time are mutually exclusive', async () => {
        renderRemove([eligible(1, 5_725_000)]);
        await screen.findByRole('radiogroup', {
            name: "Fastest time you've verified as legit",
        });
        // Pick a cutoff row, then tick the custom time: the pick clears.
        fireEvent.click(screen.getByRole('radio', { name: /1:35:25/ }));
        expect(
            (
                screen.getByRole('radio', { name: /1:35:25/ }) as HTMLElement
            ).getAttribute('aria-checked'),
        ).toBe('true');
        fireEvent.click(screen.getByLabelText('Set a custom time instead'));
        expect(
            (
                screen.getByRole('radio', { name: /1:35:25/ }) as HTMLElement
            ).getAttribute('aria-checked'),
        ).toBe('false');
        // Re-picking a cutoff row unticks the custom time.
        fireEvent.click(screen.getByRole('radio', { name: /1:35:25/ }));
        expect(
            (
                screen.getByLabelText(
                    'Set a custom time instead',
                ) as HTMLInputElement
            ).checked,
        ).toBe(false);
    });

    it('a ticked custom time files a set time alongside the removal', async () => {
        renderRemove([eligible(1, 5_725_000)]);
        await screen.findByRole('radiogroup', {
            name: "Fastest time you've verified as legit",
        });
        fireEvent.click(screen.getByLabelText('Set a custom time instead'));
        // Invalid time blocks Continue; a valid one unblocks it.
        fireEvent.change(screen.getByLabelText('Custom time'), {
            target: { value: 'garbage' },
        });
        expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
        // 1:40:00 is slower than the runner's 1:35:25 other run — that
        // faster run goes with the removal (it would outrank the set time).
        fireEvent.change(screen.getByLabelText('Custom time'), {
            target: { value: '1:40:00' },
        });
        fireEvent.change(screen.getByLabelText('Date achieved (optional)'), {
            target: { value: '2026-08-01' },
        });
        expect(screen.getByText(/Their 1 faster run goes too/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        expect(
            screen.getByText(
                (_, el) =>
                    el?.tagName === 'P' &&
                    (el?.textContent ?? '').includes(
                        'set time takes its place.',
                    ),
            ),
        ).toBeTruthy();
        fireEvent.change(screen.getByLabelText('Reason'), {
            target: { value: 'spliced VOD, checked frames' },
        });
        mocks.applyVerdictsAction.mockResolvedValue({
            result: { affectedRunCount: 1 },
        });
        mocks.createManualTimeAction.mockResolvedValue({
            ok: true,
            result: { id: 42, affectedLeaderboards: [] },
        });
        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: 'Confirm remove' }),
            ).not.toBeDisabled();
        });
        fireEvent.click(screen.getByRole('button', { name: 'Confirm remove' }));
        await waitFor(() => {
            expect(mocks.createManualTimeAction).toHaveBeenCalledWith(
                'mario64',
                {
                    runnerRef: { userId: 1 },
                    categoryId: 10,
                    subcategoryKey: '',
                    timing: 'realtime',
                    timeMs: 100 * 60_000,
                    runDate: '2026-08-01',
                    reason: 'spliced VOD, checked frames',
                },
            );
        });
        // The removal covers the target AND the faster run.
        expect(mocks.applyVerdictsAction).toHaveBeenCalledWith(
            'mario64',
            'reject',
            [99, 1],
            'spliced VOD, checked frames',
        );
    });
});
