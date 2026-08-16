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
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';

const mocks = vi.hoisted(() => ({
    loadVariablesAction: vi.fn(),
    selfClaimTimeAction: vi.fn(),
    createManualTimeAction: vi.fn(),
    lookupRunnerEntriesAction: vi.fn(),
    useSWR: vi.fn(),
}));

vi.mock('../submit/load-variables.action', () => ({
    loadVariablesAction: mocks.loadVariablesAction,
}));
vi.mock('~src/actions/self-claim.action', () => ({
    selfClaimTimeAction: mocks.selfClaimTimeAction,
}));
vi.mock('../manage/moderation/shared/actions/manual-times.action', () => ({
    createManualTimeAction: mocks.createManualTimeAction,
}));
vi.mock('~src/actions/runner-entries.action', () => ({
    lookupRunnerEntriesAction: mocks.lookupRunnerEntriesAction,
}));
// The runner step's user search — driven directly so the test never depends
// on network or debounce timing.
vi.mock('swr', () => ({
    default: (...args: unknown[]) => mocks.useSWR(...args),
}));

import { SubmitRunDialog } from './submit-run-dialog';

const category: ResolvedCategory = {
    id: 10,
    name: 'any',
    display: 'Any%',
    groupId: null,
    isMain: true,
    archived: false,
    primaryTiming: 'rt',
    hideRealTime: false,
    hideGameTime: true,
    rules: null,
} as unknown as ResolvedCategory;

const groups: ResolvedGroup[] = [];

beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadVariablesAction.mockResolvedValue({
        variables: [],
        reservedParams: [],
        validCombinations: { mode: 'open' },
    });
    mocks.useSWR.mockReturnValue({ data: undefined, isLoading: false });
});
afterEach(cleanup);

function renderDialog(overrides: Record<string, unknown> = {}) {
    const onClose = vi.fn();
    render(
        <SubmitRunDialog
            game={{ id: 1, name: 'mario64', display: 'Super Mario 64' }}
            categories={[category]}
            groups={groups}
            canModerate={false}
            sessionUsername="joey"
            open
            onClose={onClose}
            {...overrides}
        />,
    );
    return { onClose };
}

/**
 * Walks the board step, which is step 1 for every viewer. Waits for Next to
 * actually enable — the variables load runs inside a transition, so the
 * button stays disabled for a tick after the action resolves.
 */
