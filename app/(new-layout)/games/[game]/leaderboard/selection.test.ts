import { describe, expect, it } from 'vitest';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import { entrySelectionKey } from './selection';

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

    it('returns null for rows without a run', () => {
        expect(entrySelectionKey(entry({}))).toBeNull();
    });
});
