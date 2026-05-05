'use client';

import clsx from 'clsx';
import { LiveRun, Split } from '~app/(new-layout)/live/live.types';
import { useLiveElapsedMs } from '~app/(new-layout)/live/use-live-elapsed-ms';
import styles from '../commentary-drawer.module.scss';
import { formatDelta, formatPercent, formatTimeMs } from '../format';

const resetRate = (s: Split): number | null => {
    if (!s.attemptsStarted) return null;
    return Math.max(
        0,
        Math.min(1, 1 - (s.attemptsFinished ?? 0) / s.attemptsStarted),
    );
};

const timeSavePotential = (
    pbSegment: number | null,
    bestPossible: number | null | undefined,
): number | null => {
    if (pbSegment == null || bestPossible == null) return null;
    return pbSegment - bestPossible;
};

const segmentAt = (
    liveRun: LiveRun,
    selectedIndex: number,
    role: 'past' | 'live' | 'upcoming',
    liveNowMs: number | null,
): number | null => {
    const split = liveRun.splits[selectedIndex];
    if (role === 'past') {
        if (split.splitTime == null) return null;
        if (selectedIndex === 0) return split.splitTime;
        const prev = liveRun.splits[selectedIndex - 1]?.splitTime;
        if (prev == null) return null;
        return split.splitTime - prev;
    }
    if (role === 'live') {
        if (liveNowMs == null) return null;
        if (selectedIndex === 0) return liveNowMs;
        const prev = liveRun.splits[selectedIndex - 1]?.splitTime;
        if (prev == null) return null;
        return liveNowMs - prev;
    }
    return split.predictedSingleTime ?? null;
};

const splitAt = (
    liveRun: LiveRun,
    selectedIndex: number,
    role: 'past' | 'live' | 'upcoming',
    liveNowMs: number | null,
): number | null => {
    const split = liveRun.splits[selectedIndex];
    if (role === 'past') return split.splitTime ?? null;
    if (role === 'live') return liveNowMs;
    return split.predictedTotalTime ?? null;
};

const pbSegmentAt = (
    liveRun: LiveRun,
    selectedIndex: number,
): number | null => {
    const split = liveRun.splits[selectedIndex];
    if (split.pbSplitTime == null) return null;
    if (selectedIndex === 0) return split.pbSplitTime;
    const prev = liveRun.splits[selectedIndex - 1]?.pbSplitTime;
    if (prev == null) return null;
    return split.pbSplitTime - prev;
};

const ordinalSuffix = (n: number): string => {
    const rem = n % 100;
    if (rem >= 11 && rem <= 13) return 'th';
    switch (n % 10) {
        case 1:
            return 'st';
        case 2:
            return 'nd';
        case 3:
            return 'rd';
        default:
            return 'th';
    }
};

type Trend = 'faster' | 'slower' | 'stable';

const computeTrend = (data: number[]): Trend => {
    if (data.length < 4) return 'stable';
    const half = Math.floor(data.length / 2);
    const firstSlice = data.slice(0, half);
    const secondSlice = data.slice(-half);
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const firstAvg = avg(firstSlice);
    const secondAvg = avg(secondSlice);
    const threshold = firstAvg * 0.02;
    if (secondAvg < firstAvg - threshold) return 'faster';
    if (secondAvg > firstAvg + threshold) return 'slower';
    return 'stable';
};

