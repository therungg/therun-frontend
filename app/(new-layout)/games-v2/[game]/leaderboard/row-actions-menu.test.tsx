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
vi.mock('../manage/moderation/shared/manual-time-dialog', () => ({
    ManualTimeDialog: () => <div data-testid="manual-time-dialog" />,
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

describe('RowActionsMenu — viewer/self kebab (mod actions moved out)', () => {
    it('shows the viewer items but no moderator section', () => {
        renderMenu();
        openMenu();
        expect(screen.getByText('Run history')).toBeTruthy();
        // Mod verbs now live on the row's direct Moderate button + drawer,
        // never in this kebab.
        expect(screen.queryByText('Moderator')).toBeNull();
        for (const gone of [
            'Moderate…',
            'Verify run',
            'Remove run…',
            'Restore run',
            'Move…',
            'Adjust time…',
            'Runner…',
            'Hide identity…',
            'Mark for later',
            'View runner page',
            'Select all runs by alice',
        ]) {
            expect(screen.queryByText(gone)).toBeNull();
        }
    });

    it('offers Report run for a logged-in non-owner', () => {
        renderMenu();
        openMenu();
        expect(screen.getByText('Report run')).toBeTruthy();
    });
});

function manualEntry(
    overrides: Partial<LeaderboardEntry> = {},
): LeaderboardEntry {
    return entry({
        runId: null,
        source: 'manual',
        manualTimeId: 77,
        ...overrides,
    });
}

describe('RowActionsMenu — manual (set) time rows', () => {
    it('renders no kebab at all — moderation is the row Moderate button, and the time cell links to the detail page', () => {
        const { container } = renderMenu({ entry: manualEntry() });
        expect(container.innerHTML).toBe('');
    });
});
