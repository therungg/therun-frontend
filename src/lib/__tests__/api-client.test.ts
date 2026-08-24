import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch } from '../api-client';

const mockFetch = (status: number, body: string) => {
    vi.stubGlobal(
        'fetch',
        // 204 must carry a null body — Response throws on '' with 204.
        vi.fn(
            async () => new Response(status === 204 ? null : body, { status }),
        ),
    );
};

describe('apiFetch', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('unwraps { result } from a JSON 200', async () => {
        mockFetch(200, JSON.stringify({ result: { a: 1 } }));
        await expect(apiFetch('/x')).resolves.toEqual({ a: 1 });
    });

    it('returns undefined for a 204', async () => {
        mockFetch(204, '');
        await expect(apiFetch('/x')).resolves.toBeUndefined();
    });

    it('tolerates a legacy plain-text 200 body instead of throwing', async () => {
        // Backend `ok("Saved user!")` returns a bare string body; this must
        // not surface as a SyntaxError-shaped failure to callers.
        mockFetch(200, 'Saved user!');
        await expect(apiFetch('/x')).resolves.toBeUndefined();
    });

    it('throws ApiError with the backend { error } message', async () => {
        mockFetch(400, JSON.stringify({ error: 'Max 100 bio' }));
        await expect(apiFetch('/x')).rejects.toMatchObject({
            status: 400,
            message: 'Max 100 bio',
        });
    });

    it('throws ApiError with a plain-text error body', async () => {
        mockFetch(400, 'Max 25 aka');
        const err = (await apiFetch('/x').catch((e) => e)) as ApiError;
        expect(err).toBeInstanceOf(ApiError);
        expect(err.message).toBe('Max 25 aka');
    });
});