async function advancePastBoard() {
    await waitFor(() =>
        expect(
            (screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement)
                .disabled,
        ).toBe(false),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

/**
 * The time field fills from the right, one keystroke at a time, so a test
 * types digits rather than handing it a formatted string. `1:23:45` is the
 * digits `12345`.
 */
function typeTime(digits: string, clock = /Real time/) {
    const el = screen.getByLabelText(clock) as HTMLInputElement;
    fireEvent.focus(el);
    for (const ch of digits) {
        fireEvent.change(el, { target: { value: el.value + ch } });
    }
}

describe('SubmitRunDialog', () => {
    it('asks a signed-out visitor to sign in instead of showing the form', () => {
        renderDialog({ sessionUsername: null });
        expect(screen.getByText(/Sign in with Twitch/)).toBeTruthy();
        expect(screen.queryByLabelText('Category')).toBeNull();
    });

    it('gives a non-moderator two steps, with no runner step', async () => {
        renderDialog();
        await waitFor(() =>
            expect(mocks.loadVariablesAction).toHaveBeenCalled(),
        );
        expect(screen.getByText('Board')).toBeTruthy();
        expect(screen.getByText('Time')).toBeTruthy();
        expect(screen.queryByText('Runner')).toBeNull();
    });

    it('gives a moderator the runner step', async () => {
        renderDialog({ canModerate: true });
        await waitFor(() =>
            expect(mocks.loadVariablesAction).toHaveBeenCalled(),
        );
        expect(screen.getByText('Runner')).toBeTruthy();
    });

    it('blocks submit until a valid time is entered', async () => {
        renderDialog();
        await advancePastBoard();

        const submitBtn = screen.getByRole('button', { name: 'Submit run' });
        expect((submitBtn as HTMLButtonElement).disabled).toBe(true);

        // Nothing invalid is representable any more — a stray letter is
        // rejected by the field rather than becoming an error state.
        fireEvent.change(screen.getByLabelText(/Real time/), {
            target: { value: 'x' },
        });
        expect((submitBtn as HTMLButtonElement).disabled).toBe(true);

        typeTime('12345');
        expect((submitBtn as HTMLButtonElement).disabled).toBe(false);
    });

    // A board timed by game time that also shows real time has a column no
    // single-clock submission can fill, so it asks for both.
    const bothClocks = {
        ...category,
        primaryTiming: 'gt',
        gameTimeLabel: 'igt',
        hideRealTime: false,
        hideGameTime: false,
    } as unknown as ResolvedCategory;

    it('takes both clocks on a board that shows both', async () => {
        mocks.selfClaimTimeAction.mockResolvedValue({
            ok: true,
            applied: 'instant',
            manualTimeId: 77,
        });
        renderDialog({ categories: [bothClocks] });
        await advancePastBoard();

        typeTime('12345', /IGT/);
        typeTime('12400', /Real time/);
        fireEvent.click(screen.getByRole('button', { name: 'Submit run' }));

        await waitFor(() =>
            expect(mocks.selfClaimTimeAction).toHaveBeenCalledTimes(1),
        );
        expect(mocks.selfClaimTimeAction.mock.calls[0][0]).toMatchObject({
            timing: 'gametime',
            timeMs: 5025000,
            secondary: { timing: 'realtime', timeMs: 5040000 },
        });
    });

    it('will not submit one clock when the board demands both', async () => {
        renderDialog({ categories: [bothClocks] });
        await advancePastBoard();

        typeTime('12345', /IGT/);

        expect(
            (
                screen.getByRole('button', {
                    name: 'Submit run',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
        expect(
            screen.getByText(
                'This board shows both times, so both are required.',
            ),
        ).toBeTruthy();
    });

    it('sends no secondary when the runner leaves the optional clock empty', async () => {
        mocks.selfClaimTimeAction.mockResolvedValue({
            ok: true,
            applied: 'instant',
            manualTimeId: 78,
        });
        // Real-time board showing game time: the second clock is never demanded.
        renderDialog({
            categories: [
                {
                    ...bothClocks,
                    primaryTiming: 'rt',
                } as unknown as ResolvedCategory,
            ],
        });
        await advancePastBoard();

        typeTime('12345', /Real time/);
        fireEvent.click(screen.getByRole('button', { name: 'Submit run' }));

        await waitFor(() =>
            expect(mocks.selfClaimTimeAction).toHaveBeenCalledTimes(1),
        );
        expect(mocks.selfClaimTimeAction.mock.calls[0][0]).toMatchObject({
            timing: 'realtime',
            secondary: null,
        });
    });

    it('rejects a malformed video link before it reaches the backend', async () => {
        renderDialog();
        await advancePastBoard();
        typeTime('12345');
        fireEvent.change(screen.getByLabelText('Video link'), {
            target: { value: 'not-a-url' },
        });
        expect(
            (
                screen.getByRole('button', {
                    name: 'Submit run',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
        expect(mocks.selfClaimTimeAction).not.toHaveBeenCalled();
    });

    it('submits a runner’s own time through the self path', async () => {
        mocks.selfClaimTimeAction.mockResolvedValue({
            ok: true,
            applied: 'instant',
            manualTimeId: 77,
        });
        renderDialog();
        await advancePastBoard();

        typeTime('12345');
        fireEvent.click(screen.getByRole('button', { name: 'Submit run' }));

        await waitFor(() =>
            expect(mocks.selfClaimTimeAction).toHaveBeenCalledTimes(1),
        );
        expect(mocks.selfClaimTimeAction.mock.calls[0][0]).toMatchObject({
            gameId: 1,
            categoryId: 10,
            timing: 'realtime',
            timeMs: 5025000,
        });
        expect(mocks.createManualTimeAction).not.toHaveBeenCalled();
        await waitFor(() =>
            expect(screen.getByText('The run is on the board.')).toBeTruthy(),
        );
    });

    it('attributes a moderator’s submission to the chosen runner', async () => {
        mocks.lookupRunnerEntriesAction.mockResolvedValue({
            status: 'found',
            userId: 42,
            entries: [],
        });
        mocks.createManualTimeAction.mockResolvedValue({
            ok: true,
            result: { id: 99, affectedLeaderboards: [] },
        });
        mocks.useSWR.mockReturnValue({
            data: { users: [{ user: 'Kirbymastah', picture: '' }], runs: [] },
            isLoading: false,
        });

        renderDialog({ canModerate: true });
        await advancePastBoard();

        fireEvent.click(screen.getByRole('button', { name: /Kirbymastah/ }));
        await waitFor(() =>
            expect(screen.getByText('No run on this board yet.')).toBeTruthy(),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));

        typeTime('3548');
        fireEvent.click(screen.getByRole('button', { name: 'Submit run' }));

        await waitFor(() =>
            expect(mocks.createManualTimeAction).toHaveBeenCalledTimes(1),
        );
        expect(mocks.createManualTimeAction.mock.calls[0][1]).toMatchObject({
            runnerRef: { userId: 42 },
            timeMs: 2148000,
            reason: 'Added via Submit a run',
        });
        expect(mocks.selfClaimTimeAction).not.toHaveBeenCalled();
    });

    it('will not let a moderator add a second entry for someone already on the board', async () => {
        mocks.lookupRunnerEntriesAction.mockResolvedValue({
            status: 'found',
            userId: 42,
            entries: [
                {
                    categoryId: 10,
                    category: 'Any%',
                    categorySlug: 'any',
                    subcategoryKey: '',
                    timeMs: 2148000,
                    timing: 'realtime',
                    rank: 3,
                    totalRunners: 40,
                    source: 'run',
                    runId: 7,
                },
            ],
        });
        mocks.useSWR.mockReturnValue({
            data: { users: [{ user: 'Kirbymastah', picture: '' }], runs: [] },
            isLoading: false,
        });

        renderDialog({ canModerate: true });
        await advancePastBoard();
        fireEvent.click(screen.getByRole('button', { name: /Kirbymastah/ }));

        await waitFor(() =>
            expect(
                screen.getByText(/already has a run on this board/),
            ).toBeTruthy(),
        );
        expect(
            (screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement)
                .disabled,
        ).toBe(true);
    });
});
