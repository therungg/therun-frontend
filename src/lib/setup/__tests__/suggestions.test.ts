import { describe, expect, it } from 'vitest';
import {
    activityShare,
    roundToCleanTimeMs,
    suggestFeaturedIds,
    suggestMinTimeMs,
} from '../suggestions';

const MIN = 60_000;

describe('roundToCleanTimeMs', () => {
    it('rounds ≥10min down to a whole minute', () => {
        expect(roundToCleanTimeMs(14 * MIN + 32_000)).toBe(14 * MIN);
    });
    it('rounds 1–10min down to 15s', () => {
        expect(roundToCleanTimeMs(4 * MIN + 44_000)).toBe(4 * MIN + 30_000);
    });
    it('rounds <1min down to 5s', () => {
        expect(roundToCleanTimeMs(47_300)).toBe(45_000);
    });
});

describe('suggestMinTimeMs', () => {
    it('suggests ~70% of the fastest verified time, rounded clean', () => {
        // 20:00 WR → 70% = 14:00 → clean = 14:00
        expect(suggestMinTimeMs(20 * MIN, 50)).toBe(14 * MIN);
    });
    it('returns null with fewer than 10 finished runs', () => {
        expect(suggestMinTimeMs(20 * MIN, 9)).toBeNull();
    });
    it('returns null without a fastest time', () => {
        expect(suggestMinTimeMs(null, 50)).toBeNull();
    });
});

describe('activityShare', () => {
    it('returns the percentage of finished runs in active categories', () => {
        expect(
            activityShare([
                { totalFinishedAttemptCount: 96, active: true },
                { totalFinishedAttemptCount: 4, active: false },
            ]),
        ).toBe(96);
    });
    it('returns 0 when there are no finished runs', () => {
        expect(activityShare([])).toBe(0);
    });
});

describe('suggestFeaturedIds', () => {
    const cat = (
        id: number,
        runs: number,
        runners: number,
    ): {
        id: number;
        totalFinishedAttemptCount: number;
        uniqueRunners: number;
    } => ({
        id,
        totalFinishedAttemptCount: runs,
        uniqueRunners: runners,
    });

    it('returns empty for no categories', () => {
        expect(suggestFeaturedIds([]).size).toBe(0);
    });

    it('always includes the most-run category, even below thresholds', () => {
        const picked = suggestFeaturedIds([cat(1, 1, 1), cat(2, 0, 0)]);
        expect(picked.has(1)).toBe(true);
        expect(picked.has(2)).toBe(false);
    });

    it('includes categories holding ≥5% of runs', () => {
        // total = 100; id 2 has exactly 5%
        const picked = suggestFeaturedIds([cat(1, 95, 1), cat(2, 5, 1)]);
        expect(picked.has(2)).toBe(true);
    });

    it('includes low-share categories with ≥3 unique runners', () => {
        const picked = suggestFeaturedIds([
            cat(1, 1000, 5),
            cat(2, 2, 3),
            cat(3, 2, 2),
        ]);
        expect(picked.has(2)).toBe(true);
        expect(picked.has(3)).toBe(false);
    });

    it('caps suggestions at 10', () => {
        const cats = Array.from({ length: 20 }, (_, i) => cat(i + 1, 100, 10));
        expect(suggestFeaturedIds(cats).size).toBe(10);
    });
});
