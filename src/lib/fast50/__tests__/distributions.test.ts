import { describe, expect, test } from 'vitest';
import {
    communityPercentile,
    dangerSplit,
    forecastBands,
    quantile,
    roadmap,
    runPercentile,
    runRank,
} from '../compute';
import type { DossierFinishedRun, DossierSplit } from '../dossier.types';

const runsOf = (times: number[]): DossierFinishedRun[] =>
    times.map((timeMs, i) => ({
        timeMs,
        endedAt: `2026-05-${String(i + 1).padStart(2, '0')}T12:00:00Z`,
    }));

const split = (over: Partial<DossierSplit>): DossierSplit => ({
    index: 0,
    name: 's',
    avgSingleMs: 60000,
    avgTotalMs: 60000,
    goldMs: 50000,
    pbSingleMs: 55000,
    pbTotalMs: 55000,
    stdDevMs: 3000,
    attemptsReached: 100,
    deaths: 0,
    resetShare: 0,
    completions: [60000],
    ...over,
});

describe('quantile', () => {
    test('interpolates', () => {
        expect(quantile([10, 20, 30, 40, 50], 0.5)).toBe(30);
        expect(quantile([10, 20], 0.5)).toBe(15);
        expect(quantile([], 0.5)).toBeNull();
    });
});

describe('forecastBands', () => {
    test('null under 5 finished runs', () => {
        expect(forecastBands(runsOf([1, 2, 3, 4]))).toBeNull();
    });
    test('bands from recent runs, p10 <= p50 <= p90', () => {
        const bands = forecastBands(
            runsOf([100, 90, 95, 80, 85, 92, 88, 99, 84, 91]),
        );
        expect(bands).not.toBeNull();
        expect(bands!.p10Ms).toBeLessThanOrEqual(bands!.p50Ms);
        expect(bands!.p50Ms).toBeLessThanOrEqual(bands!.p90Ms);
        expect(bands!.sample).toBe(10);
    });
    test('only considers the most recent N', () => {
        const times = [...Array(30).fill(200), ...Array(20).fill(100)];
        const bands = forecastBands(runsOf(times), 20);
        expect(bands!.p90Ms).toBe(100); // old slow runs ignored
    });
    test('minRuns param raises the gate above the default', () => {
        const runs = runsOf([1, 2, 3, 4, 5, 6]);
        expect(forecastBands(runs, 20)).not.toBeNull();
        expect(forecastBands(runs, 20, 7)).toBeNull();
    });
});

describe('runPercentile / runRank', () => {
    const runs = runsOf([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]);
    test('needs 10+ runs', () => {
        expect(runPercentile(runsOf([1, 2, 3]), 2)).toBeNull();
    });
    test('percent slower', () => {
        expect(runPercentile(runs, 250)).toBe(80); // 8 of 10 slower
    });
    test('rank is 1-based', () => {
        expect(runRank(runs, 50)).toBe(1);
        expect(runRank(runs, 250)).toBe(3);
    });
});

describe('roadmap', () => {
    test('cumulative clock, skips unknown', () => {
        const road = roadmap([
            split({ index: 0, name: 'A', avgTotalMs: 600000 }),
            split({ index: 1, name: 'B', avgTotalMs: null }),
            split({ index: 2, name: 'C', avgTotalMs: 1800000 }),
        ]);
        expect(road).toEqual([
            { index: 0, name: 'A', atMs: 600000 },
            { index: 2, name: 'C', atMs: 1800000 },
        ]);
    });
});

describe('dangerSplit', () => {
    test('picks max resetShare above thresholds', () => {
        const splits = [
            split({ index: 0, name: 'A', deaths: 2, resetShare: 0.05 }),
            split({
                index: 1,
                name: 'Water Temple',
                deaths: 40,
                resetShare: 0.41,
            }),
            split({ index: 2, name: 'C', deaths: 10, resetShare: 0.2 }),
        ];
        const danger = dangerSplit(splits);
        expect(danger!.split.name).toBe('Water Temple');
        expect(danger!.afterName).toBe('A');
        expect(danger!.startsAtMs).toBe(60000);
    });
    test('null when deaths spread thin', () => {
        expect(
            dangerSplit([
                split({ deaths: 3, resetShare: 0.1 }),
                split({ index: 1, deaths: 4, resetShare: 0.14 }),
            ]),
        ).toBeNull();
    });
    test('looks up previous split by index property, not array position', () => {
        const splits = [
            split({ index: 0, name: 'A', avgTotalMs: 60000 }),
            split({ index: 2, name: 'B', avgTotalMs: 120000 }),
            split({
                index: 3,
                name: 'Danger',
                deaths: 40,
                resetShare: 0.41,
            }),
        ];
        const danger = dangerSplit(splits);
        expect(danger!.split.name).toBe('Danger');
        expect(danger!.afterName).toBe('B');
        expect(danger!.startsAtMs).toBe(120000);
    });
    test('opts.minDeaths raises the gate above the default', () => {
        const splits = [
            split({ index: 0, name: 'A', deaths: 40, resetShare: 0.41 }),
        ];
        expect(dangerSplit(splits)).not.toBeNull();
        expect(dangerSplit(splits, { minDeaths: 50 })).toBeNull();
    });
});

describe('communityPercentile', () => {
    const ladder = {
        p1: 100,
        p5: 110,
        p10: 120,
        p25: 140,
        p50: 170,
        p75: 200,
        p90: 240,
        p95: 260,
        p99: 300,
    };
    test('maps to smallest bucket at or above user time', () => {
        expect(communityPercentile(105, ladder)).toBe(5);
        expect(communityPercentile(170, ladder)).toBe(50);
        expect(communityPercentile(9999, ladder)).toBe(100);
        expect(communityPercentile(50, ladder)).toBe(1);
    });
});
