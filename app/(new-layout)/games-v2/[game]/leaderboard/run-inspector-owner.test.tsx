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
    loadOwnerEvidenceAction: vi.fn(),
    selfSetEvidenceAction: vi.fn(),
    selfSetManualEvidenceAction: vi.fn(),
    updateManualTimeAction: vi.fn(),
    attachVodAction: vi.fn(),
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
vi.mock('./actions/attach-vod.action', () => ({
    attachVodAction: mocks.attachVodAction,
}));
vi.mock('./actions/load-owner-evidence.action', () => ({
    loadOwnerEvidenceAction: mocks.loadOwnerEvidenceAction,
}));
vi.mock('~src/actions/self-evidence.action', () => ({
    selfSetEvidenceAction: mocks.selfSetEvidenceAction,
    selfSetManualEvidenceAction: mocks.selfSetManualEvidenceAction,
}));
vi.mock('../manage/moderation/shared/actions/manual-times.action', () => ({
    updateManualTimeAction: mocks.updateManualTimeAction,
}));
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
// Present so the drawer rendering one would be visible to the assertions —
// it must not, since the host owns that dialog now (see the test below).
vi.mock('../shared/owner-hide-identity-dialog', () => ({
    OwnerHideIdentityDialog: () => <div data-testid="owner-hide-dialog" />,
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
    onOpenHideIdentity?: () => void;
    categoryId?: number | null;
    vodUrl?: string;
    entryOver?: Partial<LeaderboardEntry>;
}) {
    return render(
        <RunInspector
            entry={entry({
                verificationStatus: over.status ?? 'verified',
                vodUrl: over.vodUrl,
                ...over.entryOver,
            })}
            gameSlug="celeste"
            gameId={12}
            gameDisplay="Celeste"
            mode={over.mode}
            categorySlug="any"
            categoryDisplay="Any%"
            categoryId={
                over.categoryId === undefined
                    ? 4
                    : (over.categoryId ?? undefined)
            }
            primaryTiming="rt"
            subcategoryDefKeys={[]}
            showMilliseconds={false}
            onClose={vi.fn()}
            onMutated={vi.fn()}
            onOpenHideIdentity={over.onOpenHideIdentity ?? vi.fn()}
        />,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadRunHistoryAction.mockResolvedValue({ ok: true, events: [] });
    mocks.loadSelfEligibleRunsAction.mockResolvedValue({ ok: true, rows: [] });
    mocks.loadUserEligibleRunsAction.mockResolvedValue({ ok: true, rows: [] });
    mocks.loadOwnerEvidenceAction.mockResolvedValue({
        ok: true,
        vodUrl: null,
        description: null,
        descriptionRevoked: false,
    });
    mocks.selfSetEvidenceAction.mockResolvedValue({ ok: true });
    mocks.selfSetManualEvidenceAction.mockResolvedValue({ ok: true });
    mocks.updateManualTimeAction.mockResolvedValue({ ok: true });
    mocks.attachVodAction.mockResolvedValue({ ok: true, url: null });
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
            screen.getByRole('button', { name: 'Hide my identity…' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Adjust time…' }),
        ).toBeNull();
    });

    // Same status gate the run page's "Move my run…" applies (canMove in
    // run-actions.tsx) — a rejected run has nowhere to move from, so the
    // two owner-facing surfaces must agree.
    it('hides owner-mode Move on a rejected run, but keeps it for pending/verified', () => {
        const rejected = renderInspector({ mode: 'owner', status: 'rejected' });
        expect(screen.queryByRole('button', { name: 'Move…' })).toBeNull();
        rejected.unmount();

        renderInspector({ mode: 'owner', status: 'pending' });
        expect(
            screen.getByRole('button', { name: 'Move…' }),
        ).toBeInTheDocument();
    });

    // Mod-mode Move is untouched by the owner-only gate above — a moderator
    // can still place a rejected run onto a board.
    it('keeps mod-mode Move available on a rejected run', () => {
        renderInspector({ mode: 'mod', status: 'rejected' });
        expect(
            screen.getByRole('button', { name: 'Move…' }),
        ).toBeInTheDocument();
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

    // The one-way door: hiding from in here redacts the runner's own row, the
    // host's owner-mode guard stops matching it, and this drawer unmounts on
    // the next refetch. A dialog rendered in here would go with it mid-read,
    // so the drawer only ASKS — the host owns the dialog.
    it('delegates hide-identity to the host and renders no dialog of its own', () => {
        const onOpenHideIdentity = vi.fn();
        renderInspector({ mode: 'owner', onOpenHideIdentity });
        fireEvent.click(
            screen.getByRole('button', { name: 'Hide my identity…' }),
        );
        expect(onOpenHideIdentity).toHaveBeenCalled();
        expect(screen.queryByTestId('owner-hide-dialog')).toBeNull();
    });

    // Nothing to open = nothing to offer, rather than a dead control.
    it('omits the owner hide-identity control when the host offers no handler', () => {
        render(
            <RunInspector
                entry={entry()}
                gameSlug="celeste"
                gameId={12}
                gameDisplay="Celeste"
                mode="owner"
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
        expect(
            screen.queryByRole('button', { name: 'Hide my identity…' }),
        ).toBeNull();
    });

    // A `0` here would filter the runner's roster to nothing and let the
    // wizard state "You have no other times on this board" with total
    // confidence. Refuse to open instead.
    it('refuses to open the hide wizard when the board’s category is unknown', () => {
        renderInspector({ mode: 'owner', categoryId: null });
        fireEvent.click(screen.getByRole('button', { name: /Hide my run/ }));
        expect(screen.queryByTestId('owner-remove-form')).toBeNull();
        expect(
            screen.getByText(/couldn't work out which board this run is on/i),
        ).toBeInTheDocument();
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

    it('owner mode has no Review VOD control', () => {
        renderInspector({
            mode: 'owner',
            vodUrl: 'https://youtu.be/dQw4w9WgXcQ',
        });
        expect(
            screen.queryByRole('button', { name: /review vod/i }),
        ).toBeNull();
    });

    // The owner self-service evidence editor — B5. `evidencePermissions` is
    // its own pure-function suite; these assert the drawer actually wires
    // its result into `EvidenceEditor`, not just that the function is right.
    describe('owner evidence editor', () => {
        it('renders editable VOD + description when unverified', async () => {
            mocks.loadOwnerEvidenceAction.mockResolvedValue({
                ok: true,
                vodUrl: null,
                description: null,
                descriptionRevoked: false,
            });
            renderInspector({ mode: 'owner', status: 'pending' });
            await waitFor(() =>
                expect(
                    screen.getByRole('button', { name: /add a link/i }),
                ).toBeInTheDocument(),
            );
            expect(
                screen.getByRole('button', { name: /add a description/i }),
            ).toBeInTheDocument();
            expect(mocks.loadOwnerEvidenceAction).toHaveBeenCalledWith({
                kind: 'run',
                runId: 55,
            });
        });

        it('locks both fields when verified, with the lock note', async () => {
            mocks.loadOwnerEvidenceAction.mockResolvedValue({
                ok: true,
                vodUrl: null,
                description: 'Some notes.',
                descriptionRevoked: false,
            });
            renderInspector({ mode: 'owner', status: 'verified' });
            await waitFor(() =>
                expect(
                    screen.getByText(/locked, ask a moderator/i),
                ).toBeInTheDocument(),
            );
            expect(
                screen.queryByRole('button', { name: /add a link/i }),
            ).toBeNull();
            expect(
                screen.queryByRole('button', {
                    name: /edit description|add a description/i,
                }),
            ).toBeNull();
            // The description text itself still renders — locked means
            // read-only, not hidden.
            expect(screen.getByText('Some notes.')).toBeInTheDocument();
        });

        it('leaves VOD editable but locks description when revoked', async () => {
            mocks.loadOwnerEvidenceAction.mockResolvedValue({
                ok: true,
                vodUrl: null,
                description: null,
                descriptionRevoked: true,
            });
            renderInspector({ mode: 'owner', status: 'pending' });
            await waitFor(() =>
                expect(
                    screen.getByRole('button', { name: /add a link/i }),
                ).toBeInTheDocument(),
            );
            expect(
                screen.getByText(/description edit ability has been revoked/i),
            ).toBeInTheDocument();
            expect(
                screen.queryByRole('button', { name: /add a description/i }),
            ).toBeNull();
        });

        it('saves a VOD edit through the owner action for a run row', async () => {
            mocks.loadOwnerEvidenceAction.mockResolvedValue({
                ok: true,
                vodUrl: null,
                description: null,
                descriptionRevoked: false,
            });
            renderInspector({ mode: 'owner', status: 'pending' });
            await waitFor(() =>
                screen.getByRole('button', { name: /add a link/i }),
            );
            fireEvent.click(
                screen.getByRole('button', { name: /add a link/i }),
            );
            fireEvent.change(screen.getByLabelText(/video link/i), {
                target: { value: 'https://youtu.be/abc123' },
            });
            fireEvent.click(screen.getByRole('button', { name: /attach/i }));
            await waitFor(() =>
                expect(mocks.selfSetEvidenceAction).toHaveBeenCalledWith(55, {
                    vodUrl: 'https://youtu.be/abc123',
                }),
            );
            expect(mocks.selfSetManualEvidenceAction).not.toHaveBeenCalled();
            expect(mocks.attachVodAction).not.toHaveBeenCalled();
        });

        it('does not fetch owner evidence in mod mode', () => {
            renderInspector({ mode: 'mod', status: 'pending' });
            expect(mocks.loadOwnerEvidenceAction).not.toHaveBeenCalled();
        });
    });

    // Mod mode's attach path branches on the row's type, not a runId cast —
    // a set time has no finished_run, so it must go through
    // updateManualTimeAction, never attachVodAction.
    describe('mod-mode evidence attach branches on row type', () => {
        it('a run row attaches through attachVodAction with runId', async () => {
            renderInspector({ mode: 'mod', status: 'pending' });
            fireEvent.click(
                screen.getByRole('button', { name: /add a link/i }),
            );
            fireEvent.change(screen.getByLabelText(/video link/i), {
                target: { value: 'https://youtu.be/xyz789' },
            });
            fireEvent.click(screen.getByRole('button', { name: /attach/i }));
            await waitFor(() =>
                expect(mocks.attachVodAction).toHaveBeenCalledWith(
                    'celeste',
                    55,
                    'https://youtu.be/xyz789',
                    { categorySlug: 'any', subcategoryKey: '' },
                ),
            );
            expect(mocks.updateManualTimeAction).not.toHaveBeenCalled();
        });

        it('a manual (set time) row attaches through updateManualTimeAction with manualTimeId', async () => {
            renderInspector({
                mode: 'mod',
                status: 'pending',
                entryOver: { source: 'manual', manualTimeId: 909 },
            });
            fireEvent.click(
                screen.getByRole('button', { name: /add a link/i }),
            );
            fireEvent.change(screen.getByLabelText(/video link/i), {
                target: { value: 'https://youtu.be/manual1' },
            });
            fireEvent.click(screen.getByRole('button', { name: /attach/i }));
            await waitFor(() =>
                expect(mocks.updateManualTimeAction).toHaveBeenCalledWith(
                    'celeste',
                    909,
                    expect.objectContaining({
                        evidenceUrl: 'https://youtu.be/manual1',
                    }),
                ),
            );
            expect(mocks.attachVodAction).not.toHaveBeenCalled();
        });
    });

    // A signed-out visitor or a non-owner never gets `mode="owner"` from the
    // host in the first place (leaderboard-pager.tsx gates on `isOwnEntry`);
    // mod mode on a guest/no-account row is what's left to prove doesn't
    // regress — the evidence block still renders and still uses the mod
    // path, unaffected by the owner-mode additions above.
    it('mod mode on a guest row still uses the mod attach path', async () => {
        renderInspector({
            mode: 'mod',
            status: 'pending',
            entryOver: { userId: null, isGuest: true },
        });
        fireEvent.click(screen.getByRole('button', { name: /add a link/i }));
        fireEvent.change(screen.getByLabelText(/video link/i), {
            target: { value: 'https://youtu.be/guest1' },
        });
        fireEvent.click(screen.getByRole('button', { name: /attach/i }));
        await waitFor(() =>
            expect(mocks.attachVodAction).toHaveBeenCalledWith(
                'celeste',
                55,
                'https://youtu.be/guest1',
                { categorySlug: 'any', subcategoryKey: '' },
            ),
        );
    });
});
