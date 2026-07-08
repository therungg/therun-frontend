import type { LiveRun } from '~app/(new-layout)/live/live.types';
import type { History } from '~src/common/types';
import { toMs } from './compute';
import type { DossierSplit, PostRun, PostRunSplit } from './dossier.types';

const goldOf = (
    singleMs: number | null,
    priorGoldMs: number | null,
): { isGold: boolean; goldSaveMs: number | null } => {
    if (singleMs === null || priorGoldMs === null)
        return { isGold: false, goldSaveMs: null };
    return singleMs < priorGoldMs
        ? { isGold: true, goldSaveMs: priorGoldMs - singleMs }
        : { isGold: false, goldSaveMs: null };
};

export const postRunFromLive = (
    live: LiveRun,
    dossierSplits: DossierSplit[],
    source: 'capture' | 'live',
): PostRun | null => {
    const finished =
        (live.endedAt || live.currentSplitIndex >= live.splits.length) &&
        !live.hasReset;
    if (!finished) return null;
    const last = live.splits[live.splits.length - 1];
    const finalTimeMs = toMs(last?.splitTime) ?? toMs(live.currentTime);
    if (finalTimeMs === null) return null;

    let prevTotal = 0;
    // True once a split's totalMs comes back null (skipped). The split right
    // after it would otherwise get `totalMs - prevTotal` spanning both the
    // skipped split AND itself — a combined duration we can't attribute to a
    // single segment, so its singleMs must be null too.
    let prevTotalWasNull = false;
    const splits: PostRunSplit[] = live.splits.map((s, index) => {
        const totalMs = toMs(s.splitTime);
        const singleMs =
            totalMs === null || prevTotalWasNull
                ? null
                : Math.max(0, totalMs - prevTotal);
        if (totalMs !== null) prevTotal = totalMs;
        prevTotalWasNull = totalMs === null;
        const priorGoldMs = toMs(s.bestPossible);
        const avg = dossierSplits[index]?.avgSingleMs ?? toMs(s.average);
        return {
            index,
            name: s.name,
            singleMs,
            totalMs,
            ...goldOf(singleMs, priorGoldMs),
            deltaVsAvgMs:
                singleMs !== null && avg !== null ? singleMs - avg : null,
        };
    });

    return {
        source,
        finalTimeMs,
        endedAt: live.endedAt ?? null,
        splits,
        goldCount: splits.filter((s) => s.isGold).length,
        events: (live.events ?? []).map((e) => ({
            type: e.type,
            name: e.name,
            description: e.description,
        })),
    };
};

export const postRunFromHistory = (
    history: History,
    dossierSplits: DossierSplit[],
): PostRun | null => {
    const finished = history.runs.filter((r) => toMs(r.time) !== null);
    const lastRun = finished[finished.length - 1];
    if (!lastRun) return null;
    const finalTimeMs = toMs(lastRun.time);
    if (finalTimeMs === null) return null; // guaranteed by the filter above

    const splits: PostRunSplit[] = lastRun.splits.map((s, index) => {
        const singleMs = toMs(s.splitTime);
        const totalMs = toMs(s.totalTime);
        const meta = dossierSplits[index];
        // Prior gold: the all-time gold, unless THIS value set it — then
        // the best of the remaining completions.
        //
        // `meta.completions` (built from history.splits[i].values) may or
        // may not already include the final run's own split time, depending
        // on when history was last regenerated relative to this run: if it
        // does — and that value is what set goldMs — removing one occurrence
        // recovers the prior gold; which occurrence is irrelevant since
        // equal values are interchangeable (same multiset minimum either
        // way). If it doesn't, the filter is a no-op and goldMs already
        // excludes the final run.
        let priorGoldMs = meta?.goldMs ?? null;
        if (
            singleMs !== null &&
            priorGoldMs !== null &&
            singleMs <= priorGoldMs &&
            meta
        ) {
            const others = meta.completions.filter(
                (v, i, arr) => i !== arr.lastIndexOf(singleMs),
            );
            priorGoldMs = others.length > 0 ? Math.min(...others) : null;
        }
        return {
            index,
            // dossierSplits and lastRun.splits are index-aligned by
            // construction (both derived from the same split list).
            name: meta?.name ?? `Split ${index + 1}`,
            singleMs,
            totalMs,
            ...goldOf(singleMs, priorGoldMs),
            deltaVsAvgMs:
                singleMs !== null && meta?.avgSingleMs != null
                    ? singleMs - meta.avgSingleMs
                    : null,
        };
    });

    return {
        source: 'history',
        finalTimeMs,
        endedAt: lastRun.endedAt ?? null,
        splits,
        goldCount: splits.filter((s) => s.isGold).length,
        events: [],
    };
};
