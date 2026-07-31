import { describe, expect, it } from 'vitest';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import { entryToRosterRow } from './mod-row';

function entry(overrides: Partial<LeaderboardEntry>): LeaderboardEntry {
    return {
        runId: 42,
        rank: 1,
        runnerName: 'alice',
        userId: 5,
        isGuest: false,
        time: 61_000,
        realTime: 61_000,
        gameTime: 59_000,
        runDate: '2026-01-05T00:00:00.000Z',
        vodUrl: 'https://vod.example',
        verificationStatus: 'verified',
        variables: { ngplus: 'yes' },
        ...overrides,
    };
}

describe('entryToRosterRow', () => {
    it('maps a full entry onto the roster-row shape', () => {
        const row = entryToRosterRow(entry({}), 'ngplus=yes');
        expect(row).toEqual({
            runId: 42,
            userId: 5,
            runnerName: 'alice',
            subcategoryKey: 'ngplus=yes',
            time: 61_000,
            gameTime: 59_000,
            verificationStatus: 'verified',
            vodUrl: 'https://vod.example',
            endedAt: '2026-01-05T00:00:00.000Z',
            isLeaderboardEntry: true,
            isLeaderboardEntryGt: true,
        });
    });

    it('maps a guest entry with null userId', () => {
        const row = entryToRosterRow(
            entry({ userId: null, isGuest: true }),
            '',
        );
        expect(row?.userId).toBeNull();
    });

    it('returns null for manual-time entries with no backing run', () => {
        expect(entryToRosterRow(entry({ runId: null }), '')).toBeNull();
        expect(entryToRosterRow(entry({ runId: undefined }), '')).toBeNull();
    });

    it('falls back to entry.time when realTime is absent and empties a null runDate', () => {
        const row = entryToRosterRow(
            entry({ realTime: null, time: 70_000, runDate: null }),
            '',
        );
        expect(row?.time).toBe(70_000);
        expect(row?.endedAt).toBe('');
    });
});
