import { describe, expect, it } from 'vitest';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import { entrySelectionKey, splitSelectionKeys } from './selection';

function entry(overrides: Partial<LeaderboardEntry>): LeaderboardEntry {
    return {
        runId: null,
        rank: 1,
        runnerName: 'alice',
        userId: 5,
        isGuest: false,
        time: 61_000,
        realTime: 61_000,
        gameTime: null,
        runDate: null,
        verificationStatus: 'verified',
        ...overrides,
    };
}

describe('entrySelectionKey', () => {
    it('keys run rows by runId', () => {
        expect(entrySelectionKey(entry({ runId: 42 }))).toBe('r:42');
    });

    it('keys manual rows by manualTimeId', () => {
        expect(
            entrySelectionKey(entry({ source: 'manual', manualTimeId: 7 })),
        ).toBe('m:7');
    });

    it('prefers the run when both ids exist', () => {
        expect(entrySelectionKey(entry({ runId: 42, manualTimeId: 7 }))).toBe(
            'r:42',
        );
    });

    it('returns null for rows with neither id', () => {
        expect(entrySelectionKey(entry({}))).toBeNull();
        // A manualTimeId without source: 'manual' is not selectable either.
        expect(entrySelectionKey(entry({ manualTimeId: 7 }))).toBeNull();
    });
});

describe('splitSelectionKeys', () => {
    it('splits mixed selections back into id spaces', () => {
        expect(splitSelectionKeys(['r:1', 'm:2', 'r:30', 'm:44'])).toEqual({
            runIds: [1, 30],
            manualTimeIds: [2, 44],
        });
    });

    it('handles empty input', () => {
        expect(splitSelectionKeys([])).toEqual({
            runIds: [],
            manualTimeIds: [],
        });
    });
});
