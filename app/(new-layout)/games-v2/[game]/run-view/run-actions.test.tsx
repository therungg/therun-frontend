// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RunActions } from './run-actions';
import type { RunViewModel } from './run-view';

const mocks = vi.hoisted(() => ({
    reportRunAction: vi.fn(),
    appealRunAction: vi.fn(),
    selfRunVerdictAction: vi.fn(),
    selfMoveRunAction: vi.fn(),
    loadOwnerBoardContextAction: vi.fn(),
}));

vi.mock('~src/actions/run-user-actions.action', () => ({
    reportRunAction: mocks.reportRunAction,
    appealRunAction: mocks.appealRunAction,
    selfRunVerdictAction: mocks.selfRunVerdictAction,
    selfMoveRunAction: mocks.selfMoveRunAction,
}));
vi.mock('../leaderboard/actions/load-owner-board-context.action', () => ({
    loadOwnerBoardContextAction: mocks.loadOwnerBoardContextAction,
}));
vi.mock('react-toastify', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn() }),
}));

// The dialogs the two new buttons open have their own suites (move-dialog.test.tsx,
// owner-hide-identity-dialog.test.tsx) — here they are stubs so the
// assertions are about which controls RunActions offers and whether it
// opens the right one, same pattern as run-inspector-owner.test.tsx.
vi.mock('../manage/boards/move-dialog', () => ({
    MoveDialog: (props: { open: boolean }) =>
        props.open ? <div data-testid="move-dialog" /> : null,
}));
vi.mock('../shared/owner-hide-identity-dialog', () => ({
    OwnerHideIdentityDialog: (props: { open: boolean }) =>
        props.open ? <div data-testid="hide-identity-dialog" /> : null,
}));

const baseModel = (over: Partial<RunViewModel> = {}): RunViewModel => ({
    kind: 'run',
    id: 55,
    game: { id: 12, name: 'celeste', display: 'Celeste' },
    gameId: 12,
    categoryId: 4,
    categoryDisplay: 'Any%',
    subcategoryKey: '',
    runnerName: 'Joey',
    userId: 7,
    isGuest: false,
    realTime: 90_000,
    gameTime: null,
    gameTimeLabel: 'igt',
    runDate: '2026-01-01T00:00:00.000Z',
    vodUrl: null,
    verificationStatus: 'verified',
    variables: {},
    origin: null,
    verifiedBy: null,
    rejectionReason: null,
    boardStanding: null,
    ...over,
});

beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadOwnerBoardContextAction.mockResolvedValue({
        ok: true,
        gameDisplay: 'Celeste',
        categories: [
            {
                id: 4,
                name: 'any',
                display: 'Any%',
                primaryTiming: 'rt',
                archived: false,
                sortOrder: 0,
            },
        ],
        variables: [],
    });
});

describe('RunActions owner self-moderation buttons', () => {
    it('offers Move my run… and Hide my identity… on your own run', () => {
        render(<RunActions model={baseModel()} sessionUsername="Joey" />);
        expect(
            screen.getByRole('button', { name: 'Move my run…' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Hide my identity…' }),
        ).toBeInTheDocument();
    });

    it('hides both buttons on another runner’s run', () => {
        render(
            <RunActions model={baseModel()} sessionUsername="SomeoneElse" />,
        );
        expect(
            screen.queryByRole('button', { name: 'Move my run…' }),
        ).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Hide my identity…' }),
        ).toBeNull();
    });

    it('hides both buttons for a guest run even if the name matches', () => {
        render(
            <RunActions
                model={baseModel({ isGuest: true })}
                sessionUsername="Joey"
            />,
        );
        expect(
            screen.queryByRole('button', { name: 'Move my run…' }),
        ).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Hide my identity…' }),
        ).toBeNull();
    });

    it('hides both buttons when the run has no userId', () => {
        render(
            <RunActions
                model={baseModel({ userId: null })}
                sessionUsername="Joey"
            />,
        );
        expect(
            screen.queryByRole('button', { name: 'Move my run…' }),
        ).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Hide my identity…' }),
        ).toBeNull();
    });

    it('opens the Move dialog after loading the owner board context', async () => {
        render(<RunActions model={baseModel()} sessionUsername="Joey" />);
        fireEvent.click(screen.getByRole('button', { name: 'Move my run…' }));
        expect(mocks.loadOwnerBoardContextAction).toHaveBeenCalledWith(
            'celeste',
            '',
        );
        await waitFor(() =>
            expect(screen.getByTestId('move-dialog')).toBeInTheDocument(),
        );
    });

    it('opens the Hide identity dialog immediately, without a context load', () => {
        render(<RunActions model={baseModel()} sessionUsername="Joey" />);
        fireEvent.click(
            screen.getByRole('button', { name: 'Hide my identity…' }),
        );
        expect(screen.getByTestId('hide-identity-dialog')).toBeInTheDocument();
        expect(mocks.loadOwnerBoardContextAction).not.toHaveBeenCalled();
    });
});
