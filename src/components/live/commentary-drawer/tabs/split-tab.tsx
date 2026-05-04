'use client';

import clsx from 'clsx';
import { LiveRun, Split } from '~app/(new-layout)/live/live.types';
import styles from '../commentary-drawer.module.scss';
import { formatDelta, formatPercent, formatTimeMs } from '../format';

const resetRate = (s: Split): number | null => {
    if (!s.attemptsStarted) return null;
    return Math.max(
        0,
        Math.min(1, 1 - (s.attemptsFinished ?? 0) / s.attemptsStarted),
    );
};

const timeSavePotential = (s: Split): number | null => {
    if (s.pbSplitTime == null || s.bestPossible == null) return null;
    return s.pbSplitTime - s.bestPossible;
};

const singleAt = (
    liveRun: LiveRun,
    selectedIndex: number,
    role: 'past' | 'live' | 'upcoming',
): number | null => {
    const split = liveRun.splits[selectedIndex];
    if (role === 'past') {
        if (split.splitTime == null) return null;
        if (selectedIndex === 0) return split.splitTime;
        const prev = liveRun.splits[selectedIndex - 1]?.splitTime;
        if (prev == null) return null;
        return split.splitTime - prev;
    }
    return split.predictedSingleTime ?? null;
};

const cumulativeAt = (
    split: Split,
    role: 'past' | 'live' | 'upcoming',
): number | null => {
    if (role === 'past') return split.splitTime ?? null;
    return split.predictedTotalTime ?? null;
};

const pbSingleAt = (liveRun: LiveRun, selectedIndex: number): number | null => {
    const split = liveRun.splits[selectedIndex];
    if (split.pbSplitTime == null) return null;
    if (selectedIndex === 0) return split.pbSplitTime;
    const prev = liveRun.splits[selectedIndex - 1]?.pbSplitTime;
    if (prev == null) return null;
    return split.pbSplitTime - prev;
};

const DeltaPill = ({
    ms,
    label,
    forceTone,
}: {
    ms: number | null;
    label?: string;
    forceTone?: 'gold';
}) => {
    const d = formatDelta(ms);
    return (
        <span
            className={clsx(
                styles.deltaPill,
                forceTone === 'gold' && styles.deltaPillGold,
                !forceTone && d.tone === 'ahead' && styles.deltaPillAhead,
                !forceTone && d.tone === 'behind' && styles.deltaPillBehind,
                !forceTone && d.tone === 'neutral' && styles.deltaPillNeutral,
            )}
        >
            {label && <span className={styles.deltaPillLabel}>{label}</span>}
            {ms == null ? '—' : d.text}
        </span>
    );
};

const StatCard = ({ label, value }: { label: string; value: string }) => (
    <div className={styles.statCard}>
        <span className={styles.statCardLabel}>{label}</span>
        <span className={styles.statCardValue}>{value}</span>
    </div>
);

const HeroCard = ({
    label,
    value,
    deltaMs,
    deltaLabel,
    isGold,
}: {
    label: string;
    value: string;
    deltaMs?: number | null;
    deltaLabel?: string;
    isGold?: boolean;
}) => (
    <div className={styles.heroCard}>
        <span className={styles.heroNumberLabel}>{label}</span>
        <span className={styles.heroNumber}>{value}</span>
        {deltaMs !== undefined && (
            <DeltaPill
                ms={deltaMs ?? null}
                label={deltaLabel}
                forceTone={isGold ? 'gold' : undefined}
            />
        )}
    </div>
);

const recentChipTone = (
    deltaToPb: number | null,
): 'ahead' | 'aheadMuted' | 'behindMuted' | 'behind' | 'neutral' => {
    if (deltaToPb == null) return 'neutral';
    if (deltaToPb < -1500) return 'ahead';
    if (deltaToPb < 0) return 'aheadMuted';
    if (deltaToPb < 1500) return 'behindMuted';
    return 'behind';
};

