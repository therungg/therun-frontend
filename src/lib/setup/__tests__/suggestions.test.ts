import { describe, expect, it } from 'vitest';
import {
    activityShare,
    roundToCleanTimeMs,
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
