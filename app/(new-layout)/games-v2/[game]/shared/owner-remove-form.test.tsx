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
    selfClaimTimeAction: vi.fn(),
    toastSuccess: vi.fn(),
    refresh: vi.fn(),
}));

vi.mock('~src/actions/run-user-actions.action', () => ({
    loadSelfEligibleRunsAction: mocks.loadSelfEligibleRunsAction,
    selfRunVerdictAction: mocks.selfRunVerdictAction,
}));
vi.mock('~src/actions/self-claim.action', () => ({
    selfClaimTimeAction: mocks.selfClaimTimeAction,
}));
vi.mock('react-toastify', () => ({
    toast: { success: mocks.toastSuccess, info: vi.fn(), error: vi.fn() },
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: mocks.refresh }),
}));

import { OwnerRemoveForm } from './owner-remove-form';

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
});
afterEach(cleanup);

function renderForm(rows: UserEligibleRunRow[], onDone = vi.fn()) {
    mocks.loadSelfEligibleRunsAction.mockResolvedValue({ ok: true, rows });
    render(
        <OwnerRemoveForm
            gameId={5}
            runId={RUN_ID}
            categoryId={10}
            subcategoryKey=""
            primaryTiming="rt"
            runTimeMs={RUN_TIME}
            onDone={onDone}
            onClose={vi.fn()}
        />,
    );
    return { onDone };
}

const decideOption = (name: RegExp) => screen.queryByRole('radio', { name });

describe('OwnerRemoveForm', () => {
    it('offers only "just remove" and "set a time" when you have no other runs on this board', async () => {
        renderForm([]);
        await waitFor(() => {
            expect(mocks.loadSelfEligibleRunsAction).toHaveBeenCalledWith(5);
        });
        await screen.findByText('You have no other times on this board.');
        expect(decideOption(/^Just remove this run/)).toBeTruthy();
        expect(decideOption(/^Set a time instead/)).toBeTruthy();
        expect(decideOption(/^Another run of mine/)).toBeNull();
    });

    it('lists only this run when the run standing instead is your slowest', async () => {
        renderForm([mine(1, SLOWER)]);
        fireEvent.click(
            await screen.findByRole('radio', {
                name: /^Another run of mine/,
            }),
        );
        fireEvent.click(screen.getByRole('radio', { name: /1:10:00/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        const items = screen.getAllByRole('listitem');
        expect(items).toHaveLength(1);
        expect(items[0].textContent).toContain('1:00:00');
    });

    it('lists this run and every faster run of mine when a slower run stands instead', async () => {
        renderForm([mine(1, FASTER), mine(2, SLOWER)]);
        fireEvent.click(
            await screen.findByRole('radio', {
                name: /^Another run of mine/,
            }),
        );
        fireEvent.click(screen.getByRole('radio', { name: /1:10:00/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        const texts = screen
            .getAllByRole('listitem')
            .map((li) => li.textContent ?? '');
        expect(texts).toHaveLength(2);
        expect(texts.some((t) => t.includes('1:00:00'))).toBe(true);
        expect(texts.some((t) => t.includes('50:00'))).toBe(true);
    });

    it('hides every run in the cascade, one call each', async () => {
        const { onDone } = renderForm([mine(1, FASTER), mine(2, SLOWER)]);
        fireEvent.click(
            await screen.findByRole('radio', {
                name: /^Another run of mine/,
            }),
        );
        fireEvent.click(screen.getByRole('radio', { name: /1:10:00/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        fireEvent.click(screen.getByRole('button', { name: 'Remove my run' }));
        await waitFor(() => {
            expect(mocks.selfRunVerdictAction).toHaveBeenCalledTimes(2);
        });
        expect(mocks.selfRunVerdictAction.mock.calls.map((c) => c[0])).toEqual([
            RUN_ID,
            1,
        ]);
        expect(mocks.selfRunVerdictAction.mock.calls.map((c) => c[1])).toEqual([
            'reject',
            'reject',
        ]);
        expect(mocks.selfClaimTimeAction).not.toHaveBeenCalled();
        await waitFor(() => expect(onDone).toHaveBeenCalled());
    });

    it('files the time you set after the removals, and keeps the dialog open on failure', async () => {
        renderForm([]);
        await screen.findByText('You have no other times on this board.');
        fireEvent.click(screen.getByRole('radio', { name: /^Set a time/ }));
        fireEvent.change(screen.getByLabelText('Your time'), {
            target: { value: '1:10:00' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        mocks.selfRunVerdictAction.mockResolvedValue({
            error: 'Something went wrong. Please try again.',
        });
        fireEvent.click(screen.getByRole('button', { name: 'Remove my run' }));
        // First error aborts: the set time is never filed and the dialog
        // stays open with the failure inline.
        await screen.findByRole('alert');
        expect(mocks.selfClaimTimeAction).not.toHaveBeenCalled();
        expect(
            screen.getByRole('button', { name: 'Remove my run' }),
        ).toBeTruthy();
    });
});