export const SplitTab = ({
    liveRun,
    selectedIndex,
}: {
    liveRun: LiveRun;
    selectedIndex: number;
}) => {
    const total = liveRun.splits?.length ?? 0;

    if (total === 0) return <div className={styles.empty}>No split data.</div>;
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

    const single = singleAt(liveRun, selectedIndex, role);
    const cumulative = cumulativeAt(split, role);
    const pbSingle = pbSingleAt(liveRun, selectedIndex);

    const singleDelta =
        single != null && pbSingle != null ? single - pbSingle : null;
    const cumulativeDelta =
        cumulative != null && split.pbSplitTime != null
            ? cumulative - split.pbSplitTime
            : null;

    const isGoldThisSplit =
        role === 'past' &&
        single != null &&
        split.bestPossible != null &&
        single < split.bestPossible;

    const recent = split.recentCompletionsSingle ?? [];
    const reset = resetRate(split);
    const tsp = timeSavePotential(split);

    const sectionLabel =
        role === 'past'
            ? 'What happened'
            : role === 'live'
              ? 'Live split'
              : 'What to watch for';

    const singleLabel = role === 'past' ? 'Single time' : 'Predicted single';
    const cumulativeLabel = role === 'past' ? 'Cumulative' : 'Predicted total';

    return (
        <>
            <div className={styles.sectionTitle}>{sectionLabel}</div>

            <div className={styles.heroDuo}>
                <HeroCard
                    label={singleLabel}
                    value={formatTimeMs(single)}
                    deltaMs={singleDelta}
                    deltaLabel="vs PB"
                    isGold={isGoldThisSplit}
                />
                <HeroCard
                    label={cumulativeLabel}
                    value={formatTimeMs(cumulative)}
                    deltaMs={cumulativeDelta}
                    deltaLabel="vs PB"
                />
            </div>

            <div className={styles.sectionTitle}>This split's history</div>
            <div className={styles.statCardRow}>
                <StatCard label="PB single" value={formatTimeMs(pbSingle)} />
                <StatCard label="Average" value={formatTimeMs(split.average)} />
                <StatCard
                    label="Best ever"
                    value={formatTimeMs(split.bestPossible)}
                />
            </div>

            {tsp != null && tsp > 0 && (
                <div className={styles.callout}>
                    <span className={styles.calloutLabel}>
                        Time save potential
                    </span>
                    <span className={styles.calloutValue}>
                        {formatTimeMs(tsp)}
                    </span>
                </div>
            )}

            <div className={styles.sectionTitle}>Risk &amp; consistency</div>
            <div className={styles.riskRow}>
                <div className={styles.riskItem}>
                    <span className={styles.riskItemLabel}>Reset rate</span>
                    <span
                        className={clsx(
                            styles.riskItemValue,
                            reset != null &&
                                reset >= 0.5 &&
                                styles.riskItemHigh,
                            reset != null &&
                                reset >= 0.25 &&
                                reset < 0.5 &&
                                styles.riskItemMid,
                            reset != null && reset < 0.25 && styles.riskItemLow,
                        )}
                    >
                        {formatPercent(reset)}
                    </span>
                </div>
                <div className={styles.riskItem}>
                    <span className={styles.riskItemLabel}>Attempts</span>
                    <span className={styles.riskItemValue}>
                        {split.attemptsFinished ?? 0}
                        <span className={styles.riskItemSub}>
                            {' / '}
                            {split.attemptsStarted ?? 0}
                        </span>
                    </span>
                </div>
                <div className={styles.riskItem}>
                    <span className={styles.riskItemLabel}>Consistency</span>
                    <span className={styles.riskItemValue}>
                        {split.consistency != null
                            ? split.consistency.toFixed(2)
                            : '—'}
                    </span>
                </div>
            </div>

            {recent.length > 0 && (
                <>
                    <div className={styles.sectionTitle}>
                        Last {Math.min(8, recent.length)} completions
                    </div>
                    <div className={styles.recentChipRow}>
                        {recent.slice(-8).map((ms, i) => {
                            const d = pbSingle != null ? ms - pbSingle : null;
                            const tone = recentChipTone(d);
                            return (
                                <div
                                    key={i}
                                    title={
                                        d != null
                                            ? `${formatTimeMs(ms)} (${formatDelta(d).text})`
                                            : formatTimeMs(ms)
                                    }
                                    className={clsx(
                                        styles.recentChip,
                                        tone === 'ahead' &&
                                            styles.recentChipAhead,
                                        tone === 'aheadMuted' &&
                                            styles.recentChipAheadMuted,
                                        tone === 'behindMuted' &&
                                            styles.recentChipBehindMuted,
                                        tone === 'behind' &&
                                            styles.recentChipBehind,
                                    )}
                                >
                                    {formatTimeMs(ms)}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </>
    );
};
