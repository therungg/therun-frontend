// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import { RowActionsMenu } from './row-actions-menu';

const mocks = vi.hoisted(() => ({
    loadModBoardContextAction: vi.fn(),
    markRunsAction: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    routerRefresh: vi.fn(),
}));

vi.mock('./actions/load-mod-board-context.action', () => ({
    loadModBoardContextAction: mocks.loadModBoardContextAction,
}));
vi.mock('../manage/moderation/shared/actions/marks.action', () => ({
    markRunsAction: mocks.markRunsAction,
}));
vi.mock('react-toastify', () => ({
    toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: mocks.routerRefresh }),
}));
// The console dialogs and the existing verdict dialog pull in real
// 'use server' modules — stubbed for hermeticity; this suite asserts the
// menu's wiring, not the dialogs' internals (they have their own suites).
vi.mock('../manage/boards/move-dialog', () => ({
    MoveDialog: ({ open }: { open: boolean }) =>
        open ? <div data-testid="move-dialog" /> : null,
}));
vi.mock('../manage/boards/adjust-dialog', () => ({
    AdjustDialog: ({ open }: { open: boolean }) =>
        open ? <div data-testid="adjust-dialog" /> : null,
}));
vi.mock('../manage/boards/runner-dialog', () => ({
    RunnerDialog: ({ open }: { open: boolean }) =>
        open ? <div data-testid="runner-dialog" /> : null,
}));
vi.mock('../manage/moderation/shared/run-action-dialog', () => ({
    RunActionDialog: () => null,
}));
vi.mock('../shared/self-run-verdict', () => ({
    SelfRunVerdictDialog: () => null,
    useSelfRunVerdict: () => ({
        confirmState: null,
        pending: false,
        error: null,
        requestVerdict: vi.fn(),
        cancel: vi.fn(),
        confirm: vi.fn(),
    }),
}));
vi.mock('~src/actions/run-user-actions.action', () => ({
    appealRunAction: vi.fn(),
    loadRunHistoryAction: vi.fn(),
    reportRunAction: vi.fn(),
}));

function entry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
    return {
        runId: 42,
        rank: 1,
        runnerName: 'alice',
        userId: 5,
        isGuest: false,
        time: 61_000,
        realTime: 61_000,
        gameTime: null,
        runDate: '2026-01-05T00:00:00.000Z',
        vodUrl: null,
        verificationStatus: 'verified',
        variables: {},
        ...overrides,
    };
}

const MOD_CONTEXT = {
    ok: true as const,
    categories: [
        {
            id: 10,
            name: 'any-percent',
            display: 'Any%',
            primaryTiming: 'rt',
            archived: false,
            isMain: true,
            sortOrder: 1,
        },
    ],
    variables: [],
};

function renderMenu(props: Partial<Parameters<typeof RowActionsMenu>[0]> = {}) {
    return render(
        <RowActionsMenu
            entry={entry()}
            sessionUsername="modperson"
            canManage
            gameSlug="some-game"
            categorySlug="any-percent"
            subcategoryDefKeys={[]}
            {...props}
        />,
    );
}

function openMenu() {
    fireEvent.click(screen.getByRole('button', { name: 'Run actions' }));
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadModBoardContextAction.mockResolvedValue(MOD_CONTEXT);
});

describe('RowActionsMenu — console-parity mod items', () => {
    it('renders the new mod items only for managers', () => {
        renderMenu({ canManage: false });
        openMenu();
        expect(screen.queryByText('Move…')).toBeNull();
        expect(screen.queryByText('Adjust time…')).toBeNull();
        expect(screen.queryByText('Runner…')).toBeNull();
        expect(screen.queryByText('Mark for later')).toBeNull();
    });

    it('shows Move/Adjust/Runner/Mark for a manager on a user row', () => {
        renderMenu();
        openMenu();
        expect(screen.getByText('Move…')).toBeTruthy();
        expect(screen.getByText('Adjust time…')).toBeTruthy();
        expect(screen.getByText('Runner…')).toBeTruthy();
        expect(screen.getByText('Mark for later')).toBeTruthy();
    });

    it('hides Runner… for guests and relabels Adjust as Set time…', () => {
        renderMenu({ entry: entry({ userId: null, isGuest: true }) });
        openMenu();
        expect(screen.queryByText('Runner…')).toBeNull();
        expect(screen.getByText('Set time…')).toBeTruthy();
    });

    it('loads board context once and opens the Move dialog', async () => {
        renderMenu();
        openMenu();
        fireEvent.click(screen.getByText('Move…'));
        await waitFor(() =>
            expect(screen.getByTestId('move-dialog')).toBeTruthy(),
        );
        expect(mocks.loadModBoardContextAction).toHaveBeenCalledTimes(1);
        expect(mocks.loadModBoardContextAction).toHaveBeenCalledWith(
            'some-game',
        );

        // Second open reuses the cached context.
        openMenu();
        fireEvent.click(screen.getByText('Adjust time…'));
        await waitFor(() =>
            expect(screen.getByTestId('adjust-dialog')).toBeTruthy(),
        );
        expect(mocks.loadModBoardContextAction).toHaveBeenCalledTimes(1);
    });

    it('surfaces a context-load error and opens nothing', async () => {
        mocks.loadModBoardContextAction.mockResolvedValue({
            error: 'Not authorized to moderate this game.',
        });
        renderMenu();
        openMenu();
        fireEvent.click(screen.getByText('Move…'));
        await waitFor(() =>
            expect(mocks.toastError).toHaveBeenCalledWith(
                'Not authorized to moderate this game.',
            ),
        );
        expect(screen.queryByTestId('move-dialog')).toBeNull();
    });

    it('errors when the board category cannot be resolved', async () => {
        renderMenu({ categorySlug: 'other-category' });
        openMenu();
        fireEvent.click(screen.getByText('Move…'));
        await waitFor(() => expect(mocks.toastError).toHaveBeenCalled());
        expect(screen.queryByTestId('move-dialog')).toBeNull();
    });

    it('marks the run for later', async () => {
        mocks.markRunsAction.mockResolvedValue({ ok: true });
        renderMenu();
        openMenu();
        fireEvent.click(screen.getByText('Mark for later'));
        await waitFor(() =>
            expect(mocks.markRunsAction).toHaveBeenCalledWith(
                'some-game',
                [42],
                true,
            ),
        );
        expect(mocks.toastSuccess).toHaveBeenCalled();
    });
});
