// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserEligibleRunRow } from '../../../../../types/moderation.types';

const mocks = vi.hoisted(() => ({
    loadSelfEligibleRunsAction: vi.fn(),
    selfRunVerdictAction: vi.fn(),
    revalidateSelfBoardsAction: vi.fn(),
    selfClaimTimeAction: vi.fn(),
    toastSuccess: vi.fn(),
}));

vi.mock('~src/actions/run-user-actions.action', () => ({
    loadSelfEligibleRunsAction: mocks.loadSelfEligibleRunsAction,
    selfRunVerdictAction: mocks.selfRunVerdictAction,
    revalidateSelfBoardsAction: mocks.revalidateSelfBoardsAction,
}));
vi.mock('~src/actions/self-claim.action', () => ({
    selfClaimTimeAction: mocks.selfClaimTimeAction,
}));
vi.mock('react-toastify', () => ({
    toast: { success: mocks.toastSuccess, info: vi.fn(), error: vi.fn() },
}));

import {
    OwnerRemoveDialog,
    OwnerRemoveForm,
    type OwnerRemoveFormProps,
} from './owner-remove-form';

// The run the owner opened the wizard on: 1:00:00 on category 10, no
// subcategory.
const RUN_ID = 99;
const RUN_TIME = 3_600_000;
const FASTER = 3_000_000; // 50:00
const SLOWER = 4_200_000; // 1:10:00

const mine = (runId: number, time: number): UserEligibleRunRow => ({
    runId,
    categoryId: 10,
    categoryName: 'Any%',
    subcategoryKey: '',
    time,
    gameTime: null,
    primaryTiming: 'realtime',
    verificationStatus: 'verified',
    vodUrl: null,
    endedAt: '2026-08-01T00:00:00Z',
    isLeaderboardEntry: true,
    isLeaderboardEntryGt: false,
    rank: null,
    totalRunners: null,
});

beforeEach(() => {
    vi.clearAllMocks();
    mocks.selfRunVerdictAction.mockResolvedValue({
        ok: true,
        applied: 'instant',
    });
    mocks.selfClaimTimeAction.mockResolvedValue({
        ok: true,
        applied: 'instant',
        manualTimeId: 7,
    });
    mocks.revalidateSelfBoardsAction.mockResolvedValue(undefined);
});
afterEach(cleanup);

function renderForm(
    rows: UserEligibleRunRow[] | { error: string },
    overrides: Partial<OwnerRemoveFormProps> = {},
) {
    mocks.loadSelfEligibleRunsAction.mockResolvedValue(
        Array.isArray(rows) ? { ok: true, rows } : rows,
    );
    const onDone = vi.fn();
    render(
        <OwnerRemoveForm
            gameId={5}
            gameSlug="mario64"
            runId={RUN_ID}
            categoryId={10}
            subcategoryKey=""
            primaryTiming="rt"
            runTimeMs={RUN_TIME}
            onDone={onDone}
            onClose={vi.fn()}
            {...overrides}
        />,
    );
    return { onDone };
}

const decideOption = (name: RegExp) => screen.queryByRole('radio', { name });

