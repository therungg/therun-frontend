import { describe, expect, it } from 'vitest';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import { splitCardEntries } from './card-entries';

function entry(rank: number, time: number | null): LeaderboardEntry {
    return {
        rank,
        time,
        runnerName: `runner${rank}`,
        runDate: null,
        verificationStatus: 'verified',
    } as LeaderboardEntry;
}

describe('splitCardEntries', () => {
    it('empty board -> no wr, no podium', () => {
        expect(splitCardEntries([])).toEqual({ wr: null, podium: [] });
    });

    it('first entry not rank 1 -> treated as empty', () => {
        expect(splitCardEntries([entry(2, 100)])).toEqual({
            wr: null,
            podium: [],
        });
    });

    it('rank-1 with null time -> treated as empty', () => {
        expect(splitCardEntries([entry(1, null)])).toEqual({
            wr: null,
            podium: [],
        });
    });

    it('single entry -> wr only, empty podium', () => {
        const e1 = entry(1, 100);
        expect(splitCardEntries([e1])).toEqual({ wr: e1, podium: [] });
    });

    it('two entries -> wr + rank 2', () => {
        const [e1, e2] = [entry(1, 100), entry(2, 110)];
        expect(splitCardEntries([e1, e2])).toEqual({ wr: e1, podium: [e2] });
    });

    it('three entries -> wr + ranks 2-3', () => {
        const [e1, e2, e3] = [entry(1, 100), entry(2, 110), entry(3, 120)];
        expect(splitCardEntries([e1, e2, e3])).toEqual({
            wr: e1,
            podium: [e2, e3],
        });
    });
});
