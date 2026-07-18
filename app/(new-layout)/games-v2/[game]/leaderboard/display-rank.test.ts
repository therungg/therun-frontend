import { describe, expect, it } from 'vitest';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import { computeDisplayRanks } from './display-rank';

function entry(rank: number, realTime: number | null): LeaderboardEntry {
    return {
        rank,
        runnerName: `runner${rank}`,
        userId: null,
        isGuest: false,
        runId: rank,
        time: realTime,
        realTime,
        gameTime: null,
        runDate: null,
        vodUrl: null,
        verificationStatus: 'verified',
        variables: null,
        source: 'run',
        manualTimeId: null,
    };
}

describe('computeDisplayRanks', () => {
    it('no ties: each entry gets its own rank, untied', () => {
        const entries = [entry(1, 1000), entry(2, 2000), entry(3, 3000)];
        const ranks = computeDisplayRanks(entries, 'rt');
        expect(ranks).toEqual([
            { label: '1', tied: false },
            { label: '2', tied: false },
            { label: '3', tied: false },
        ]);
    });

    it('two-way tie: second entry shares the first entry\'s rank with a "=" prefix', () => {
        const entries = [entry(1, 1000), entry(2, 1000), entry(3, 3000)];
        const ranks = computeDisplayRanks(entries, 'rt');
        expect(ranks).toEqual([
            { label: '1', tied: false },
            { label: '=1', tied: true },
            { label: '3', tied: false },
        ]);
    });

    it('three-way tie: all tied entries share the first rank in the group', () => {
        const entries = [
            entry(1, 1000),
            entry(2, 1000),
            entry(3, 1000),
            entry(4, 4000),
        ];
        const ranks = computeDisplayRanks(entries, 'rt');
        expect(ranks).toEqual([
            { label: '1', tied: false },
            { label: '=1', tied: true },
            { label: '=1', tied: true },
            { label: '4', tied: false },
        ]);
    });

    it('two separate tie groups do not bleed into each other', () => {
        const entries = [
            entry(1, 1000),
            entry(2, 1000),
            entry(3, 3000),
            entry(4, 3000),
        ];
        const ranks = computeDisplayRanks(entries, 'rt');
        expect(ranks).toEqual([
            { label: '1', tied: false },
            { label: '=1', tied: true },
            { label: '3', tied: false },
            { label: '=3', tied: true },
        ]);
    });

    it('null primary times are never considered tied, even to each other', () => {
        const entries = [entry(1, null), entry(2, null)];
        const ranks = computeDisplayRanks(entries, 'rt');
        expect(ranks).toEqual([
            { label: '1', tied: false },
            { label: '2', tied: false },
        ]);
    });

    it('reads the secondary timing field when it is the primary timing', () => {
        const rt1000 = { ...entry(1, 1000), gameTime: 500 };
        const rt2000 = { ...entry(2, 2000), gameTime: 500 };
        const ranks = computeDisplayRanks([rt1000, rt2000], 'gt');
        expect(ranks).toEqual([
            { label: '1', tied: false },
            { label: '=1', tied: true },
        ]);
    });
});
