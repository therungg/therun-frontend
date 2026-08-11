// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import { RunInspector } from './run-inspector';

// vi.mock factories are hoisted above the imports, so the mock fns live in
// vi.hoisted (same pattern as manage/boards/row-actions.test.tsx).
const mocks = vi.hoisted(() => ({
    loadRunHistoryAction: vi.fn(),
    loadSelfEligibleRunsAction: vi.fn(),
    loadUserEligibleRunsAction: vi.fn(),
    selfMoveRunAction: vi.fn(),
    selfRunVerdictAction: vi.fn(),
    loadModBoardContext: vi.fn(),
    loadOwnerBoardContext: vi.fn(),
}));

vi.mock('~src/actions/run-user-actions.action', () => ({
    loadRunHistoryAction: mocks.loadRunHistoryAction,
    loadSelfEligibleRunsAction: mocks.loadSelfEligibleRunsAction,
    selfMoveRunAction: mocks.selfMoveRunAction,
    selfRunVerdictAction: mocks.selfRunVerdictAction,
    selfAnonymizeStateAction: vi.fn(),
    selfAnonymizeApplyAction: vi.fn(),
    selfAnonymizeLiftAction: vi.fn(),
}));
vi.mock('../manage/moderation/shared/actions/eligible-runs.action', () => ({
    loadUserEligibleRunsAction: mocks.loadUserEligibleRunsAction,
}));
vi.mock('./actions/load-mod-board-context.action', () => ({
    loadModBoardContextAction: mocks.loadModBoardContext,
}));
vi.mock('./actions/load-owner-board-context.action', () => ({
    loadOwnerBoardContextAction: mocks.loadOwnerBoardContext,
}));
vi.mock('./actions/attach-vod.action', () => ({ attachVodAction: vi.fn() }));
vi.mock('../manage/moderation/shared/actions/exclude.action', () => ({
    excludeAction: vi.fn(),
}));
vi.mock('../manage/moderation/shared/actions/marks.action', () => ({
    markRunsAction: vi.fn(),
}));
vi.mock('../manage/moderation/shared/actions/restore.action', () => ({
    restoreRunsAction: vi.fn(),
}));
vi.mock('../manage/moderation/shared/actions/verdicts.action', () => ({
    applyVerdictsAction: vi.fn(),
}));
vi.mock('react-toastify', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn() }),
}));

// The forms and dialogs the footer opens have their own suites; here they
// are stubs so the assertions are about which controls the drawer offers.
vi.mock('../manage/moderation/shared/run-action-dialog', () => ({
    RunActionForm: () => <div data-testid="mod-action-form" />,
    VERB_TITLE: {
        approve: 'Verify',
        unverify: 'Unverify',
        reject: 'Reject',
        remove: 'Remove',
        restore: 'Restore',
        ban: 'Ban runner',
    },
}));
vi.mock('../shared/owner-remove-form', () => ({
    OwnerRemoveForm: () => <div data-testid="owner-remove-form" />,
}));
vi.mock('../shared/owner-hide-identity-dialog', () => ({
    OwnerHideIdentityDialog: () => null,
}));
vi.mock('./hide-identity-dialog', () => ({ HideIdentityDialog: () => null }));
vi.mock('../manage/boards/move-dialog', () => ({ MoveDialog: () => null }));
vi.mock('../manage/boards/adjust-dialog', () => ({ AdjustDialog: () => null }));

const entry = (over: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
    runId: 55,
    rank: 3,
    runnerName: 'Joey',
    userId: 7,
    isGuest: false,
    time: 90_000,
    realTime: 90_000,
    gameTime: null,
    runDate: null,
    verificationStatus: 'verified',
    ...over,
});

function renderInspector(over: {
    mode: 'mod' | 'owner';
    status?: LeaderboardEntry['verificationStatus'];
}) {
    return render(
        <RunInspector
            entry={entry({ verificationStatus: over.status ?? 'verified' })}
            gameSlug="celeste"
            gameId={12}
            gameDisplay="Celeste"
            mode={over.mode}
            categorySlug="any"
            categoryDisplay="Any%"
            categoryId={4}
            primaryTiming="rt"
            subcategoryDefKeys={[]}
            showMilliseconds={false}
            onClose={vi.fn()}
            onMutated={vi.fn()}
        />,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadRunHistoryAction.mockResolvedValue({ ok: true, events: [] });
    mocks.loadSelfEligibleRunsAction.mockResolvedValue({ ok: true, rows: [] });
    mocks.loadUserEligibleRunsAction.mockResolvedValue({ ok: true, rows: [] });
});

describe('RunInspector owner mode', () => {
    it('offers one owner verb and no moderator verdict', () => {
        renderInspector({ mode: 'owner', status: 'verified' });
        expect(
            screen.getByRole('button', { name: /Hide my run/ }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Verify' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Unverify' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
    });

    it('offers Restore my run on a rejected run instead', () => {
        renderInspector({ mode: 'owner', status: 'rejected' });
        expect(
            screen.getByRole('button', { name: /Restore my run/ }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /Hide my run/ }),
        ).toBeNull();
    });

    // Adjust time is a moderator run-edit; the owner's route to the same
    // outcome is inside the hide wizard ("set a time instead").
    it('drops Adjust time from the secondary bar', () => {
        renderInspector({ mode: 'owner' });
        expect(
            screen.getByRole('button', { name: 'Move…' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Hide identity…' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Adjust time…' }),
        ).toBeNull();
    });

    it('opens the owner wizard, not the moderator action form', () => {
        renderInspector({ mode: 'owner' });
        fireEvent.click(screen.getByRole('button', { name: /Hide my run/ }));
        expect(screen.getByTestId('owner-remove-form')).toBeInTheDocument();
        expect(screen.queryByTestId('mod-action-form')).toBeNull();
    });

    it('mod mode keeps the full surface', () => {
        renderInspector({ mode: 'mod', status: 'verified' });
        expect(
            screen.getByRole('button', { name: /Unverify/ }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Remove/ }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Adjust time…' }),
        ).toBeInTheDocument();
    });
});
