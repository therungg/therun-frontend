'use client';

import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import { useLiveElapsedMs } from '~app/(new-layout)/live/use-live-elapsed-ms';
import styles from './commentary-drawer.module.scss';
import { formatTimeMs } from './format';

export const SplitSelector = ({
    liveRun,
    selectedIndex,
    currentSplitIndex,
    onChange,
}: {
    liveRun: LiveRun;
    selectedIndex: number;
    currentSplitIndex: number;
    followLive: boolean;
    onChange: (index: number) => void;
    onJumpToLive: () => void;
}) => {
    const total = liveRun.splits?.length ?? 0;
    const lastIndex = Math.max(0, total - 1);
    const split = liveRun.splits?.[selectedIndex];
    const title =
        selectedIndex >= total
            ? 'Run finished'
            : split?.name
              ? `Split ${selectedIndex + 1} — ${split.name}`
              : `Split ${selectedIndex + 1}`;

    const canPrev = selectedIndex > 0;
    const canNext = selectedIndex < lastIndex;

    const isFinished =
        total > 0 && currentSplitIndex >= total && !liveRun.hasReset;

    // When the run is finished, "Go to current split" jumps to the last split.
    const goToTargetIdx = isFinished ? total - 1 : currentSplitIndex;
    const showGoToCurrent =
        total > 0 &&
        goToTargetIdx >= 0 &&
        goToTargetIdx < total &&
        selectedIndex !== goToTargetIdx;

    const liveCumulative = useLiveElapsedMs(liveRun);

    // What the timers show depends on which split is selected:
    //   - selected === live → tick from useLiveElapsedMs.
    //   - selected past split → that split's achieved cumulative + segment.
    //   - selected upcoming split → dashes (nothing achieved).
    //   - finished run → the last split's final values.
    const segmentAchievedAt = (idx: number): number | null => {
        const s = liveRun.splits[idx];
        if (s?.splitTime == null) return null;
        if (idx === 0) return s.splitTime;
        const prev = liveRun.splits[idx - 1]?.splitTime;
        if (prev == null) return null;
        return Math.max(0, s.splitTime - prev);
    };

    const onLiveSplit =
        !isFinished && selectedIndex === currentSplitIndex && !liveRun.hasReset;

    let displayCumulative: number | null = null;
    let displaySegment: number | null = null;

    if (isFinished) {
        const lastIdx = total - 1;
        displayCumulative = liveRun.splits[lastIdx]?.splitTime ?? null;
        displaySegment = segmentAchievedAt(lastIdx);
    } else if (onLiveSplit) {
        displayCumulative = liveCumulative;
        if (liveCumulative != null) {
            const prev =
                currentSplitIndex === 0
                    ? 0
                    : (liveRun.splits[currentSplitIndex - 1]?.splitTime ??
                      null);
            displaySegment =
                prev != null ? Math.max(0, liveCumulative - prev) : null;
        }
    } else if (selectedIndex < currentSplitIndex && selectedIndex < total) {
        // Past split.
        displayCumulative = liveRun.splits[selectedIndex]?.splitTime ?? null;
        displaySegment = segmentAchievedAt(selectedIndex);
    } else {
        // Upcoming split — nothing achieved yet.
        displayCumulative = null;
        displaySegment = null;
    }

    const showTimers =
        !liveRun.hasReset && (currentSplitIndex < total || isFinished);

    return (
        <div className={styles.selectorWrap}>
            <div className={styles.selector}>
                <button
                    type="button"
                    className={styles.selectorButton}
                    disabled={!canPrev}
                    onClick={() => canPrev && onChange(selectedIndex - 1)}
                    aria-label="Previous split"
                >
                    <ChevronLeft />
                </button>
                <div className={styles.selectorTitle}>{title}</div>
                <div className={styles.selectorJumps}>
                    {showGoToCurrent && (
                        <button
                            type="button"
                            className={styles.jumpButtonPrimary}
                            onClick={() => onChange(goToTargetIdx)}
                        >
                            Go to current split
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    className={styles.selectorButton}
                    disabled={!canNext}
                    onClick={() => canNext && onChange(selectedIndex + 1)}
                    aria-label="Next split"
                >
                    <ChevronRight />
                </button>
            </div>
            {isFinished && (
                <div className={styles.finishedBanner}>
                    <span className={styles.finishedBannerDot} />
                    Run finished
                    {liveRun.splits[total - 1]?.splitTime != null && (
                        <span className={styles.finishedBannerTime}>
                            {formatTimeMs(liveRun.splits[total - 1].splitTime!)}
                        </span>
                    )}
                </div>
            )}
            {showTimers && (
                <div className={styles.selectorTimers}>
                    <div className={styles.selectorTimer}>
                        <span className={styles.selectorTimerLabel}>Split</span>
                        <span className={styles.selectorTimerValue}>
                            {formatTimeMs(displayCumulative)}
                        </span>
                    </div>
                    <div className={styles.selectorTimer}>
                        <span className={styles.selectorTimerLabel}>
                            Segment
                        </span>
                        <span className={styles.selectorTimerValue}>
                            {formatTimeMs(displaySegment)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};