const RecentChart = ({
    values,
    pbRef,
    thisAttemptValue,
}: {
    values: number[];
    pbRef: number | null;
    thisAttemptValue: number | null;
}) => {
    if (values.length < 2) return null;

    const data = values.slice(-20);
    const w = 320;
    const h = 36;
    const padX = 4;
    const padY = 4;

    const all = [...data];
    if (pbRef != null) all.push(pbRef);
    const min = Math.min(...all);
    const max = Math.max(...all);
    const span = Math.max(1, max - min);
    const xFor = (i: number) => padX + (i / (data.length - 1)) * (w - padX * 2);
    const yFor = (v: number) => padY + ((max - v) / span) * (h - padY * 2);

    const path = data
        .map(
            (v, i) =>
                `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`,
        )
        .join(' ');

    const lastIsThis =
        thisAttemptValue != null && data[data.length - 1] === thisAttemptValue;

    let rankLabel: string | null = null;
    if (lastIsThis && thisAttemptValue != null) {
        const sorted = [...data].sort((a, b) => a - b);
        const rank = sorted.indexOf(thisAttemptValue) + 1;
        rankLabel = `${rank}${ordinalSuffix(rank)} fastest of ${data.length}`;
    }

    const trend = computeTrend(data);
    const trendLabel =
        trend === 'faster'
            ? 'Trending faster'
            : trend === 'stable'
              ? 'Stable'
              : null;

    return (
        <div className={styles.recentChart}>
            <svg
                viewBox={`0 0 ${w} ${h}`}
                preserveAspectRatio="none"
                className={styles.recentChartSvg}
            >
                {pbRef != null && (
                    <line
                        x1={padX}
                        x2={w - padX}
                        y1={yFor(pbRef)}
                        y2={yFor(pbRef)}
                        className={styles.recentChartPbLine}
                    />
                )}
                <path d={path} className={styles.recentChartLine} />
                {data.map((v, i) => {
                    const isThis = i === data.length - 1 && lastIsThis;
                    return (
                        <circle
                            key={i}
                            cx={xFor(i)}
                            cy={yFor(v)}
                            r={isThis ? 2.6 : 1.4}
                            className={
                                isThis
                                    ? styles.recentChartDotThis
                                    : styles.recentChartDot
                            }
                        />
                    );
                })}
            </svg>
            <div className={styles.recentChartMeta}>
                <span>{rankLabel ?? `Last ${data.length} attempts`}</span>
                {trendLabel && (
                    <span
                        className={clsx(
                            trend === 'faster' && styles.trendFaster,
                            trend === 'stable' && styles.trendStable,
                        )}
                    >
                        {trendLabel}
                    </span>
                )}
            </div>
        </div>
    );
};

const recentChipTone = (
    deltaToPb: number | null,
): 'ahead' | 'aheadMuted' | 'behindMuted' | 'behind' | 'neutral' => {
    if (deltaToPb == null) return 'neutral';
    if (deltaToPb < -1500) return 'ahead';
    if (deltaToPb < 0) return 'aheadMuted';
    if (deltaToPb < 1500) return 'behindMuted';
    return 'behind';
};

