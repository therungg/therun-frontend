import type { History } from '~src/common/types';
import type { DossierFinishedRun, DossierSplit } from './dossier.types';

export const toMs = (v: string | number | null | undefined): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
};

export const buildFinishedRuns = (history: History): DossierFinishedRun[] =>
    history.runs.flatMap((run) => {
        const timeMs = toMs(run.time);
        if (timeMs === null) return [];
        return [{ timeMs, endedAt: run.endedAt }];
    });

export const buildSplits = (history: History): DossierSplit[] => {
    const reached = history.splits.map((s) => s.values.length);
    // Deaths on split i: attempts that completed split i-1 but not split i.
    // The first split's entry count is unknown from history alone, so
    // deaths[0] = 0 (first-split resets are not attributed).
    const deaths = reached.map((r, i) =>
        i === 0 ? 0 : Math.max(0, reached[i - 1] - r),
    );
    const totalDeaths = deaths.reduce((a, b) => a + b, 0);

    return history.splits.map((s, i) => ({
        index: i,
        name: s.name,
        avgSingleMs: toMs(s.single.averageTime),
        avgTotalMs: toMs(s.total.averageTime),
        goldMs: toMs(s.single.bestAchievedTime),
        pbSingleMs: toMs(s.single.time),
        pbTotalMs: toMs(s.total.time),
        stdDevMs: toMs(s.single.stdDev),
        attemptsReached: reached[i],
        deaths: deaths[i],
        resetShare: totalDeaths === 0 ? 0 : deaths[i] / totalDeaths,
        completions: s.values.filter((v) => v > 0),
    }));
};

export const quantile = (sortedAsc: number[], q: number): number | null => {
    if (sortedAsc.length === 0) return null;
    const pos = (sortedAsc.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    if (lo === hi) return sortedAsc[lo];
    return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (pos - lo);
};

export const forecastBands = (
    runs: DossierFinishedRun[],
    recent = 20,
): { p10Ms: number; p50Ms: number; p90Ms: number; sample: number } | null => {
    const sample = runs.slice(-recent).map((r) => r.timeMs);
    if (sample.length < 5) return null;
    const sorted = [...sample].sort((a, b) => a - b);
    return {
        p10Ms: quantile(sorted, 0.1) as number,
        p50Ms: quantile(sorted, 0.5) as number,
        p90Ms: quantile(sorted, 0.9) as number,
        sample: sample.length,
    };
};

export const runPercentile = (
    runs: DossierFinishedRun[],
    timeMs: number,
): number | null => {
    if (runs.length < 10) return null;
    const slower = runs.filter((r) => r.timeMs > timeMs).length;
    return Math.round((slower / runs.length) * 100);
};

export const runRank = (runs: DossierFinishedRun[], timeMs: number): number =>
    runs.filter((r) => r.timeMs < timeMs).length + 1;

export const roadmap = (
    splits: DossierSplit[],
): { index: number; name: string; atMs: number }[] =>
    splits.flatMap((s) =>
        s.avgTotalMs === null
            ? []
            : [{ index: s.index, name: s.name, atMs: s.avgTotalMs }],
    );

export const dangerSplit = (
    splits: DossierSplit[],
): {
    split: DossierSplit;
    startsAtMs: number | null;
    afterName: string | null;
} | null => {
    const candidates = splits.filter(
        (s) => s.resetShare >= 0.15 && s.deaths >= 5,
    );
    if (candidates.length === 0) return null;
    const worst = candidates.reduce((a, b) =>
        b.resetShare > a.resetShare ? b : a,
    );
    const prev = worst.index > 0 ? splits[worst.index - 1] : null;
    return {
        split: worst,
        startsAtMs: prev?.avgTotalMs ?? null,
        afterName: prev?.name ?? null,
    };
};

const LADDER_KEYS = [
    ['p1', 1],
    ['p5', 5],
    ['p10', 10],
    ['p25', 25],
    ['p50', 50],
    ['p75', 75],
    ['p90', 90],
    ['p95', 95],
    ['p99', 99],
] as const;

export type PercentileLadder = Record<(typeof LADDER_KEYS)[number][0], number>;

export const communityPercentile = (
    userAvgMs: number,
    ladder: PercentileLadder,
): number => {
    for (const [key, pct] of LADDER_KEYS) {
        if (userAvgMs <= ladder[key]) return pct;
    }
    return 100;
};
