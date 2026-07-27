import { describe, expect, it, vi } from 'vitest';
import type {
    LeaderboardEntry,
    LeaderboardResponse,
} from '../../../../../types/leaderboards.types';
import { resolveWrEntry } from './wr-entry';

function entry(
    overrides: Partial<LeaderboardEntry> & { rank: number },
): LeaderboardEntry {
    return {
        runnerName: `runner-${overrides.rank}`,
        isGuest: false,
        time: 1000 * overrides.rank,
        realTime: 1000 * overrides.rank,
        gameTime: null,
        runDate: null,
        verificationStatus: 'verified',
        ...overrides,
    };
}

function board(overrides: Partial<LeaderboardResponse>): LeaderboardResponse {
    return {
        entries: [],
        page: 1,
        pageSize: 25,
        totalItems: 0,
        totalPages: 0,
        hideRealTime: false,
        hideGameTime: false,
        ...overrides,
    };
}

describe('resolveWrEntry', () => {
    it('takes rank 1 straight off page 1 without a second read', async () => {
        const fetchFirstPage = vi.fn();
        const result = await resolveWrEntry(
            board({
                page: 1,
                totalItems: 3,
                entries: [entry({ rank: 1 }), entry({ rank: 2 })],
            }),
            fetchFirstPage,
        );
        expect(result?.rank).toBe(1);
        expect(fetchFirstPage).not.toHaveBeenCalled();
    });

    it('returns null for an empty board and never reads page 1', async () => {
        const fetchFirstPage = vi.fn();
        const result = await resolveWrEntry(
            board({ page: 1, totalItems: 0 }),
            fetchFirstPage,
        );
        expect(result).toBeNull();
        expect(fetchFirstPage).not.toHaveBeenCalled();
    });

    it('reads page 1 when the visitor deep-linked a later page', async () => {
        const fetchFirstPage = vi.fn().mockResolvedValue([entry({ rank: 1 })]);
        const result = await resolveWrEntry(
            board({ page: 4, totalItems: 90, entries: [entry({ rank: 76 })] }),
            fetchFirstPage,
        );
        expect(result?.rank).toBe(1);
        expect(fetchFirstPage).toHaveBeenCalledTimes(1);
    });

    it('degrades to null when the page-1 read fails', async () => {
        const result = await resolveWrEntry(
            board({ page: 4, totalItems: 90, entries: [entry({ rank: 76 })] }),
            async () => null,
        );
        expect(result).toBeNull();
    });

    it('degrades to null when page 1 comes back empty', async () => {
        const result = await resolveWrEntry(
            board({ page: 3, totalItems: 90, entries: [entry({ rank: 51 })] }),
            async () => [],
        );
        expect(result).toBeNull();
    });
});
