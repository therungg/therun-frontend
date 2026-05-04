'use client';

import { LiveRun, Split } from '~app/(new-layout)/live/live.types';
import styles from '../commentary-drawer.module.scss';
import { formatDelta, formatPercent, formatTimeMs } from '../format';

const Row = ({ label, value }: { label: string; value: string }) => (
    <div className={styles.statRow}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statValue}>{value}</span>
    </div>
);

const resetRate = (s: Split): number | null => {
    if (!s.attemptsStarted) return null;
    return Math.max(
        0,
        Math.min(1, 1 - (s.attemptsFinished ?? 0) / s.attemptsStarted),
    );
};

const timeSavePotential = (s: Split): number | null => {
    const pbSingle = s.pbSplitTime;
    const bestPossible = s.bestPossible;
    if (pbSingle == null || bestPossible == null) return null;
    return pbSingle - bestPossible;
};

export const SplitTab = ({
    liveRun,
    selectedIndex,
}: {
    liveRun: LiveRun;
    selectedIndex: number;
}) => {
    const total = liveRun.splits?.length ?? 0;

    if (total === 0) {
        return <div className={styles.empty}>No split data.</div>;
    }

    if (selectedIndex >= total) {
        return (
            <div className={styles.empty}>
                Run finished — no upcoming split.
            </div>
        );
    }

    const split = liveRun.splits[selectedIndex];
    const current = liveRun.currentSplitIndex;
    const role: 'past' | 'live' | 'upcoming' =
        selectedIndex < current
            ? 'past'
            : selectedIndex === current
              ? 'live'
              : 'upcoming';

    const delta =
        role === 'past' && split.splitTime != null && split.pbSplitTime != null
            ? formatDelta(split.splitTime - split.pbSplitTime)
            : { text: '—', tone: 'neutral' as const };

    const recent = split.recentCompletionsSingle ?? [];

    return (
        <>
            <div className={styles.sectionTitle}>
                {role === 'past' && 'What happened'}
                {role === 'live' && 'Live split'}
                {role === 'upcoming' && 'What to watch for'}
            </div>
            <Row
                label="Single time"
                value={formatTimeMs(
                    role === 'past'
                        ? split.splitTime != null && selectedIndex > 0
                            ? split.splitTime -
                              (liveRun.splits[selectedIndex - 1]?.splitTime ??
                                  0)
                            : (split.splitTime ?? null)
                        : (split.predictedSingleTime ?? null),
                )}
            />
            <Row
                label="Cumulative"
                value={formatTimeMs(
                    role === 'past'
                        ? (split.splitTime ?? null)
                        : (split.predictedTotalTime ?? null),
                )}
            />
            <Row
                label="PB split"
                value={formatTimeMs(split.pbSplitTime ?? null)}
            />
            <Row label="Average" value={formatTimeMs(split.average ?? null)} />
            <Row
                label="Best possible"
                value={formatTimeMs(split.bestPossible ?? null)}
            />
            <Row
                label="Time save potential"
                value={formatTimeMs(timeSavePotential(split))}
            />
            <Row
                label="Consistency"
                value={
                    split.consistency != null
                        ? split.consistency.toFixed(2)
                        : '—'
                }
            />
            <Row
                label="Attempts"
                value={`${split.attemptsFinished ?? 0} / ${split.attemptsStarted ?? 0}`}
            />
            <Row label="Reset %" value={formatPercent(resetRate(split))} />
            {role === 'past' && (
                <Row label="Δ PB at split" value={delta.text} />
            )}
            {recent.length > 0 && (
                <>
                    <div className={styles.sectionTitle}>
                        Recent completions
                    </div>
                    {recent.slice(-8).map((ms, i) => (
                        <Row
                            key={i}
                            label={`#${recent.length - Math.min(8, recent.length) + i + 1}`}
                            value={formatTimeMs(ms)}
                        />
                    ))}
                </>
            )}
        </>
    );
};
