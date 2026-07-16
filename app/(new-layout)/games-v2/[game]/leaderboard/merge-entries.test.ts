import { describe, expect, it } from 'vitest';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import { mergeEntries } from './merge-entries';

function entry(rank: number, runId: number | null): LeaderboardEntry {
    return {
        rank,
        runnerName: `runner${rank}`,
        userId: null,
        isGuest: false,
        runId,
        time: rank * 1000,
        realTime: rank * 1000,
        gameTime: null,
        runDate: null,
        vodUrl: null,
        verificationStatus: 'verified',
        variables: null,
        source: 'run',
        manualTimeId: null,
    };
}

describe('mergeEntries', () => {
    it('flattens and sorts by rank', () => {
        const merged = mergeEntries([
            [entry(3, 3), entry(4, 4)],
            [entry(1, 1), entry(2, 2)],
        ]);
        expect(merged.map((e) => e.rank)).toEqual([1, 2, 3, 4]);
    });
    it('dedupes overlapping pages by run identity', () => {
        const merged = mergeEntries([
            [entry(1, 1), entry(2, 2)],
            [entry(2, 2), entry(3, 3)],
        ]);
        expect(merged).toHaveLength(3);
    });
    it('dedupes manual/guest entries without runId by name+rank', () => {
        const a = { ...entry(5, null), runnerName: 'guest' };
        const merged = mergeEntries([[a], [{ ...a }]]);
        expect(merged).toHaveLength(1);
    });
});
