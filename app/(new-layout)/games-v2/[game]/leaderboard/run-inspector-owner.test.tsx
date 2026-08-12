// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import type { HistoryEvent } from '../../../../../types/moderation.types';
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
// Stubbed with a trigger for its `onDone`, so the drawer's reaction to a
// completed hide/unhide can be asserted without the real dialog's fetches.
vi.mock('../shared/owner-hide-identity-dialog', () => ({
    OwnerHideIdentityDialog: (props: { open: boolean; onDone: () => void }) =>
        props.open ? (
            <button type="button" onClick={props.onDone}>
                stub-hide-identity-done
            </button>
        ) : null,
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

/** A moderator verdict as the run's latest history event — the one shape
 *  `historyUndoPlan` maps to an inline Undo. */
const undoableEvent: HistoryEvent = {
    type: 'verdict',
    action: 'verdict_verify',
    byRole: 'mod',
    reason: null,
    at: '2026-08-01T00:00:00.000Z',
    logId: 1,
    by: { userId: 2, name: 'Mod' },
};

function renderInspector(over: {
    mode: 'mod' | 'owner';
    status?: LeaderboardEntry['verificationStatus'];
    onSelfHiddenChanged?: () => void;
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
            onSelfHiddenChanged={over.onSelfHiddenChanged}
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

    // The timeline's Undo runs moderator verbs. The history has to actually
    // contain an undoable event for this to prove anything — an empty
    // timeline would pass whatever the mode did.
    it('renders no timeline Undo, on a history that gives mod mode one', async () => {
        mocks.loadRunHistoryAction.mockResolvedValue({
            ok: true,
            events: [undoableEvent],
        });
        const owner = renderInspector({ mode: 'owner' });
        // Wait for the event itself to be on screen (its actor line), not
        // just for the drawer — otherwise "no Undo" would pass on a timeline
        // that simply hadn't loaded yet.
        await waitFor(() =>
            expect(screen.getByText(/Mod ·/)).toBeInTheDocument(),
        );
        expect(screen.queryByRole('button', { name: /Undo/ })).toBeNull();
        owner.unmount();

        renderInspector({ mode: 'mod' });
        await waitFor(() =>
            expect(
                screen.getByRole('button', { name: /Undo/ }),
            ).toBeInTheDocument(),
        );
    });

    // The one-way door: hiding from in here redacts the runner's own row, so
    // this drawer's entry point goes with it. The host must be told, or the
    // board-level un-hide note never appears this session.
    it('tells the host when hide-identity lands', () => {
        const onSelfHiddenChanged = vi.fn();
        renderInspector({ mode: 'owner', onSelfHiddenChanged });
        fireEvent.click(screen.getByRole('button', { name: 'Hide identity…' }));
        fireEvent.click(
            screen.getByRole('button', { name: 'stub-hide-identity-done' }),
        );
        expect(onSelfHiddenChanged).toHaveBeenCalled();
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
