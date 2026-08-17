import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    __resetUserCardCache,
    __setUserCardFetcher,
    loadUserCard,
    peekUserCard,
} from '../user-card-store';

const okResponse = (body: unknown) =>
    ({ ok: true, json: async () => body }) as Response;

describe('loadUserCard', () => {
    beforeEach(() => {
        __resetUserCardCache();
    });

    it('fetches a runner once however many links mention them', async () => {
        const fetcher = vi.fn(async () => okResponse({ user: 'joey' }));
        __setUserCardFetcher(fetcher);

        await Promise.all(
            Array.from({ length: 50 }, () => loadUserCard('joey')),
        );

        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('treats differently-cased names as the same runner', async () => {
        const fetcher = vi.fn(async () => okResponse({ user: 'joey' }));
        __setUserCardFetcher(fetcher);

        await loadUserCard('Joey');
        await loadUserCard('joey');
        await loadUserCard('JOEY');

        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('percent-encodes the username in the request', async () => {
        const fetcher = vi.fn(async () => okResponse(null));
        __setUserCardFetcher(fetcher);

        await loadUserCard('くもしー');

        expect(fetcher).toHaveBeenCalledWith(
            '/api/users/%E3%81%8F%E3%82%82%E3%81%97%E3%83%BC/card',
        );
    });

    it('resolves null for a runner the backend will not serve', async () => {
        __setUserCardFetcher(async () => ({ ok: false }) as Response);

        await expect(loadUserCard('banned')).resolves.toBeNull();
    });

    it('retries after a transient failure instead of caching it', async () => {
        const fetcher = vi
            .fn<() => Promise<Response>>()
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce(okResponse({ user: 'joey' }));
        __setUserCardFetcher(fetcher);

        await expect(loadUserCard('joey')).resolves.toBeNull();
        await expect(loadUserCard('joey')).resolves.toEqual({ user: 'joey' });
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('hands a resolved runner back synchronously for a re-hover', async () => {
        __setUserCardFetcher(async () => okResponse({ user: 'joey' }));

        expect(peekUserCard('joey')).toBeUndefined();
        await loadUserCard('joey');
        expect(peekUserCard('JOEY')).toEqual({ user: 'joey' });
    });
});
