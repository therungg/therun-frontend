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

    it('single screen when the runner has no other times', async () => {
        renderRemove([]);
        // Straight to the confirm form: reason present, no Continue.
        await screen.findByLabelText('Reason');
        expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
        expect(
            screen.getByText('They have no other times on this board.'),
        ).toBeTruthy();
        expect(
            screen.getByRole('radiogroup', { name: 'What are you removing?' }),
        ).toBeTruthy();
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
                        'Removing this run only — nothing faster than the',
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
    });
});
