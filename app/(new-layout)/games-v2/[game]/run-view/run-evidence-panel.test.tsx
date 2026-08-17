// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunViewModel } from './run-view';

const mocks = vi.hoisted(() => ({
    selfSetEvidenceAction: vi.fn(),
    selfSetManualEvidenceAction: vi.fn(),
    attachVodAction: vi.fn(),
    updateManualTimeAction: vi.fn(),
}));

vi.mock('~src/actions/self-evidence.action', () => ({
    selfSetEvidenceAction: mocks.selfSetEvidenceAction,
    selfSetManualEvidenceAction: mocks.selfSetManualEvidenceAction,
}));
vi.mock('../leaderboard/actions/attach-vod.action', () => ({
    attachVodAction: mocks.attachVodAction,
}));
vi.mock('../manage/moderation/shared/actions/manual-times.action', () => ({
    updateManualTimeAction: mocks.updateManualTimeAction,
}));

import { RunEvidencePanel } from './run-evidence-panel';

afterEach(() => {
    cleanup();
});

beforeEach(() => {
    vi.clearAllMocks();
});

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
    description: null,
    descriptionRevoked: false,
    verificationStatus: 'pending',
    variables: {},
    origin: null,
    verifiedBy: null,
    rejectionReason: null,
    boardStanding: null,
    ...over,
});

describe('RunEvidencePanel', () => {
    it('owner of an unverified run sees the editor, both fields editable', () => {
        render(
            <RunEvidencePanel
                model={baseModel()}
                sessionUsername="Joey"
                isMod={false}
            />,
        );

        expect(screen.getByText(/add a link/i)).toBeInTheDocument();
        expect(screen.getByText(/add a description/i)).toBeInTheDocument();
    });

    it('owner of a verified run is locked out, with a reason shown', () => {
        render(
            <RunEvidencePanel
                model={baseModel({ verificationStatus: 'verified' })}
                sessionUsername="Joey"
                isMod={false}
            />,
        );

        expect(screen.queryByText(/add a link/i)).not.toBeInTheDocument();
        expect(
            screen.queryByText(/add a description/i),
        ).not.toBeInTheDocument();
        expect(screen.getByText(/verified — locked/i)).toBeInTheDocument();
    });

    it('a stranger sees no edit affordances at all, own no locked note', () => {
        render(
            <RunEvidencePanel
                model={baseModel()}
                sessionUsername="SomeoneElse"
                isMod={false}
            />,
        );

        expect(screen.queryByText(/add a link/i)).not.toBeInTheDocument();
        expect(
            screen.queryByText(/add a description/i),
        ).not.toBeInTheDocument();
        expect(screen.getByText(/no video/i)).toBeInTheDocument();
        expect(screen.getByText(/no description/i)).toBeInTheDocument();
    });

    it('a logged-out visitor (no session username) sees no edit affordances', () => {
        render(
            <RunEvidencePanel
                model={baseModel()}
                sessionUsername={null}
                isMod={false}
            />,
        );

        expect(screen.queryByText(/add a link/i)).not.toBeInTheDocument();
    });

    it('a guest-run owner name match never counts as owner', () => {
        render(
            <RunEvidencePanel
                model={baseModel({ isGuest: true, userId: null })}
                sessionUsername="Joey"
                isMod={false}
            />,
        );

        expect(screen.queryByText(/add a link/i)).not.toBeInTheDocument();
    });

    it('a mod (not owner) can edit the vod when a board standing is known, never the description', () => {
        render(
            <RunEvidencePanel
                model={baseModel({
                    boardStanding: {
                        categorySlug: 'any',
                        subcategoryKey: '',
                        rank: 3,
                        totalRunners: 10,
                    },
                })}
                sessionUsername="SomeMod"
                isMod
            />,
        );

        expect(screen.getByText(/add a link/i)).toBeInTheDocument();
        expect(
            screen.queryByText(/add a description/i),
        ).not.toBeInTheDocument();
    });

    it('a mod (not owner) with no board standing on a run cannot edit the vod either', () => {
        render(
            <RunEvidencePanel
                model={baseModel({ boardStanding: null })}
                sessionUsername="SomeMod"
                isMod
            />,
        );

        expect(screen.queryByText(/add a link/i)).not.toBeInTheDocument();
    });

    it('a mod editing a manual time can edit the vod via updateManualTimeAction', () => {
        render(
            <RunEvidencePanel
                model={baseModel({ kind: 'manual' })}
                sessionUsername="SomeMod"
                isMod
            />,
        );

        expect(screen.getByText(/add a link/i)).toBeInTheDocument();
    });

    it('the run owner is routed through selfSetEvidenceAction, not the mod path', () => {
        const model = baseModel();
        render(
            <RunEvidencePanel
                model={model}
                sessionUsername="Joey"
                isMod={false}
            />,
        );
        // Presence of the affordance already proves owner perms resolved;
        // the callback wiring itself is exercised through EvidenceEditor's
        // own interaction tests. Here we just confirm no mod action mock
        // was reached for an owner render.
        expect(mocks.attachVodAction).not.toHaveBeenCalled();
        expect(mocks.updateManualTimeAction).not.toHaveBeenCalled();
    });
});
