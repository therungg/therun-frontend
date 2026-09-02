import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRaceCategoryStats, getRaceGameStatsByGame } from '../races';

vi.mock('next/cache', () => ({
    cacheLife: vi.fn(),
    cacheTag: vi.fn(),
}));

const mockFetch = (status: number, body: string) => {
    const fn = vi.fn(async () => new Response(body, { status }));
    vi.stubGlobal('fetch', fn);
    return fn;
};

describe('getRaceCategoryStats', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('percent-encodes the game and category into the URL exactly once', async () => {
        const fn = mockFetch(
            200,
            JSON.stringify({ result: { stats: { totalRaces: 1 } } }),
        );

        await getRaceCategoryStats('Super Meat Boy', 'Any%');

        const calledUrl = fn.mock.calls[0][0] as string;
        expect(calledUrl).toContain('Super%20Meat%20Boy/Any%25');
    });

    it('returns null when the API answers with an HTML error page', async () => {
        mockFetch(400, '<!DOCTYPE html><html><body>Bad Request</body></html>');

        await expect(
            getRaceCategoryStats('Super Meat Boy', 'Any%'),
        ).resolves.toBeNull();
    });

    it('returns null when the response is not ok even with a JSON body', async () => {
        mockFetch(500, JSON.stringify({ error: 'Internal Server Error' }));

        await expect(
            getRaceCategoryStats('Super Meat Boy', 'Any%'),
        ).resolves.toBeNull();
    });

    it('returns null when the result has no stats', async () => {
        mockFetch(200, JSON.stringify({ result: { users: [] } }));

        await expect(
            getRaceCategoryStats('Super Meat Boy', 'Any%'),
        ).resolves.toBeNull();
    });
});

describe('getRaceGameStatsByGame', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns null when the result has no stats', async () => {
        mockFetch(200, JSON.stringify({ result: { users: [] } }));

        await expect(
            getRaceGameStatsByGame('Super Meat Boy'),
        ).resolves.toBeNull();
    });

    it('returns null when the response is not JSON', async () => {
        mockFetch(200, '<!DOCTYPE html><html><body>Bad Request</body></html>');

        await expect(
            getRaceGameStatsByGame('Super Meat Boy'),
        ).resolves.toBeNull();
    });

    it('returns the stats with a normalised categories array', async () => {
        mockFetch(
            200,
            JSON.stringify({
                result: {
                    stats: { displayValue: 'Super Meat Boy', totalRaces: 5 },
                },
            }),
        );

        await expect(getRaceGameStatsByGame('Super Meat Boy')).resolves.toEqual(
            {
                stats: { displayValue: 'Super Meat Boy', totalRaces: 5 },
                categories: [],
            },
        );
    });
});
