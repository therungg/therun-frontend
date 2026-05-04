import { LiveRun } from '~app/(new-layout)/live/live.types';

export type SnapshotKind = 'past' | 'live' | 'upcoming' | 'finished';

export interface SnapshotData {
    kind: SnapshotKind;
    splitName: string;
    splitIndexLabel: string;
    timeMs: number | null;
    deltaMs: number | null;
    p50Ms: number | null;
    resetRate: number | null;
}

const resetRateAt = (liveRun: LiveRun, index: number): number | null => {
    const split = liveRun.splits?.[index];
    if (!split) return null;
    const started = split.attemptsStarted ?? 0;
    const finished = split.attemptsFinished ?? 0;
    if (started <= 0) return null;
    return Math.max(0, Math.min(1, 1 - finished / started));
};

const deltaAtPast = (liveRun: LiveRun, index: number): number | null => {
    const s = liveRun.splits?.[index];
    if (!s || s.splitTime == null || s.pbSplitTime == null) return null;
    return s.splitTime - s.pbSplitTime;
};

export const deriveSnapshot = (
    liveRun: LiveRun,
    selectedIndex: number,
): SnapshotData => {
    const total = liveRun.splits?.length ?? 0;
    const current = liveRun.currentSplitIndex;
    const p50Ms = liveRun.monteCarloPrediction?.percentiles?.p50 ?? null;

    if (total === 0 || selectedIndex >= total) {
        return {
            kind: 'finished',
            splitName: 'Finish',
            splitIndexLabel: `${total}/${total}`,
            timeMs: null,
            deltaMs: null,
            p50Ms,
            resetRate: null,
        };
    }

    const split = liveRun.splits[selectedIndex];
    const splitName = split?.name ?? '—';
    const splitIndexLabel = `${selectedIndex + 1}/${total}`;
    const resetRate = resetRateAt(liveRun, selectedIndex);

    if (selectedIndex < current) {
        return {
            kind: 'past',
            splitName,
            splitIndexLabel,
            timeMs: split.splitTime ?? null,
            deltaMs: deltaAtPast(liveRun, selectedIndex),
            p50Ms,
            resetRate,
        };
    }

    if (selectedIndex === current) {
        return {
            kind: 'live',
            splitName,
            splitIndexLabel,
            timeMs: liveRun.currentTime ?? null,
            deltaMs: liveRun.delta ?? null,
            p50Ms,
            resetRate,
        };
    }

    return {
        kind: 'upcoming',
        splitName,
        splitIndexLabel,
        timeMs: split.predictedTotalTime ?? null,
        deltaMs:
            split.predictedTotalTime != null && split.pbSplitTime != null
                ? split.predictedTotalTime - split.pbSplitTime
                : null,
        p50Ms,
        resetRate,
    };
};
