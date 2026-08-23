import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    apiFetch: vi.fn(),
    updateTag: vi.fn(),
}));
vi.mock('~src/actions/session.action', () => ({
    getSession: mocks.getSession,
}));
vi.mock('~src/lib/api-client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('~src/lib/api-client')>();
    return { ...actual, apiFetch: mocks.apiFetch };
});
vi.mock('next/cache', () => ({ updateTag: mocks.updateTag }));

import { ApiError } from '~src/lib/api-client';
import { updateProfile } from '../update-profile.action';

describe('updateProfile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSession.mockResolvedValue({ id: 'sess', username: 'joey' });
        mocks.apiFetch.mockResolvedValue(undefined);
    });

    it('refuses when not signed in', async () => {
        mocks.getSession.mockResolvedValue({ id: '', username: '' });
        const r = await updateProfile({ bio: 'x' });
        expect(r).toEqual({ ok: false, error: 'You must be signed in.' });
        expect(mocks.apiFetch).not.toHaveBeenCalled();
    });

    it('PUTs the normalised payload with bearer auth and updates the tag', async () => {
        const r = await updateProfile({
            bio: ' hi ',
            country: 'Show no country',
            socials: { youtube: 'https://youtube.com/@joey', twitter: 'joey' },
        });
        expect(r).toEqual({ ok: true });
        expect(mocks.apiFetch).toHaveBeenCalledWith('/users/joey', {
            method: 'PUT',
            sessionId: 'sess',
            body: {
                bio: 'hi',
                country: '',
                socials: { youtube: '@joey', twitter: 'joey' },
            },
        });
        expect(mocks.updateTag).toHaveBeenCalledWith('user-joey');
    });

    it('returns the validation message for bad input', async () => {
        const r = await updateProfile({ bio: 'x'.repeat(101) });
        expect(r.ok).toBe(false);
        expect(mocks.apiFetch).not.toHaveBeenCalled();
    });

    it('maps a 403 to a permission message', async () => {
        mocks.apiFetch.mockRejectedValue(new ApiError(403, 'nope'));
        const r = await updateProfile({ bio: 'x' });
        expect(r).toEqual({
            ok: false,
            error: "You don't have permission to do that.",
        });
    });

    it('passes other API errors through', async () => {
        mocks.apiFetch.mockRejectedValue(new ApiError(500, 'boom'));
        expect(await updateProfile({ bio: 'x' })).toEqual({
            ok: false,
            error: 'boom',
        });
    });

    it('encodes the username in the path', async () => {
        mocks.getSession.mockResolvedValue({ id: 'sess', username: 'くも' });
        await updateProfile({ bio: 'x' });
        expect(mocks.apiFetch.mock.calls[0][0]).toBe(
            '/users/%E3%81%8F%E3%82%82',
        );
    });
});
