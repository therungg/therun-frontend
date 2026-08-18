// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import { ManualInspector } from './manual-inspector';

// vi.mock factories are hoisted above the imports — same pattern as
// run-inspector-owner.test.tsx.
const mocks = vi.hoisted(() => ({
    loadUserEligibleRunsAction: vi.fn(),
    loadModBoardContext: vi.fn(),
    loadOwnerEvidenceAction: vi.fn(),
    selfSetManualEvidenceAction: vi.fn(),
}));

vi.mock('../manage/moderation/shared/actions/eligible-runs.action', () => ({
    loadUserEligibleRunsAction: mocks.loadUserEligibleRunsAction,
}));
vi.mock('./actions/load-mod-board-context.action', () => ({
    loadModBoardContextAction: mocks.loadModBoardContext,
}));
vi.mock('./actions/load-owner-evidence.action', () => ({
    loadOwnerEvidenceAction: mocks.loadOwnerEvidenceAction,
}));
vi.mock('~src/actions/self-evidence.action', () => ({
    selfSetManualEvidenceAction: mocks.selfSetManualEvidenceAction,
}));
vi.mock('react-toastify', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// The forms and dialogs the footer opens have their own suites; here they
// are stubs so the assertions are about which controls the drawer offers.
vi.mock('../manage/moderation/shared/run-action-dialog', () => ({
    RunActionForm: () => <div data-testid="mod-action-form" />,
    VERB_TITLE: {
        approve: 'Verify',
        reject: 'Reject',
        remove: 'Remove',
    },
}));
vi.mock('../manage/moderation/shared/manual-time-dialog', () => ({
    ManualTimeDialog: () => <div data-testid="manual-time-dialog" />,
}));
vi.mock('./vod-review/review-vod-panel', () => ({
    ReviewVodPanel: () => <div data-testid="review-vod-panel" />,
}));

const entry = (over: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
    runId: null,
    manualTimeId: 909,
    source: 'manual',
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
    entryOver?: Partial<LeaderboardEntry>;
}) {
    return render(
        <ManualInspector
            entry={entry({
                verificationStatus: over.status ?? 'verified',
                ...over.entryOver,
            })}
            gameSlug="celeste"
            gameId={12}
            mode={over.mode}
            categorySlug="any"
            subcategoryDefKeys={[]}
            showMilliseconds={false}
            onClose={vi.fn()}
            onMutated={vi.fn()}
        />,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadUserEligibleRunsAction.mockResolvedValue({ ok: true, rows: [] });
    mocks.loadOwnerEvidenceAction.mockResolvedValue({
        ok: true,
        vodUrl: null,
        description: null,
        descriptionRevoked: false,
    });
    mocks.selfSetManualEvidenceAction.mockResolvedValue({ ok: true });
});

describe('ManualInspector owner mode', () => {
    it('renders the evidence editor and no mod verbs when unverified', async () => {
        renderInspector({ mode: 'owner', status: 'pending' });
        await waitFor(() =>
            expect(
                screen.getByRole('button', { name: /add a link/i }),
            ).toBeInTheDocument(),
        );
        expect(
            screen.getByRole('button', { name: /add a description/i }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Verify' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
        expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Change time…' }),
        ).toBeNull();
        expect(mocks.loadOwnerEvidenceAction).toHaveBeenCalledWith({
            kind: 'manual',
            manualTimeId: 909,
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

    it('mod mode keeps the full moderation verb surface', async () => {
        renderInspector({ mode: 'mod', status: 'pending' });
        expect(
            screen.getByRole('button', { name: 'Verify' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Reject' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Remove/ }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Change time…' }),
        ).toBeInTheDocument();
        expect(mocks.loadOwnerEvidenceAction).not.toHaveBeenCalled();
    });

    it('does not fetch owner evidence in mod mode, defaulted or explicit', () => {
        render(
            <ManualInspector
                entry={entry({ verificationStatus: 'pending' })}
                gameSlug="celeste"
                gameId={12}
                categorySlug="any"
                subcategoryDefKeys={[]}
                showMilliseconds={false}
                onClose={vi.fn()}
                onMutated={vi.fn()}
            />,
        );
        expect(mocks.loadOwnerEvidenceAction).not.toHaveBeenCalled();
    });
});
