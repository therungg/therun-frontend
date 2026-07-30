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
import { RowActions, type RowActionsProps } from './row-actions';

// vi.mock factories are hoisted above these imports, so the mock fns
// themselves must be created through vi.hoisted rather than referenced as
// plain outer `const`s (which would still be in their TDZ when the factory
// runs) — see variables-section.test.tsx for the same pattern.
const mocks = vi.hoisted(() => ({
    excludeAction: vi.fn(),
    previewExcludeAction: vi.fn(),
    restoreRunsAction: vi.fn(),
    createManualTimeAction: vi.fn(),
    markRunsAction: vi.fn(),
    loadUserEligibleRunsAction: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
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
vi.mock('../moderation/shared/actions/eligible-runs.action', () => ({
    loadUserEligibleRunsAction: mocks.loadUserEligibleRunsAction,
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
    const row = overrides.row ?? rosterRow({});
    const props: RowActionsProps = {
        row,
        category: CATEGORY,
        subcategoryKey: '',
        gameSlug: 'some-game',
        timeMs: 20_000,
        belowMinimum: false,
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
    return { onMutated, row: props.row };
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

describe('RowActions — Remove', () => {
    it('excludes immediately, fires an undo toast, and reveals a next-run slip', async () => {
        mocks.excludeAction.mockResolvedValue({
            ok: true,
            result: { affectedRunCount: 1, affectedLeaderboards: [] },
        });
        mocks.loadUserEligibleRunsAction.mockResolvedValue({
            ok: true,
            rows: [CANDIDATE],
        });

        renderRowActions();

        fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

        await waitFor(() =>
            expect(mocks.excludeAction).toHaveBeenCalledWith('some-game', {
                runIds: [1],
                reason: 'Board curation during setup',
            }),
        );
        await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalled());

        // The undo toast's render-prop renders its own body with an Undo
        // button that calls restoreRunsAction on click.
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

        await waitFor(() =>
            expect(mocks.loadUserEligibleRunsAction).toHaveBeenCalledWith(
                'some-game',
                5,
            ),
        );
        await waitFor(() => expect(screen.getByText(/next:/)).toBeTruthy());
        expect(screen.getByRole('button', { name: 'Keep it' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Remove too' })).toBeTruthy();
    });

    // Regression for the review finding: `onMutated` (which drives
    // `useBoardData`'s reload in the real BoardCuration parent) must not
    // fire until the slip's lifecycle is resolved. `BoardCuration` derives
    // `boardRows` from the same `rows` state reload replaces, so an eager
    // reload drops this run from `boardRows` and unmounts this very
    // component — including the still-loading slip — before the
    // eligible-runs fetch even has a chance to resolve. Under the old
    // (buggy) sequencing this test fails at the first `not.toHaveBeenCalled`
    // assertion, immediately after `excludeAction` resolves.
    it('does not reload until the next-run slip is resolved', async () => {
        mocks.excludeAction.mockResolvedValue({
            ok: true,
            result: { affectedRunCount: 1, affectedLeaderboards: [] },
        });
        let resolveEligible: (v: unknown) => void = () => {
            /* replaced synchronously below, before this default is ever
             * reachable — placeholder to satisfy the type until then. */
        };
        mocks.loadUserEligibleRunsAction.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveEligible = resolve;
                }),
        );

        const { onMutated } = renderRowActions();
        fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

        await waitFor(() => expect(mocks.excludeAction).toHaveBeenCalled());
        await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalled());
        await waitFor(() =>
            expect(mocks.loadUserEligibleRunsAction).toHaveBeenCalledWith(
                'some-game',
                5,
            ),
        );

        // Exclude succeeded and the undo toast fired, but the eligible-runs
        // query is still in flight — no reload yet.
        expect(onMutated).not.toHaveBeenCalled();

        resolveEligible({ ok: true, rows: [CANDIDATE] });

        await waitFor(() => expect(screen.getByText(/next:/)).toBeTruthy());
        // The slip is up and awaiting a decision — still no reload.
        expect(onMutated).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
        expect(onMutated).toHaveBeenCalledTimes(1);
    });

    it('"Remove too" excludes the candidate, then reloads', async () => {
        mocks.excludeAction.mockResolvedValue({
            ok: true,
            result: { affectedRunCount: 1, affectedLeaderboards: [] },
        });
        mocks.loadUserEligibleRunsAction.mockResolvedValue({
            ok: true,
            rows: [CANDIDATE],
        });

        const { onMutated } = renderRowActions();
        fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
        await waitFor(() =>
            expect(
                screen.getByRole('button', { name: 'Remove too' }),
            ).toBeTruthy(),
        );
        expect(onMutated).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Remove too' }));

        await waitFor(() =>
            expect(mocks.excludeAction).toHaveBeenCalledWith('some-game', {
                runIds: [CANDIDATE.runId],
                reason: 'Board curation during setup',
            }),
        );
        await waitFor(() => expect(onMutated).toHaveBeenCalledTimes(1));
    });

    it('reloads immediately when there is no same-board replacement to offer', async () => {
        mocks.excludeAction.mockResolvedValue({
            ok: true,
            result: { affectedRunCount: 1, affectedLeaderboards: [] },
        });
        mocks.loadUserEligibleRunsAction.mockResolvedValue({
            ok: true,
            rows: [],
        });

        const { onMutated } = renderRowActions();
        fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

        await waitFor(() =>
            expect(mocks.loadUserEligibleRunsAction).toHaveBeenCalled(),
        );
        await waitFor(() => expect(onMutated).toHaveBeenCalledTimes(1));
        expect(screen.queryByText(/next:/)).toBeNull();
    });

    it('reloads immediately for a guest row (no userId to query eligible runs for)', async () => {
        mocks.excludeAction.mockResolvedValue({
            ok: true,
            result: { affectedRunCount: 1, affectedLeaderboards: [] },
        });
        const { onMutated } = renderRowActions({
            row: rosterRow({ userId: null }),
        });

        fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

        await waitFor(() => expect(mocks.excludeAction).toHaveBeenCalled());
        await waitFor(() => expect(onMutated).toHaveBeenCalledTimes(1));
        expect(mocks.loadUserEligibleRunsAction).not.toHaveBeenCalled();
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
