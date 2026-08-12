// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import type { LeaderboardRosterRow } from '../../../../../../types/moderation.types';
import {
    AddRunnerRow,
    findMatchedRunner,
    resolveRunnerRef,
} from './add-runner-row';

const mocks = vi.hoisted(() => ({
    createManualTimeAction: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
}));

vi.mock('../moderation/shared/actions/manual-times.action', () => ({
    createManualTimeAction: mocks.createManualTimeAction,
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

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    cleanup();
});

describe('resolveRunnerRef', () => {
    const knownRunners: Pick<LeaderboardRosterRow, 'userId' | 'runnerName'>[] =
        [
            { userId: 5, runnerName: 'alice' },
            { userId: null, runnerName: 'previously-a-guest' },
        ];

    it('resolves to a userId ref for a case-insensitive match against a known registered runner', () => {
        expect(resolveRunnerRef('Alice', knownRunners)).toEqual({
            userId: 5,
        });
    });

    it('falls back to a guestName ref for a name with no registered match', () => {
        expect(resolveRunnerRef('bob', knownRunners)).toEqual({
            guestName: 'bob',
        });
    });

    it('falls back to a guestName ref even when the name matches a known guest row', () => {
        expect(resolveRunnerRef('previously-a-guest', knownRunners)).toEqual({
            guestName: 'previously-a-guest',
        });
    });
});

describe('AddRunnerRow', () => {
    function renderRow(
        knownRunners: Pick<
            LeaderboardRosterRow,
            'userId' | 'runnerName'
        >[] = [],
    ) {
        const onMutated = vi.fn();
        render(
            <table>
                <tbody>
                    <AddRunnerRow
                        category={CATEGORY}
                        subcategoryKey=""
                        gameSlug="some-game"
                        knownRunners={knownRunners}
                        showSecondary={false}
                        onMutated={onMutated}
                    />
                </tbody>
            </table>,
        );
        return { onMutated };
    }

    it('adds a guest when the typed name matches no known runner', async () => {
        mocks.createManualTimeAction.mockResolvedValue({
            ok: true,
            result: { id: 1, affectedLeaderboards: [] },
        });
        const { onMutated } = renderRow();

        fireEvent.change(screen.getByLabelText('Runner name'), {
            target: { value: 'newrunner' },
        });
        fireEvent.change(screen.getByLabelText('Runner time'), {
            target: { value: '35:48' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Add guest' }));

        await vi.waitFor(() =>
            expect(mocks.createManualTimeAction).toHaveBeenCalledWith(
                'some-game',
                {
                    runnerRef: { guestName: 'newrunner' },
                    categoryId: CATEGORY.id,
                    subcategoryKey: '',
                    timing: 'realtime',
                    timeMs: 35 * 60_000 + 48_000,
                    runDate: null,
                    reason: 'Added during board curation',
                },
            ),
        );
        expect(onMutated).toHaveBeenCalled();
    });

    it('adds a real user when the typed name matches a known registered runner', async () => {
        mocks.createManualTimeAction.mockResolvedValue({
            ok: true,
            result: { id: 1, affectedLeaderboards: [] },
        });
        renderRow([{ userId: 5, runnerName: 'alice' }]);

        fireEvent.change(screen.getByLabelText('Runner name'), {
            target: { value: 'alice' },
        });
        fireEvent.change(screen.getByLabelText('Runner time'), {
            target: { value: '10:00' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Add for alice' }));

        await vi.waitFor(() =>
            expect(mocks.createManualTimeAction).toHaveBeenCalledWith(
                'some-game',
                expect.objectContaining({ runnerRef: { userId: 5 } }),
            ),
        );
    });

    it('shows an inline error and does not submit for an invalid time', () => {
        renderRow();

        fireEvent.change(screen.getByLabelText('Runner name'), {
            target: { value: 'newrunner' },
        });
        fireEvent.change(screen.getByLabelText('Runner time'), {
            target: { value: 'not-a-time' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Add guest' }));

        expect(
            screen.getByText(
                'Enter a valid time (h:mm:ss, m:ss, or m:ss.SSS).',
            ),
        ).toBeTruthy();
        expect(mocks.createManualTimeAction).not.toHaveBeenCalled();
    });

    it('shows a "will be added as a guest" indicator and label for a non-matching name', () => {
        renderRow([{ userId: 5, runnerName: 'alice' }]);

        fireEvent.change(screen.getByLabelText('Runner name'), {
            target: { value: 'newrunner' },
        });

        expect(screen.getByText('Will be added as a guest entry')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Add guest' })).toBeTruthy();
    });

    it('shows a "matched runner" indicator and label for a name matching the roster', () => {
        renderRow([{ userId: 5, runnerName: 'alice' }]);

        fireEvent.change(screen.getByLabelText('Runner name'), {
            target: { value: 'Alice' },
        });

        expect(
            screen.getByText('Matched runner: alice, linked to their account'),
        ).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Add for alice' }),
        ).toBeTruthy();
    });

    it('shows no indicator text before anything is typed', () => {
        renderRow([{ userId: 5, runnerName: 'alice' }]);

        expect(screen.queryByText(/guest entry/)).toBeNull();
        expect(screen.queryByText(/Matched runner/)).toBeNull();
    });
});

describe('findMatchedRunner', () => {
    const knownRunners: Pick<LeaderboardRosterRow, 'userId' | 'runnerName'>[] =
        [
            { userId: 5, runnerName: 'alice' },
            { userId: null, runnerName: 'previously-a-guest' },
        ];

    it('returns null for an empty name', () => {
        expect(findMatchedRunner('   ', knownRunners)).toBeNull();
    });

    it('returns the matched runner case-insensitively', () => {
        expect(findMatchedRunner('ALICE', knownRunners)).toEqual({
            userId: 5,
            runnerName: 'alice',
        });
    });

    it('does not match a guest row', () => {
        expect(
            findMatchedRunner('previously-a-guest', knownRunners),
        ).toBeNull();
    });
});
