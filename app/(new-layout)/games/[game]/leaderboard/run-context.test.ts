import { describe, expect, it } from 'vitest';
import type { UserEligibleRunRow } from '../../../../../types/moderation.types';
import {
    improvementShare,
    isOutlierImprovement,
    runBoardContext,
} from './run-context';

function row(over: Partial<UserEligibleRunRow>): UserEligibleRunRow {
    return {
        runId: 1,
        categoryId: 10,
        categoryName: 'Any%',
        subcategoryKey: 'pc|solo',
        time: 1000,
        gameTime: null,
        primaryTiming: 'realtime',
        verificationStatus: 'verified',
        vodUrl: null,
        endedAt: '2026-01-01T00:00:00.000Z',
        isLeaderboardEntry: true,
        isLeaderboardEntryGt: false,
        rank: null,
        totalRunners: null,
        ...over,
    } as UserEligibleRunRow;
}

const base = {
    runId: 1,
    categoryDisplay: 'Any%',
    subcategoryKey: 'pc|solo',
    timing: 'rt' as const,
    timeMs: 900,
    runDate: '2026-06-01T00:00:00.000Z',
};

describe('runBoardContext', () => {
    it('returns an empty context while the rows are still loading', () => {
        const ctx = runBoardContext(null, base);
        expect(ctx.rank).toBeNull();
        expect(ctx.previousBestMs).toBeNull();
        expect(ctx.boardCount).toBe(0);
    });

    it('takes rank and total from the inspected run’s own row', () => {
        const ctx = runBoardContext(
            [row({ runId: 1, rank: 3, totalRunners: 44 })],
            base,
        );
        expect(ctx.rank).toBe(3);
        expect(ctx.totalRunners).toBe(44);
    });

    it('takes the previous best from earlier runs on the same board', () => {
        const ctx = runBoardContext(
            [
                row({ runId: 1, rank: 1 }),
                row({ runId: 2, time: 1200, endedAt: '2026-02-01T00:00:00Z' }),
                row({ runId: 3, time: 1000, endedAt: '2026-03-01T00:00:00Z' }),
            ],
            base,
        );
        expect(ctx.previousBestMs).toBe(1000);
        expect(ctx.deltaMs).toBe(-100);
        expect(ctx.previousRunCount).toBe(2);
    });

    it('ignores runs from another category or subcategory', () => {
        const ctx = runBoardContext(
            [
                row({ runId: 2, time: 500, categoryName: '100%' }),
                row({ runId: 3, time: 400, subcategoryKey: 'console|solo' }),
            ],
            base,
        );
        expect(ctx.previousBestMs).toBeNull();
        expect(ctx.deltaMs).toBeNull();
        expect(ctx.previousRunCount).toBe(0);
    });

    it('ignores runs that ended after the inspected run', () => {
        const ctx = runBoardContext(
            [row({ runId: 2, time: 800, endedAt: '2026-09-01T00:00:00Z' })],
            base,
        );
        expect(ctx.previousBestMs).toBeNull();
    });

    it('compares against every other run when the date is unknown', () => {
        const ctx = runBoardContext(
            [row({ runId: 2, time: 800, endedAt: '2026-09-01T00:00:00Z' })],
            { ...base, runDate: null },
        );
        expect(ctx.previousBestMs).toBe(800);
        expect(ctx.deltaMs).toBe(100);
    });

    it('reads a game-time board off gameTime, falling back to real time', () => {
        const ctx = runBoardContext(
            [
                row({
                    runId: 2,
                    time: 1200,
                    gameTime: 1100,
                    endedAt: '2026-02-01T00:00:00Z',
                }),
                row({
                    runId: 3,
                    time: 1150,
                    gameTime: null,
                    endedAt: '2026-02-02T00:00:00Z',
                }),
            ],
            { ...base, timing: 'gt' },
        );
        expect(ctx.previousBestMs).toBe(1100);
    });

    it('counts board slots across every category', () => {
        const ctx = runBoardContext(
            [
                row({ runId: 1, isLeaderboardEntry: true }),
                row({
                    runId: 2,
                    categoryName: '100%',
                    isLeaderboardEntry: false,
                    isLeaderboardEntryGt: true,
                }),
                row({
                    runId: 3,
                    categoryName: 'Low%',
                    isLeaderboardEntry: false,
                    isLeaderboardEntryGt: false,
                }),
            ],
            base,
        );
        expect(ctx.boardCount).toBe(2);
    });
});

describe('improvementShare', () => {
    it('is null for a slower run — only improvements need explaining', () => {
        const ctx = runBoardContext(
            [row({ runId: 2, time: 800, endedAt: '2026-02-01T00:00:00Z' })],
            base,
        );
        expect(improvementShare(ctx)).toBeNull();
        expect(isOutlierImprovement(ctx)).toBe(false);
    });

    it('flags an improvement well past the runner’s own history', () => {
        const ctx = runBoardContext(
            [row({ runId: 2, time: 2000, endedAt: '2026-02-01T00:00:00Z' })],
            base,
        );
        expect(improvementShare(ctx)).toBeCloseTo(0.55);
        expect(isOutlierImprovement(ctx)).toBe(true);
    });

    it('leaves an ordinary PB alone', () => {
        const ctx = runBoardContext(
            [row({ runId: 2, time: 950, endedAt: '2026-02-01T00:00:00Z' })],
            base,
        );
        expect(isOutlierImprovement(ctx)).toBe(false);
    });
});
