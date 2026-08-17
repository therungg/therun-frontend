import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VodReviewPatch } from '../../../../../../types/leaderboards.types';

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    resolveGame: vi.fn(),
    canModerateGame: vi.fn(),
    editRun: vi.fn(),
    updateManualTime: vi.fn(),
    revalidateRunDetails: vi.fn(),
    revalidateTag: vi.fn(),
}));
vi.mock('~src/actions/session.action', () => ({
    getSession: mocks.getSession,
}));
vi.mock('~src/lib/games-v1', () => ({ resolveGame: mocks.resolveGame }));
vi.mock('~src/lib/moderation/can-moderate', () => ({
    canModerateGame: mocks.canModerateGame,
}));
vi.mock('~src/lib/moderation/run-edit', () => ({ editRun: mocks.editRun }));
vi.mock('~src/lib/moderation/manual-times', () => ({
    updateManualTime: mocks.updateManualTime,
}));
vi.mock('~src/lib/moderation/revalidate-boards', () => ({
    revalidateRunDetails: mocks.revalidateRunDetails,
}));
vi.mock('next/cache', () => ({ revalidateTag: mocks.revalidateTag }));

import { saveVodReviewAction } from './vod-review.action';

const patch: VodReviewPatch = {
    fps: 60,
    markers: [
        { kind: 'start', frame: 600 },
        { kind: 'end', frame: 6600 },
    ],
    retimedMs: 100000,
};

describe('saveVodReviewAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSession.mockResolvedValue({ username: 'mod', id: 'sess' });
        mocks.resolveGame.mockResolvedValue({ id: 1, name: 'Game' });
        mocks.canModerateGame.mockReturnValue(true);
        mocks.editRun.mockResolvedValue({ updated: true });
        mocks.updateManualTime.mockResolvedValue({ id: 5, updated: true });
    });
    it('saves markers on a run with the stamped reason', async () => {
        const r = await saveVodReviewAction(
            'game',
            { kind: 'run', runId: 9 },
            patch,
        );
        expect(r).toEqual({ ok: true });
        expect(mocks.editRun).toHaveBeenCalledWith('sess', 9, {
            vodReview: patch,
            reason: 'Saved VOD review markers from the board mod drawer.',
        });
        expect(mocks.revalidateRunDetails).toHaveBeenCalledWith([9]);
    });
    it('applies the retime as the run time in the same edit', async () => {
        await saveVodReviewAction('game', { kind: 'run', runId: 9 }, patch, {
            applyRetimeMs: 100000,
        });
        expect(mocks.editRun).toHaveBeenCalledWith('sess', 9, {
            vodReview: patch,
            time: 100000,
            reason: 'Retimed from VOD: frames 600→6600 at 60 fps.',
        });
    });
    it('clears with null', async () => {
        await saveVodReviewAction(
            'game',
            { kind: 'manual', manualTimeId: 5, gameId: 1 },
            null,
        );
        expect(mocks.updateManualTime).toHaveBeenCalledWith('sess', 1, 5, {
            vodReview: null,
            reason: 'Cleared VOD review markers from the board mod drawer.',
        });
        expect(mocks.revalidateTag).toHaveBeenCalledWith(
            'manual-time:5',
            'minutes',
        );
    });
    it('refuses non-moderators', async () => {
        mocks.canModerateGame.mockReturnValue(false);
        expect(
            await saveVodReviewAction('game', { kind: 'run', runId: 9 }, patch),
        ).toEqual({ error: 'Not authorized to moderate this game.' });
        expect(mocks.editRun).not.toHaveBeenCalled();
    });
});