/** Decide → pick "another run of mine" → pick the run showing `time`. */
async function standInstead(time: RegExp) {
    fireEvent.click(
        await screen.findByRole('radio', { name: /^Another run of mine/ }),
    );
    fireEvent.click(screen.getByRole('radio', { name: time }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
}

describe('OwnerRemoveForm', () => {
    it('offers only "just hide" and "set a time" when you have no other runs on this board', async () => {
        renderForm([]);
        await waitFor(() => {
            expect(mocks.loadSelfEligibleRunsAction).toHaveBeenCalledWith(5);
        });
        await screen.findByText('You have no other times on this board.');
        expect(decideOption(/^Just hide this run/)).toBeTruthy();
        expect(decideOption(/^Set a time instead/)).toBeTruthy();
        expect(decideOption(/^Another run of mine/)).toBeNull();
    });

    it('lists only this run when the run standing instead is your slowest', async () => {
        renderForm([mine(1, SLOWER)]);
        await standInstead(/1:10:00/);
        const items = screen.getAllByRole('listitem');
        expect(items).toHaveLength(1);
        expect(items[0].textContent).toContain('1:00:00');
    });

    it('lists this run and every faster run of mine when a slower run stands instead', async () => {
        renderForm([mine(1, FASTER), mine(2, SLOWER)]);
        await standInstead(/1:10:00/);
        const texts = screen
            .getAllByRole('listitem')
            .map((li) => li.textContent ?? '');
        expect(texts).toHaveLength(2);
        // Fastest first, the run you opened this on last — the order the
        // cascade is applied in, so a partial failure is legible from the
        // list the runner just confirmed.
        expect(texts[0]).toContain('50:00');
        expect(texts[1]).toContain('1:00:00');
    });

    it('hides every run in the cascade, one call each, fastest first', async () => {
        const { onDone } = renderForm([mine(1, FASTER), mine(2, SLOWER)]);
        await standInstead(/1:10:00/);
        fireEvent.click(screen.getByRole('button', { name: 'Hide my run' }));
        await waitFor(() => {
            expect(mocks.selfRunVerdictAction).toHaveBeenCalledTimes(2);
        });
        // Fastest run first: a failure part-way must not leave the fastest
        // (the one the cascade exists to suppress) standing.
        expect(mocks.selfRunVerdictAction.mock.calls.map((c) => c[0])).toEqual([
            1,
            RUN_ID,
        ]);
        expect(mocks.selfRunVerdictAction.mock.calls.map((c) => c[1])).toEqual([
            'reject',
            'reject',
        ]);
        expect(mocks.selfClaimTimeAction).not.toHaveBeenCalled();
        await waitFor(() => expect(onDone).toHaveBeenCalled());
        // The board's own `lb:*` cache entries are not touched by the verdict
        // action — the wizard must bust them itself.
        expect(mocks.revalidateSelfBoardsAction).toHaveBeenCalledWith(
            'mario64',
            5,
            [{ categoryId: 10, subcategoryKey: '' }],
        );
    });

    it('files the time you set, on the board clock, after the runs are hidden', async () => {
        const { onDone } = renderForm([], {
            primaryTiming: 'gt',
            subcategoryKey: 'glitchless',
        });
        await screen.findByText('You have no other times on this board.');
        fireEvent.click(screen.getByRole('radio', { name: /^Set a time/ }));
        fireEvent.change(screen.getByLabelText('Your time'), {
            target: { value: '1:10:00' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        fireEvent.click(screen.getByRole('button', { name: 'Hide my run' }));
        await waitFor(() => {
            expect(mocks.selfClaimTimeAction).toHaveBeenCalledWith({
                gameId: 5,
                categoryId: 10,
                subcategoryKey: 'glitchless',
                // A GT board files a game time — filing an RTA time here
                // would put the number on the wrong clock.
                timing: 'gametime',
                timeMs: SLOWER,
                reason: 'Hidden by the runner',
            });
        });
        // The run is hidden BEFORE the time is filed: filing first, with a
        // faster run still standing, is stamped instantly verified by the
        // backend and would slip an unreviewed time onto the board.
        expect(
            mocks.selfRunVerdictAction.mock.invocationCallOrder[0],
        ).toBeLessThan(mocks.selfClaimTimeAction.mock.invocationCallOrder[0]);
        await waitFor(() => expect(onDone).toHaveBeenCalled());
    });

    it('cascades on the time you type, not just on a picked run', async () => {
        renderForm([mine(1, FASTER)]);
        await screen.findByRole('radio', { name: /^Another run of mine/ });
        fireEvent.click(screen.getByRole('radio', { name: /^Set a time/ }));
        // 1:10:00 is slower than your standing 50:00, which would outrank it.
        fireEvent.change(screen.getByLabelText('Your time'), {
            target: { value: '1:10:00' },
        });
        expect(
            screen.getByText(/1 faster time of yours goes too/),
        ).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        fireEvent.click(screen.getByRole('button', { name: 'Hide my run' }));
        await waitFor(() => {
            expect(mocks.selfRunVerdictAction).toHaveBeenCalledTimes(2);
        });
        expect(mocks.selfRunVerdictAction.mock.calls.map((c) => c[0])).toEqual([
            1,
            RUN_ID,
        ]);
    });

    it('aborts on the first failure and keeps the dialog open, then resumes where it stopped', async () => {
        renderForm([]);
        await screen.findByText('You have no other times on this board.');
        fireEvent.click(screen.getByRole('radio', { name: /^Set a time/ }));
        fireEvent.change(screen.getByLabelText('Your time'), {
            target: { value: '1:10:00' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        mocks.selfClaimTimeAction.mockResolvedValueOnce({
            error: 'Something went wrong.',
        });
        fireEvent.click(screen.getByRole('button', { name: 'Hide my run' }));
        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain('restore the run from your run');
        expect(
            screen.getByRole('button', { name: 'Hide my run' }),
        ).toBeTruthy();
        // Retrying re-issues only the step that failed — the run is already
        // hidden, so it is not hidden again.
        fireEvent.click(screen.getByRole('button', { name: 'Hide my run' }));
        await waitFor(() => {
            expect(mocks.selfClaimTimeAction).toHaveBeenCalledTimes(2);
        });
        expect(mocks.selfRunVerdictAction).toHaveBeenCalledTimes(1);
    });

    it('never claims you have no other times when the roster failed to load', async () => {
        renderForm({ error: 'Something went wrong. Please try again.' });
        await screen.findByText(/could not check your other times/);
        expect(
            screen.queryByText('You have no other times on this board.'),
        ).toBeNull();
        expect(decideOption(/^Another run of mine/)).toBeNull();
        // The confirm screen must not promise an outcome it cannot know.
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        expect(
            screen.getByText(/your next-best one takes its place/),
        ).toBeTruthy();
    });

    it('tells you your next-best time takes the slot when you just hide this run', async () => {
        renderForm([mine(1, SLOWER)]);
        await screen.findByRole('radio', { name: /^Another run of mine/ });
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        expect(
            screen.getByText(
                (_, el) =>
                    el?.tagName === 'P' &&
                    (el?.textContent ?? '').startsWith('Your 1:10:00 becomes'),
            ),
        ).toBeTruthy();
        expect(
            screen.queryByText('You will no longer have a time on this board.'),
        ).toBeNull();
    });

    it('ignores Escape and the close button while the batch is in flight', async () => {
        mocks.loadSelfEligibleRunsAction.mockResolvedValue({
            ok: true,
            rows: [],
        });
        // Hold the first hide open so the dialog is genuinely busy.
        let releaseHide: (v: unknown) => void = () => {
            // Replaced synchronously by the promise executor below.
        };
        mocks.selfRunVerdictAction.mockReturnValue(
            new Promise((resolve) => {
                releaseHide = resolve;
            }),
        );
        const onClose = vi.fn();
        render(
            <OwnerRemoveDialog
                gameId={5}
                gameSlug="mario64"
                runId={RUN_ID}
                categoryId={10}
                subcategoryKey=""
                primaryTiming="rt"
                runTimeMs={RUN_TIME}
                onDone={vi.fn()}
                onClose={onClose}
            />,
        );
        await screen.findByText('You have no other times on this board.');
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        fireEvent.click(screen.getByRole('button', { name: 'Hide my run' }));
        await screen.findByRole('button', { name: 'Working…' });
        // Escape and the header close button are both inert while the
        // mutation runs — closing here would leave it nowhere to report a
        // failure. (Cancel is disabled by the form for the same reason.)
        fireEvent.keyDown(document, { key: 'Escape' });
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
        // Once it settles, Escape closes normally again. Retried: the host's
        // mirrored busy flag clears a tick after the form's own.
        releaseHide({ ok: true, applied: 'instant' });
        await waitFor(() => {
            fireEvent.keyDown(document, { key: 'Escape' });
            expect(onClose).toHaveBeenCalled();
        });
    });

    // A GT board with rtaFallback ranks RTA-only runs by their real time
    // (the backend orders on COALESCE(gameTime, time)), so those runs ARE on
    // the board. Reading only `gameTime` dropped every one of them: the
    // wizard then claimed the runner had no other times here, hid the
    // "another run of mine stands instead" option, and computed an empty
    // cascade — leaving a FASTER run of theirs standing in the slot they
    // just cleared.
    describe('GT board with rtaFallback', () => {
        /** One of the runner's runs with a real time but no game time. */
        const rtaOnly = (runId: number, time: number): UserEligibleRunRow => ({
            ...mine(runId, time),
            gameTime: null,
            primaryTiming: 'gametime',
        });

        it('counts the runner’s RTA-only runs and cascades over the faster one', async () => {
            renderForm([rtaOnly(1, FASTER), rtaOnly(2, SLOWER)], {
                primaryTiming: 'gt',
                rtaFallback: true,
            });
            // Not "You have no other times on this board".
            await screen.findByRole('radio', {
                name: /^Another run of mine/,
            });
            expect(
                screen.queryByText('You have no other times on this board.'),
            ).toBeNull();

            // Standing on the slower one takes the faster one down with it.
            await standInstead(/1:10:00/);
            await screen.findByText(/These 2 runs get hidden/);
            fireEvent.click(
                screen.getByRole('button', { name: 'Hide my run' }),
            );
            await waitFor(() =>
                expect(mocks.selfRunVerdictAction).toHaveBeenCalledTimes(2),
            );
            // Fastest first, the opened run last — the cascade's order.
            expect(mocks.selfRunVerdictAction.mock.calls[0][0]).toBe(1);
            expect(mocks.selfRunVerdictAction.mock.calls[1][0]).toBe(RUN_ID);
        });

        // Without the flag the board really does rank on game time alone, so
        // an RTA-only run is not on it and must stay out of the roster.
        it('still ignores RTA-only runs on a GT board without the fallback', async () => {
            renderForm([rtaOnly(1, FASTER)], { primaryTiming: 'gt' });
            await screen.findByText('You have no other times on this board.');
            expect(decideOption(/^Another run of mine/)).toBeNull();
        });
    });

    it('lets the keyboard reach every run in the picker', async () => {
        renderForm([mine(1, FASTER), mine(2, SLOWER)]);
        fireEvent.click(
            await screen.findByRole('radio', { name: /^Another run of mine/ }),
        );
        const rows = screen
            .getAllByRole('radio')
            .filter((r) => /\d:\d\d/.test(r.textContent ?? ''));
        expect(rows).toHaveLength(2);
        // Arrow keys move selection, so the second row is reachable without a
        // pointer — with roving tabindex alone it never would be.
        fireEvent.keyDown(rows[0], { key: 'ArrowDown' });
        expect(
            screen
                .getAllByRole('radio')
                .filter((r) => /\d:\d\d/.test(r.textContent ?? ''))[1]
                .getAttribute('aria-checked'),
        ).toBe('true');
    });
});
