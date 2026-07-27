import { describe, expect, it } from 'vitest';
import type { QuickStats } from '../../../../types/leaderboards.types';
import { boardPulse, formatPlaytime } from '../board-pulse';

const HOUR = 60 * 60 * 1000;

function stats(over: Partial<QuickStats> = {}): QuickStats {
    return {
        totalRunTime: 0,
        totalAttemptCount: 0,
        totalFinishedAttemptCount: 0,
        uniqueRunners: 0,
        ...over,
    };
}

describe('formatPlaytime', () => {
    it('compacts the hundreds of thousands of hours a big board carries', () => {
        // SM64's real total run time, in ms.
        expect(formatPlaytime(1_936_410_952_000)).toBe('538K');
    });

    it('leaves small hour counts readable', () => {
        expect(formatPlaytime(312 * HOUR)).toBe('312');
    });

    it('rounds to whole hours', () => {
        expect(formatPlaytime(9.6 * HOUR)).toBe('10');
    });

    it('says "<1" rather than rounding a fresh board down to 0', () => {
        expect(formatPlaytime(20 * 60 * 1000)).toBe('<1');
    });

    it('returns null when there is no time to report', () => {
        expect(formatPlaytime(0)).toBeNull();
        expect(formatPlaytime(-1)).toBeNull();
        expect(formatPlaytime(Number.NaN)).toBeNull();
    });
});

describe('boardPulse', () => {
    it('reports runners, finished runs, and playtime', () => {
        expect(
            boardPulse(
                stats({
                    uniqueRunners: 1443,
                    totalFinishedAttemptCount: 198121,
                    totalRunTime: 1_936_410_952_000,
                }),
            ),
        ).toEqual([
            { value: '1,443', label: 'runners' },
            { value: '198,121', label: 'finished runs' },
            { value: '538K', label: 'hours played' },
        ]);
    });

    it('counts finished runs, not raw attempts', () => {
        const [, runs] = boardPulse(
            stats({
                uniqueRunners: 5,
                totalFinishedAttemptCount: 12,
                totalAttemptCount: 9001,
            }),
        );
        expect(runs).toEqual({ value: '12', label: 'finished runs' });
    });

    it('singularizes a board with one runner and one run', () => {
        expect(
            boardPulse(
                stats({ uniqueRunners: 1, totalFinishedAttemptCount: 1 }),
            ).map((s) => s.label),
        ).toEqual(['runner', 'finished run']);
    });

    it('says "hour played" under the first hour', () => {
        const pulse = boardPulse(
            stats({
                uniqueRunners: 2,
                totalFinishedAttemptCount: 3,
                totalRunTime: 5 * 60 * 1000,
            }),
        );
        expect(pulse.at(-1)).toEqual({ value: '<1', label: 'hour played' });
    });

    it('drops playtime when no run time was recorded', () => {
        expect(
            boardPulse(
                stats({ uniqueRunners: 4, totalFinishedAttemptCount: 7 }),
            ).map((s) => s.label),
        ).toEqual(['runners', 'finished runs']);
    });

    it('shows nothing on a board with no runners and no runs', () => {
        expect(boardPulse(stats())).toEqual([]);
    });

    it('still reports a board that has runs but no identified runners', () => {
        expect(
            boardPulse(stats({ totalFinishedAttemptCount: 3 })),
        ).not.toHaveLength(0);
    });
});
