import { describe, expect, test } from 'vitest';
import type { History } from '~src/common/types';
import { buildFinishedRuns, buildSplits, toMs } from '../compute';

const splitTimes = (over: Partial<Record<string, string>> = {}) => ({
    time: '60000',
    bestPossibleTime: '50000',
    bestAchievedTime: '55000',
    averageTime: '62000',
    stdDev: '3000',
    alternative: [],
    ...over,
});

export const historyFixture: History = {
    sessions: [],
    runs: [
        {
            splits: [],
            time: '3600000',
            duration: '3700000',
            startedAt: '2026-05-01T18:00:00Z',
            endedAt: '2026-05-01T19:00:00Z',
        },
        {
            splits: [],
            time: '', // reset — not finished
            duration: '600000',
            startedAt: '2026-05-02T18:00:00Z',
            endedAt: '2026-05-02T18:10:00Z',
        },
        {
            splits: [],
            time: '3500000',
            duration: '3600000',
            startedAt: '2026-05-03T18:00:00Z',
            endedAt: '2026-05-03T19:00:00Z',
        },
    ],
    splits: [
        {
            name: 'Forest',
            icon: '',
            single: splitTimes(),
            total: splitTimes(),
            values: [60000, 61000, 62000, 55000], // reached 4x
            valuesTotal: [60000, 61000, 62000, 55000],
        },
        {
            name: 'Water Temple',
            icon: '',
            single: splitTimes({ bestAchievedTime: '110000' }),
            total: splitTimes({ averageTime: '180000' }),
            values: [115000], // reached once → 3 deaths here
            valuesTotal: [175000],
        },
    ],
};

describe('toMs', () => {
    test('parses ms strings', () => expect(toMs('3600000')).toBe(3600000));
    test('passes numbers through', () => expect(toMs(1500)).toBe(1500));
    test('empty/undefined/garbage → null', () => {
        expect(toMs('')).toBeNull();
        expect(toMs(undefined)).toBeNull();
        expect(toMs('abc')).toBeNull();
        expect(toMs('0')).toBeNull(); // 0 means "no time" in this data
    });
});

describe('buildFinishedRuns', () => {
    test('keeps only runs with a time, in order', () => {
        const runs = buildFinishedRuns(historyFixture);
        expect(runs).toHaveLength(2);
        expect(runs[0].timeMs).toBe(3600000);
        expect(runs[1].endedAt).toBe('2026-05-03T19:00:00Z');
    });
});

describe('buildSplits', () => {
    test('maps stats and computes deaths/resetShare', () => {
        const splits = buildSplits(historyFixture);
        expect(splits).toHaveLength(2);
        const [forest, water] = splits;
        expect(forest.goldMs).toBe(55000);
        expect(forest.avgSingleMs).toBe(62000);
        expect(forest.attemptsReached).toBe(4);
        // 4 reached Forest, 1 reached Water Temple → 3 died on Water Temple
        expect(water.deaths).toBe(3);
        expect(water.resetShare).toBe(1); // all deaths happen there
        expect(forest.deaths).toBe(0);
        expect(water.avgTotalMs).toBe(180000);
    });
});
