import { describe, expect, it } from 'vitest';
import {
    formatDeltaSeconds,
    formatHeldDuration,
    toWrHistoryRows,
} from './wr-history-model';

const NOW = new Date('2026-07-18T12:00:00Z');

describe('toWrHistoryRows', () => {
    it('empty history -> empty rows', () => {
        expect(toWrHistoryRows([], NOW)).toEqual([]);
    });

    it('single entry: current, no delta (first-ever record), held since setAt to now', () => {
        const rows = toWrHistoryRows(
            [
                {
                    runnerName: 'Alice',
                    time: 60_000,
                    timingMethod: 'rt',
                    setAt: '2026-07-01T00:00:00Z',
                    supersededAt: null,
                },
            ],
            NOW,
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].isCurrent).toBe(true);
        expect(rows[0].deltaMs).toBeNull();
        // 17 days held, up to NOW
        expect(rows[0].heldMs).toBe(
            NOW.getTime() - new Date('2026-07-01T00:00:00Z').getTime(),
        );
    });

    it('two entries: superseded record has a delta vs nothing, current has delta vs superseded', () => {
        const rows = toWrHistoryRows(
            [
                {
                    runnerName: 'Alice',
                    time: 60_000,
                    timingMethod: 'rt',
                    setAt: '2026-07-01T00:00:00Z',
                    supersededAt: '2026-07-10T00:00:00Z',
                },
                {
                    runnerName: 'Bob',
                    time: 55_000,
                    timingMethod: 'rt',
                    setAt: '2026-07-10T00:00:00Z',
                    supersededAt: null,
                },
            ],
            NOW,
        );
        // Newest-first, current pinned first.
        expect(rows.map((r) => r.runnerName)).toEqual(['Bob', 'Alice']);

        const bob = rows[0];
        expect(bob.isCurrent).toBe(true);
        expect(bob.deltaMs).toBe(-5_000); // 55s - 60s = -5s, an improvement
        expect(bob.heldMs).toBe(
            NOW.getTime() - new Date('2026-07-10T00:00:00Z').getTime(),
        );

        const alice = rows[1];
        expect(alice.isCurrent).toBe(false);
        expect(alice.deltaMs).toBeNull(); // first-ever record
        expect(alice.heldMs).toBe(9 * 24 * 60 * 60 * 1000); // held 9 days
    });

    it('three entries, given out of chronological order: sorts internally before computing deltas', () => {
        const rows = toWrHistoryRows(
            [
                {
                    runnerName: 'Carol',
                    time: 50_000,
                    timingMethod: 'rt',
                    setAt: '2026-07-15T00:00:00Z',
                    supersededAt: null,
                },
                {
                    runnerName: 'Alice',
                    time: 60_000,
                    timingMethod: 'rt',
                    setAt: '2026-07-01T00:00:00Z',
                    supersededAt: '2026-07-10T00:00:00Z',
                },
                {
                    runnerName: 'Bob',
                    time: 55_000,
                    timingMethod: 'rt',
                    setAt: '2026-07-10T00:00:00Z',
                    supersededAt: '2026-07-15T00:00:00Z',
                },
            ],
            NOW,
        );
        expect(rows.map((r) => r.runnerName)).toEqual([
            'Carol',
            'Bob',
            'Alice',
        ]);
        expect(rows[0].deltaMs).toBe(-5_000); // Carol vs Bob
        expect(rows[1].deltaMs).toBe(-5_000); // Bob vs Alice
        expect(rows[2].deltaMs).toBeNull(); // Alice, first-ever
    });

    it('missing supersededAt is treated as null (still current)', () => {
        const rows = toWrHistoryRows(
            [
                {
                    runnerName: 'Alice',
                    time: 60_000,
                    timingMethod: 'rt',
                    setAt: '2026-07-01T00:00:00Z',
                },
            ],
            NOW,
        );
        expect(rows[0].isCurrent).toBe(true);
        expect(rows[0].supersededAt).toBeNull();
    });

    it('a record that regressed (slower than the one before) still gets a positive delta, no sign-flip special-casing', () => {
        const rows = toWrHistoryRows(
            [
                {
                    runnerName: 'Alice',
                    time: 50_000,
                    timingMethod: 'rt',
                    setAt: '2026-07-01T00:00:00Z',
                    supersededAt: '2026-07-05T00:00:00Z',
                },
                {
                    runnerName: 'Bob',
                    time: 55_000,
                    timingMethod: 'rt',
                    setAt: '2026-07-05T00:00:00Z',
                    supersededAt: null,
                },
            ],
            NOW,
        );
        const bob = rows.find((r) => r.runnerName === 'Bob');
        expect(bob?.deltaMs).toBe(5_000);
    });

    it('assigns a stable unique key per row', () => {
        const rows = toWrHistoryRows(
            [
                {
                    runnerName: 'Alice',
                    time: 60_000,
                    timingMethod: 'rt',
                    setAt: '2026-07-01T00:00:00Z',
                    supersededAt: null,
                },
            ],
            NOW,
        );
        expect(rows[0].key).toBe('Alice-2026-07-01T00:00:00Z');
    });
});

describe('formatDeltaSeconds', () => {
    it('null delta (first-ever record) renders an em dash', () => {
        expect(formatDeltaSeconds(null)).toBe('—');
    });

    it('sub-minute improvement: one decimal, minus sign, seconds unit', () => {
        expect(formatDeltaSeconds(-3_200)).toBe('−3.2s');
    });

    it('sub-minute regression: plus sign', () => {
        expect(formatDeltaSeconds(5_000)).toBe('+5.0s');
    });

    it('zero delta renders as 0.0s with no sign', () => {
        expect(formatDeltaSeconds(0)).toBe('0.0s');
    });

    it('minute-plus improvement: minutes + seconds, no decimal', () => {
        expect(formatDeltaSeconds(-125_000)).toBe('−2m 5s');
    });

    it('exact minute improvement omits a 0s remainder', () => {
        expect(formatDeltaSeconds(-60_000)).toBe('−1m');
    });
});

describe('formatHeldDuration', () => {
    it('sub-hour spans render as minutes', () => {
        expect(formatHeldDuration(30 * 60_000)).toBe('30 minutes');
    });

    it('a zero-length hold still reads as at least "1 minute"', () => {
        expect(formatHeldDuration(0)).toBe('1 minute');
    });

    it('sub-day spans render as hours', () => {
        expect(formatHeldDuration(9 * 3_600_000)).toBe('9 hours');
    });

    it('singular hour has no trailing s', () => {
        expect(formatHeldDuration(3_600_000)).toBe('1 hour');
    });

    it('sub-month spans render as days', () => {
        expect(formatHeldDuration(3 * 86_400_000)).toBe('3 days');
    });

    it('sub-year spans render as months', () => {
        expect(formatHeldDuration(45 * 86_400_000)).toBe('2 months');
    });

    it('year-plus spans render as years', () => {
        expect(formatHeldDuration(400 * 86_400_000)).toBe('1 year');
    });
});
