import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    meFetch: vi.fn(),
    revalidateRunDetails: vi.fn(),
    revalidateTag: vi.fn(),
}));
vi.mock('~src/actions/session.action', () => ({
    getSession: mocks.getSession,
}));
vi.mock('~src/lib/moderation/mod-fetch', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('~src/lib/moderation/mod-fetch')>();
    return { ...actual, meFetch: mocks.meFetch };
});
vi.mock('~src/lib/moderation/revalidate-boards', () => ({
    revalidateRunDetails: mocks.revalidateRunDetails,
}));
vi.mock('next/cache', () => ({ revalidateTag: mocks.revalidateTag }));

import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    selfSetEvidenceAction,
    selfSetManualEvidenceAction,
} from '../self-evidence.action';

describe('selfSetEvidenceAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSession.mockResolvedValue({ id: 'sess', username: 'runner' });
        mocks.meFetch.mockResolvedValue(undefined);
    });

    it('refuses when not signed in', async () => {
        mocks.getSession.mockResolvedValue(null);
        const r = await selfSetEvidenceAction(9, { vodUrl: 'https://x.com' });
        expect(r).toEqual({ error: 'You must be signed in.' });
        expect(mocks.meFetch).not.toHaveBeenCalled();
    });

    it('POSTs to /v1/me/runs/{runId}/evidence with only present fields', async () => {
        const r = await selfSetEvidenceAction(9, {
            vodUrl: 'https://twitch.tv/x',
        });
        expect(r).toEqual({ ok: true });
        expect(mocks.meFetch).toHaveBeenCalledWith('/v1/me/runs/9/evidence', {
            sessionId: 'sess',
            method: 'POST',
            body: { vodUrl: 'https://twitch.tv/x' },
        });
        expect(mocks.revalidateRunDetails).toHaveBeenCalledWith([9]);
    });

    it('sends both fields when both present, including explicit null to clear', async () => {
        await selfSetEvidenceAction(9, { vodUrl: null, description: 'desc' });
        expect(mocks.meFetch).toHaveBeenCalledWith('/v1/me/runs/9/evidence', {
            sessionId: 'sess',
            method: 'POST',
            body: { vodUrl: null, description: 'desc' },
        });
    });

    it('omits absent fields entirely', async () => {
        await selfSetEvidenceAction(9, { description: 'desc' });
        expect(mocks.meFetch).toHaveBeenCalledWith('/v1/me/runs/9/evidence', {
            sessionId: 'sess',
            method: 'POST',
            body: { description: 'desc' },
        });
    });

    it('maps ModError to {error}', async () => {
        mocks.meFetch.mockRejectedValue(
            new ModError(403, 'This run is verified — ask a moderator…'),
        );
        const r = await selfSetEvidenceAction(9, { vodUrl: 'https://x.com' });
        expect(r).toEqual({
            error: 'This run is verified — ask a moderator…',
        });
        expect(mocks.revalidateRunDetails).not.toHaveBeenCalled();
    });

    it('maps unknown errors to a generic message', async () => {
        mocks.meFetch.mockRejectedValue(new Error('boom'));
        const r = await selfSetEvidenceAction(9, { vodUrl: 'https://x.com' });
        expect(r).toEqual({
            error: 'Something went wrong. Please try again.',
        });
    });
});

describe('selfSetManualEvidenceAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSession.mockResolvedValue({ id: 'sess', username: 'runner' });
        mocks.meFetch.mockResolvedValue(undefined);
    });

    it('refuses when not signed in', async () => {
        mocks.getSession.mockResolvedValue(null);
        const r = await selfSetManualEvidenceAction(5, {
            evidenceUrl: 'https://x.com',
        });
        expect(r).toEqual({ error: 'You must be signed in.' });
        expect(mocks.meFetch).not.toHaveBeenCalled();
    });

    it('POSTs to /v1/me/manual-times with manualTimeId + only present fields', async () => {
        const r = await selfSetManualEvidenceAction(5, {
            evidenceUrl: 'https://twitch.tv/x',
        });
        expect(r).toEqual({ ok: true });
        expect(mocks.meFetch).toHaveBeenCalledWith('/v1/me/manual-times', {
            sessionId: 'sess',
            method: 'POST',
            body: { manualTimeId: 5, evidenceUrl: 'https://twitch.tv/x' },
        });
        expect(mocks.revalidateTag).toHaveBeenCalledWith(
            'manual-time:5',
            'minutes',
        );
    });

    it('never sends timeMs (routes to evidence/description edit, not a re-time)', async () => {
        await selfSetManualEvidenceAction(5, {
            evidenceUrl: 'https://x.com',
            description: 'desc',
        });
        const body = mocks.meFetch.mock.calls[0][1].body;
        expect(body).not.toHaveProperty('timeMs');
        expect(body).toEqual({
            manualTimeId: 5,
            evidenceUrl: 'https://x.com',
            description: 'desc',
        });
    });

    it('omits absent fields', async () => {
        await selfSetManualEvidenceAction(5, { description: 'desc' });
        expect(mocks.meFetch).toHaveBeenCalledWith('/v1/me/manual-times', {
            sessionId: 'sess',
            method: 'POST',
            body: { manualTimeId: 5, description: 'desc' },
        });
    });

    it('maps ModError to {error}', async () => {
        mocks.meFetch.mockRejectedValue(new ModError(403, 'Forbidden'));
        const r = await selfSetManualEvidenceAction(5, {
            evidenceUrl: 'https://x.com',
        });
        expect(r).toEqual({ error: 'Forbidden' });
        expect(mocks.revalidateTag).not.toHaveBeenCalled();
    });

    it('maps unknown errors to a generic message', async () => {
        mocks.meFetch.mockRejectedValue(new Error('boom'));
        const r = await selfSetManualEvidenceAction(5, {
            evidenceUrl: 'https://x.com',
        });
        expect(r).toEqual({
            error: 'Something went wrong. Please try again.',
        });
    });
});
