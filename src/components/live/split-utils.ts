import { useEffect, useRef, useState } from 'react';
import { LiveRun } from '~app/(new-layout)/live/live.types';

export type SplitStatus =
    | 'pending'
    | 'neutral'
    | 'gold'
    | 'ahead'
    | 'ahead-muted'
    | 'behind'
    | 'behind-muted';

export const getSplitSegments = (run: LiveRun): SplitStatus[] =>
    run.splits.map((split, i) => {
        if (i >= run.currentSplitIndex) return 'pending';
        const time = split.splitTime;
        if (!time) return 'neutral';

        const prevTime = i > 0 ? run.splits[i - 1].splitTime : 0;
        if (i > 0 && !prevTime) return 'neutral';
        const segmentTime = time - (prevTime ?? 0);

        // Gold: segment time beats best segment ever
        const bestSegCumulative = split.comparisons?.['Best Segments'];
        const prevBestSegCumulative =
            i > 0 ? run.splits[i - 1].comparisons?.['Best Segments'] : 0;
        const bestSegSingle =
            bestSegCumulative && (i === 0 || prevBestSegCumulative)
                ? bestSegCumulative - (prevBestSegCumulative ?? 0)
                : null;

        if (bestSegSingle && segmentTime < bestSegSingle) return 'gold';

        // Cumulative: ahead or behind PB overall?
        const pbCumulative = split.comparisons?.['Personal Best'];
        if (!pbCumulative) return 'neutral';
        const aheadOverall = time < pbCumulative;

        // Segment: gained or lost time vs PB segment? Bright = gained, muted = lost
        const prevPbCumulative =
            i > 0 ? run.splits[i - 1].comparisons?.['Personal Best'] : 0;
        const pbSegSingle =
            pbCumulative && (i === 0 || prevPbCumulative)
                ? pbCumulative - (prevPbCumulative ?? 0)
                : null;
        const gainedTime = pbSegSingle ? segmentTime < pbSegSingle : null;

        if (aheadOverall) {
            return gainedTime ? 'ahead' : 'ahead-muted';
        }
        return gainedTime ? 'behind' : 'behind-muted';
    });

export type CardFlash = 'gold' | 'ahead' | 'behind' | null;

export const useSplitFlash = (run: LiveRun): CardFlash => {
    const [flash, setFlash] = useState<CardFlash>(null);
    const prevSplitIndexRef = useRef(run.currentSplitIndex);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        if (run.currentSplitIndex > prevSplitIndexRef.current) {
            const segments = getSplitSegments(run);
            const lastCompleted = run.currentSplitIndex - 1;
            const status = segments[lastCompleted];
            const highlight: CardFlash =
                status === 'gold'
                    ? 'gold'
                    : status === 'ahead' || status === 'ahead-muted'
                      ? 'ahead'
                      : status === 'behind' || status === 'behind-muted'
                        ? 'behind'
                        : null;

            setFlash(highlight);
            clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => setFlash(null), 3000);
        }
        prevSplitIndexRef.current = run.currentSplitIndex;
    });

    useEffect(() => {
        return () => clearTimeout(timeoutRef.current);
    }, []);

    return flash;
};
