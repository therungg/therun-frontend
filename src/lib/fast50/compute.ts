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