const RecentChips = ({
    values,
    pbRef,
    thisAttemptValue,
}: {
    values: number[];
    pbRef: number | null;
    thisAttemptValue: number | null;
}) => {
    const sliced = values.slice(-5);
    const lastIdx = sliced.length - 1;
    return (
        <div className={styles.recentChipRow}>
            {sliced.map((ms, i) => {
                const d = pbRef != null ? ms - pbRef : null;
                const tone = recentChipTone(d);
                const isThisAttempt =
                    i === lastIdx &&
                    thisAttemptValue != null &&
                    values[values.length - 1] === thisAttemptValue;
                return (
                    <div
                        key={i}
                        className={clsx(
                            styles.recentChip,
                            tone === 'ahead' && styles.recentChipAhead,
                            tone === 'aheadMuted' &&
                                styles.recentChipAheadMuted,
                            tone === 'behindMuted' &&
                                styles.recentChipBehindMuted,
                            tone === 'behind' && styles.recentChipBehind,
                            isThisAttempt && styles.recentChipThisAttempt,
                        )}
                    >
                        {isThisAttempt && (
                            <span className={styles.recentChipTag}>
                                This run
                            </span>
                        )}
                        <span className={styles.recentChipTime}>
                            {formatTimeMs(ms)}
                        </span>
                        <span className={styles.recentChipDelta}>
                            {d != null ? formatDelta(d).text : '—'}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export const SplitTab = ({
    liveRun,
    selectedIndex,
}: {
    liveRun: LiveRun;
    selectedIndex: number;
}) => {
    const total = liveRun.splits?.length ?? 0;
    const liveNowMs = useLiveElapsedMs(liveRun);

    if (total === 0) return <div className={styles.empty}>No split data.</div>;

    // Run finished and follow-live pushed selectedIndex past the end → fall
    // back to the last split so commentators see its data by default.
    const effectiveIndex = selectedIndex >= total ? total - 1 : selectedIndex;

    const split = liveRun.splits[effectiveIndex];
    const current = liveRun.currentSplitIndex;
    const role: 'past' | 'live' | 'upcoming' =
        effectiveIndex < current
            ? 'past'
            : effectiveIndex === current
              ? 'live'
              : 'upcoming';

    const segment = segmentAt(liveRun, effectiveIndex, role, liveNowMs);
    const splitTime = splitAt(liveRun, effectiveIndex, role, liveNowMs);
    const pbSegment = pbSegmentAt(liveRun, effectiveIndex);

    const recent = split.recentCompletionsSingle ?? [];
    const recentSplits = split.recentCompletionsTotal ?? [];
    const reset = resetRate(split);
    const tsp = timeSavePotential(pbSegment, split.bestPossible);

    const remainingLive = Math.max(0, total - liveRun.currentSplitIndex);
    const remainingLabel =
        remainingLive === 0
            ? null
            : remainingLive === 1
              ? '1 split to go'
              : `${remainingLive} splits to go`;
    const positionLabel = `Split ${effectiveIndex + 1} of ${total}`;

    const sectionLabel =
        role === 'past'
            ? 'What happened'
            : role === 'live'
              ? 'Live split'
              : 'What to watch for';

    const segmentDeltaToPb =
        role === 'past' && segment != null && pbSegment != null
            ? segment - pbSegment
            : null;

    const splitDeltaToPb =
        role === 'past' && splitTime != null && split.pbSplitTime != null
            ? splitTime - split.pbSplitTime
            : null;

    // ETA to crossing the live segment, given the model's predicted segment time.
    const crossingInMs = (() => {
        if (role !== 'live') return null;
        if (split.predictedSingleTime == null || segment == null) return null;
        const remaining = split.predictedSingleTime - segment;
        return remaining > 0 ? remaining : null;
    })();

    const isGoldThisSplit =
        role === 'past' &&
        segment != null &&
        split.bestPossible != null &&
        segment < split.bestPossible;

    // "What to watch for" flags — only meaningful on upcoming or live splits.
    const watchFlags: { kind: 'risk' | 'opportunity'; text: string }[] = [];
    if (role !== 'past') {
        if (reset != null && reset >= 0.5) {
            watchFlags.push({
                kind: 'risk',
                text: `High reset rate — ${Math.round(reset * 100)}% of attempts end here`,
            });
        } else if (reset != null && reset >= 0.3) {
            watchFlags.push({
                kind: 'risk',
                text: `Reset risk — ${Math.round(reset * 100)}%`,
            });
        }
        if (tsp != null && tsp >= 5000) {
            watchFlags.push({
                kind: 'opportunity',
                text: `Big gold-saver — up to ${formatTimeMs(tsp)} possible`,
            });
        }
    }

    return (
        <>
            <div className={styles.sectionTitle}>
                {sectionLabel}
                <span className={styles.sectionTitleSub}>
                    {positionLabel}
                    {remainingLabel ? ` · ${remainingLabel}` : ''}
                </span>
            </div>

            {role === 'live' && liveRun.delta != null && (
                <div
                    className={clsx(
                        styles.paceCallout,
                        liveRun.delta < 0 && styles.paceAhead,
                        liveRun.delta > 0 && styles.paceBehind,
                    )}
                >
                    <span className={styles.paceLabel}>Pace vs PB</span>
                    <span className={styles.paceValue}>
                        {formatDelta(liveRun.delta).text}
                    </span>
                    {crossingInMs != null && (
                        <span className={styles.paceEta}>
                            Crossing in ~{formatTimeMs(crossingInMs)}
                        </span>
                    )}
                </div>
            )}

            {watchFlags.length > 0 && (
                <div className={styles.watchFlags}>
                    {watchFlags.map((f, i) => (
                        <div
                            key={i}
                            className={clsx(
                                styles.watchFlag,
                                f.kind === 'risk' && styles.watchFlagRisk,
                                f.kind === 'opportunity' &&
                                    styles.watchFlagOpportunity,
                            )}
                        >
                            <span className={styles.watchFlagIcon}>
                                {f.kind === 'risk' ? '⚠' : '★'}
                            </span>
                            {f.text}
                        </div>
                    ))}
                </div>
            )}

            <div className={styles.statCardRow}>
                <div
                    className={styles.statCard}
                    title="The segment time during the runner's PB run."
                >
                    <span className={styles.statCardLabel}>PB segment</span>
                    <span className={styles.statCardValue}>
                        {formatTimeMs(pbSegment)}
                    </span>
                </div>
                <div
                    className={styles.statCard}
                    title="The model's expected duration for this segment, based on the runner's history."
                >
                    <span className={styles.statCardLabel}>
                        Predicted segment
                    </span>
                    <span className={styles.statCardValue}>
                        {formatTimeMs(split.predictedSingleTime)}
                    </span>
                </div>
                <div
                    className={styles.statCard}
                    title="The runner's all-time fastest time on this segment (a 'gold')."
                >
                    <span className={styles.statCardLabel}>Best ever</span>
                    <span className={styles.statCardValue}>
                        {formatTimeMs(split.bestPossible)}
                    </span>
                </div>
            </div>

            {role !== 'past' && tsp != null && tsp > 0 && (
                <div
                    className={styles.callout}
                    title="How much faster the runner could go on this segment if they hit their best-ever time, compared to their PB segment."
                >
                    <span className={styles.calloutLabel}>
                        Time save potential
                    </span>
                    <span className={styles.calloutValue}>
                        {formatTimeMs(tsp)}
                    </span>
                </div>
            )}

            {role === 'past' && segment != null && (
                <div
                    className={clsx(
                        styles.segmentResult,
                        isGoldThisSplit && styles.segmentResultGold,
                    )}
                >
                    <span className={styles.segmentResultLabel}>
                        Segment achieved
                    </span>
                    <span className={styles.segmentResultValue}>
                        {formatTimeMs(segment)}
                    </span>
                    {isGoldThisSplit && (
                        <span
                            className={styles.goldBadge}
                            title="Faster than the runner's previous best on this segment."
                        >
                            ★ GOLD
                        </span>
                    )}
                    {segmentDeltaToPb != null && (
                        <span
                            className={clsx(
                                styles.calloutDelta,
                                segmentDeltaToPb < 0 &&
                                    styles.calloutDeltaAhead,
                                segmentDeltaToPb > 0 &&
                                    styles.calloutDeltaBehind,
                            )}
                        >
                            {formatDelta(segmentDeltaToPb).text} vs PB
                        </span>
                    )}
                </div>
            )}

            {role === 'past' && splitTime != null && (
                <div className={styles.segmentResult}>
                    <span className={styles.segmentResultLabel}>
                        Split achieved
                    </span>
                    <span className={styles.segmentResultValue}>
                        {formatTimeMs(splitTime)}
                    </span>
                    {splitDeltaToPb != null && (
                        <span
                            className={clsx(
                                styles.calloutDelta,
                                splitDeltaToPb < 0 && styles.calloutDeltaAhead,
                                splitDeltaToPb > 0 && styles.calloutDeltaBehind,
                            )}
                        >
                            {formatDelta(splitDeltaToPb).text} vs PB
                        </span>
                    )}
                </div>
            )}

            <div className={styles.sectionTitle}>Risk</div>
            <div className={styles.riskRow}>
                <div
                    className={styles.riskItem}
                    title="Share of attempts that don't make it past this split (resets ÷ attempts started)."
                >
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
            </div>

            {recent.length > 0 && (
                <>
                    <div className={styles.sectionTitle}>
                        Recent segments
                        <span className={styles.sectionTitleSub}>
                            vs PB segment {formatTimeMs(pbSegment)}
                        </span>
                    </div>
                    <RecentChips
                        values={recent}
                        pbRef={pbSegment}
                        thisAttemptValue={role === 'past' ? segment : null}
                    />
                    <RecentChart
                        values={recent}
                        pbRef={pbSegment}
                        thisAttemptValue={role === 'past' ? segment : null}
                    />
                </>
            )}

            {recentSplits.length > 0 && (
                <>
                    <div className={styles.sectionTitle}>
                        Recent splits
                        <span className={styles.sectionTitleSub}>
                            vs PB split{' '}
                            {formatTimeMs(split.pbSplitTime ?? null)}
                        </span>
                    </div>
                    <RecentChips
                        values={recentSplits}
                        pbRef={split.pbSplitTime ?? null}
                        thisAttemptValue={role === 'past' ? splitTime : null}
                    />
                    <RecentChart
                        values={recentSplits}
                        pbRef={split.pbSplitTime ?? null}
                        thisAttemptValue={role === 'past' ? splitTime : null}
                    />
                </>
            )}
        </>
    );
};
