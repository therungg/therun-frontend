import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    apiFetch: vi.fn(),
    revalidateTag: vi.fn(),
}));
vi.mock('~src/actions/session.action', () => ({
    getSession: mocks.getSession,
}));
vi.mock('~src/lib/api-client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('~src/lib/api-client')>();
    return { ...actual, apiFetch: mocks.apiFetch };
});
vi.mock('next/cache', () => ({ revalidateTag: mocks.revalidateTag }));

import { ApiError } from '~src/lib/api-client';
import { savePatreonSettings } from '../save-patreon-settings.action';

const prefs = { hide: false, bold: true } as any;

describe('savePatreonSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSession.mockResolvedValue({ id: 'sess', username: 'joey' });
        mocks.apiFetch.mockResolvedValue(undefined);
    });

    it('refuses when signed out', async () => {
        mocks.getSession.mockResolvedValue({ id: '', username: '' });
        expect(await savePatreonSettings(prefs)).toEqual({
            ok: false,
            error: 'You must be signed in.',
        });
    });

    it('POSTs with bearer auth and revalidates the patrons tag', async () => {
        expect(await savePatreonSettings(prefs)).toEqual({ ok: true });
        expect(mocks.apiFetch).toHaveBeenCalledWith('/users/patreon/joey', {
            method: 'POST',
            sessionId: 'sess',
            body: prefs,
        });
        expect(mocks.revalidateTag).toHaveBeenCalledWith('patrons', 'hours');
    });

    it('maps a 403', async () => {
        mocks.apiFetch.mockRejectedValue(new ApiError(403, 'no'));
        expect(await savePatreonSettings(prefs)).toEqual({
            ok: false,
            error: "You don't have permission to do that.",
        });
    });
});
