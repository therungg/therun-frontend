'use client';

import clsx from 'clsx';
import { useRef, useState } from 'react';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import styles from '../commentary-drawer.module.scss';
import { formatDelta, formatTimeMs } from '../format';

const DeltaPill = ({ ms, label }: { ms: number | null; label?: string }) => {
    const d = formatDelta(ms);
    return (
        <span
            className={clsx(
                styles.deltaPill,
                d.tone === 'ahead' && styles.deltaPillAhead,
                d.tone === 'behind' && styles.deltaPillBehind,
                d.tone === 'neutral' && styles.deltaPillNeutral,
            )}
        >
            {label && <span className={styles.deltaPillLabel}>{label}</span>}
            {ms == null ? '—' : d.text}
        </span>
    );
};

interface RangeBarProps {
    p10: number;
    p90: number;
    pb: number | null;
    projected: number | null;
}

const clampPct = (n: number) => Math.max(0, Math.min(100, n));

const RangeBar = ({ p10, p90, pb, projected }: RangeBarProps) => {
    const span = Math.max(1, p90 - p10);

    // Pad bounds slightly so PB/projected near edges still fit visually.
    const padding = span * 0.1;
    const min = p10 - padding;
    const max = p90 + padding;

    const pos = (v: number | null) =>
        v == null ? null : clampPct(((v - min) / (max - min)) * 100);

    const fillLeft = pos(p10) ?? 0;
    const fillRight = pos(p90) ?? 100;

    const projectedPos = pos(projected);
    const pbPos = pos(pb);

    // Decide which marker label goes on top vs bottom to avoid collision.
    const projectedOnTop =
        projectedPos == null ||
        pbPos == null ||
        Math.abs(projectedPos - pbPos) > 12 ||
        projectedPos <= pbPos;

    return (
        <div className={styles.rangeBarWrap}>
            <div className={styles.rangeBar}>
                <div
                    className={styles.rangeBarFill}
                    style={{
                        left: `${fillLeft}%`,
                        right: `${100 - fillRight}%`,
                    }}
                />
                {projectedPos != null && (
                    <>
                        <span
                            className={clsx(
                                styles.rangeBarMarker,
                                styles.rangeBarMarkerProjected,
                            )}
                            style={{ left: `${projectedPos}%` }}
                        />
                        <span
                            className={clsx(
                                styles.rangeBarMarkerLabel,
                                styles.rangeBarMarkerLabelProjected,
                                !projectedOnTop &&
                                    styles.rangeBarMarkerLabelBottom,
                            )}
                            style={{ left: `${projectedPos}%` }}
                        >
                            Proj
                        </span>
                    </>
                )}
                {pbPos != null && (
                    <>
                        <span
                            className={clsx(
                                styles.rangeBarMarker,
                                styles.rangeBarMarkerPb,
                            )}
                            style={{ left: `${pbPos}%` }}
                        />
                        <span
                            className={clsx(
                                styles.rangeBarMarkerLabel,
                                styles.rangeBarMarkerLabelPb,
                                projectedOnTop &&
                                    styles.rangeBarMarkerLabelBottom,
                            )}
                            style={{ left: `${pbPos}%` }}
                        >
                            PB
                        </span>
                    </>
                )}
            </div>
            <div className={styles.rangeBarBoundLabels}>
                <span>{formatTimeMs(p10)}</span>
                <span>{formatTimeMs(p90)}</span>
            </div>
        </div>
    );
};

interface DeltaBarProps {
    label: string;
    deltaMs: number | null;
    maxAbs: number;
    isGold: boolean;
    isActive: boolean;
}

const DeltaBar = ({
    label,
    deltaMs,
    maxAbs,
    isGold,
    isActive,
}: DeltaBarProps) => {
    const d = formatDelta(deltaMs);
    const pct =
        deltaMs == null
            ? 0
            : clampPct((Math.abs(deltaMs) / Math.max(1, maxAbs)) * 50);

    const fillKind: 'gold' | 'ahead' | 'behind' | 'neutral' = isGold
        ? 'gold'
        : deltaMs == null
          ? 'neutral'
          : deltaMs < 0
            ? 'ahead'
            : deltaMs > 0
              ? 'behind'
              : 'neutral';

    return (
        <div
            className={clsx(
                styles.deltaBarRow,
                isActive && styles.deltaBarRowActive,
            )}
        >
            <div className={styles.deltaBarLabel}>
                <span className={styles.deltaBarLabelText}>{label}</span>
                <div className={styles.deltaBarTrack}>
                    <div className={styles.deltaBarCenter} />
                    {pct > 0 && (
                        <div
                            className={clsx(
                                styles.deltaBarFill,
                                fillKind === 'ahead' &&
                                    styles.deltaBarFillAhead,
                                fillKind === 'behind' &&
                                    styles.deltaBarFillBehind,
                                fillKind === 'gold' && styles.deltaBarFillGold,
                            )}
                            style={{ width: `${pct}%` }}
                        />
                    )}
                </div>
            </div>
            <span
                className={clsx(
                    styles.deltaBarValue,
                    fillKind === 'ahead' && styles.toneAhead,
                    fillKind === 'behind' && styles.toneBehind,
                    fillKind === 'gold' && styles.toneNeutral,
                )}
            >
                {deltaMs == null ? '—' : d.text}
            </span>
        </div>
    );
};

interface PacePoint {
    i: number;
    delta: number;
    name: string;
    splitTime: number;
}

const PaceVsPbChart = ({ liveRun }: { liveRun: LiveRun }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);

    const completed = liveRun.splits.slice(0, liveRun.currentSplitIndex);
    const points: PacePoint[] = completed
        .map((s, i) => {
            if (s.splitTime == null || s.pbSplitTime == null) return null;
            return {
                i,
                delta: s.splitTime - s.pbSplitTime,
                name: s.name,
                splitTime: s.splitTime,
            };
        })
        .filter((p): p is PacePoint => p != null);

    // Live overlay point — runner mid-run, projected at the currentSplit's PB
    // cumulative reference. Use liveRun.delta for cumulative delta-vs-PB.
    const liveSplit = liveRun.splits[liveRun.currentSplitIndex];
    const livePoint: PacePoint | null =
        liveRun.delta != null && liveSplit && !liveRun.hasReset
            ? {
                  i: liveRun.currentSplitIndex,
                  delta: liveRun.delta,
                  name: `${liveSplit.name} (live)`,
                  splitTime: liveRun.currentTime ?? 0,
              }
            : null;

    const allPoints: PacePoint[] = livePoint ? [...points, livePoint] : points;

    if (allPoints.length < 1) return null;

    const w = 360;
    const h = 100;
    const padL = 44;
    const padR = 12;
    const padT = 10;
    const padB = 22;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;

    const maxAbs = Math.max(...allPoints.map((p) => Math.abs(p.delta)), 1);
    const yMax = maxAbs * 1.15;
    const yMin = -yMax;

    const xFor = (idx: number) =>
        allPoints.length === 1
            ? padL + innerW / 2
            : padL + (idx / (allPoints.length - 1)) * innerW;
    const yFor = (v: number) => padT + ((yMax - v) / (yMax - yMin)) * innerH;

    // Solid line for completed splits only (drawn separately).
    const completedLinePath = points
        .map(
            (p, idx) =>
                `${idx === 0 ? 'M' : 'L'}${xFor(idx).toFixed(1)},${yFor(p.delta).toFixed(1)}`,
        )
        .join(' ');

    // Dashed segment from last completed split to live point.
    const liveLinePath =
        livePoint && points.length > 0
            ? `M${xFor(points.length - 1).toFixed(1)},${yFor(points[points.length - 1].delta).toFixed(1)} L${xFor(allPoints.length - 1).toFixed(1)},${yFor(livePoint.delta).toFixed(1)}`
            : '';

    // Filled area between line and zero (completed only).
    const completedAreaPath =
        points.length > 0
            ? `M${xFor(0).toFixed(1)},${yFor(0).toFixed(1)} ` +
              points
                  .map(
                      (p, idx) =>
                          `L${xFor(idx).toFixed(1)},${yFor(p.delta).toFixed(1)}`,
                  )
                  .join(' ') +
              ` L${xFor(points.length - 1).toFixed(1)},${yFor(0).toFixed(1)} Z`
            : '';

    const lastCompletedDelta =
        points.length > 0 ? points[points.length - 1].delta : null;
    const headlineDelta = livePoint?.delta ?? lastCompletedDelta ?? 0;

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        if (rect.width === 0) return;
        const xPx = ((e.clientX - rect.left) / rect.width) * w;
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < allPoints.length; i++) {
            const dx = Math.abs(xPx - xFor(i));
            if (dx < bestDist) {
                bestDist = dx;
                bestIdx = i;
            }
        }
        setHoverIdx(bestIdx);
    };

    const hovered = hoverIdx != null ? allPoints[hoverIdx] : null;
    const hoveredX = hoverIdx != null ? xFor(hoverIdx) : null;
    const tooltipLeftPct = hoverIdx != null ? (xFor(hoverIdx) / w) * 100 : null;
    const tooltipOnRight = tooltipLeftPct != null && tooltipLeftPct < 50;

    return (
        <div className={styles.paceChartWrap}>
            <div className={styles.predictionChartInner}>
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${w} ${h}`}
                    preserveAspectRatio="none"
                    className={styles.paceChart}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoverIdx(null)}
                >
                    <defs>
                        <clipPath id="pace-above-zero">
                            <rect
                                x={padL}
                                y={padT}
                                width={innerW}
                                height={Math.max(0, yFor(0) - padT)}
                            />
                        </clipPath>
                        <clipPath id="pace-below-zero">
                            <rect
                                x={padL}
                                y={yFor(0)}
                                width={innerW}
                                height={Math.max(0, h - padB - yFor(0))}
                            />
                        </clipPath>
                    </defs>

                    {completedAreaPath && (
                        <>
                            <path
                                d={completedAreaPath}
                                className={styles.paceChartFillBehind}
                                clipPath="url(#pace-above-zero)"
                            />
                            <path
                                d={completedAreaPath}
                                className={styles.paceChartFillAhead}
                                clipPath="url(#pace-below-zero)"
                            />
                        </>
                    )}

                    <line
                        x1={padL}
                        x2={w - padR}
                        y1={yFor(0)}
                        y2={yFor(0)}
                        className={styles.paceChartZero}
                    />

                    <text
                        x={padL - 6}
                        y={yFor(0) + 3}
                        textAnchor="end"
                        className={styles.paceChartAxisLabel}
                    >
                        PB
                    </text>
                    <text
                        x={padL - 6}
                        y={yFor(yMax) + 8}
                        textAnchor="end"
                        className={styles.paceChartAxisLabel}
                    >
                        {formatDelta(yMax).text}
                    </text>
                    <text
                        x={padL - 6}
                        y={yFor(yMin)}
                        textAnchor="end"
                        className={styles.paceChartAxisLabel}
                    >
                        {formatDelta(yMin).text}
                    </text>

                    {completedLinePath && (
                        <path
                            d={completedLinePath}
                            className={styles.paceChartLine}
                        />
                    )}
                    {liveLinePath && (
                        <path
                            d={liveLinePath}
                            className={styles.paceChartLineLive}
                        />
                    )}

                    {allPoints.map((p, idx) => {
                        const isLive =
                            livePoint != null && idx === allPoints.length - 1;
                        const isLastCompleted =
                            idx === points.length - 1 && !isLive;
                        return (
                            <circle
                                key={`${p.i}-${isLive ? 'live' : 'done'}`}
                                cx={xFor(idx)}
                                cy={yFor(p.delta)}
                                r={isLive || isLastCompleted ? 3 : 1.8}
                                className={clsx(
                                    isLive
                                        ? styles.paceChartDotLive
                                        : p.delta < 0
                                          ? styles.paceChartDotAhead
                                          : p.delta > 0
                                            ? styles.paceChartDotBehind
                                            : styles.paceChartDotNeutral,
                                    (isLive || isLastCompleted) &&
                                        styles.paceChartDotLast,
                                )}
                            />
                        );
                    })}

                    {hovered && hoveredX != null && (
                        <line
                            x1={hoveredX}
                            x2={hoveredX}
                            y1={padT}
                            y2={h - padB}
                            className={styles.predictionHoverLine}
                        />
                    )}

                    <text
                        x={padL}
                        y={h - 6}
                        className={styles.paceChartAxisLabel}
                    >
                        Split 1
                    </text>
                    <text
                        x={w - padR}
                        y={h - 6}
                        textAnchor="end"
                        className={styles.paceChartAxisLabel}
                    >
                        Split {allPoints[allPoints.length - 1].i + 1}
                    </text>
                </svg>

                {hovered && tooltipLeftPct != null && (
                    <div
                        className={styles.predictionTooltip}
                        style={{
                            left: tooltipOnRight
                                ? `calc(${tooltipLeftPct}% + 0.5rem)`
                                : 'auto',
                            right: tooltipOnRight
                                ? 'auto'
                                : `calc(${100 - tooltipLeftPct}% + 0.5rem)`,
                        }}
                    >
                        <div className={styles.predictionTooltipTitle}>
                            Split {hovered.i + 1} — {hovered.name}
                        </div>
                        <div className={styles.predictionTooltipRow}>
                            <span className={styles.predictionTooltipLabel}>
                                vs PB
                            </span>
                            <span
                                className={clsx(
                                    styles.predictionTooltipValue,
                                    hovered.delta < 0 && styles.toneAhead,
                                    hovered.delta > 0 && styles.toneBehind,
                                )}
                            >
                                {formatDelta(hovered.delta).text}
                            </span>
                        </div>
                        {hovered.splitTime > 0 && (
                            <div className={styles.predictionTooltipRow}>
                                <span className={styles.predictionTooltipLabel}>
                                    Time
                                </span>
                                <span className={styles.predictionTooltipValue}>
                                    {formatTimeMs(hovered.splitTime)}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className={styles.paceChartLegend}>
                <span>
                    <span className={styles.paceChartLegendSwatchAhead} />
                    Ahead of PB
                </span>
                <span>
                    <span className={styles.paceChartLegendSwatchBehind} />
                    Behind PB
                </span>
                {livePoint && (
                    <span>
                        <span className={styles.paceChartLegendSwatchLive} />
                        Live
                    </span>
                )}
            </div>
            <div className={styles.paceChartFooter}>
                <span>
                    {livePoint
                        ? `Live · after ${points.length} splits`
                        : `After ${points.length} completed splits`}
                </span>
                <span
                    className={clsx(
                        headlineDelta < 0 && styles.toneAhead,
                        headlineDelta > 0 && styles.toneBehind,
                    )}
                >
                    {formatDelta(headlineDelta).text} vs PB
                </span>
            </div>
        </div>
    );
};

export const RunTab = ({
    liveRun,
    selectedIndex,
}: {
    liveRun: LiveRun;
    selectedIndex: number;
}) => {
    const mc = liveRun.monteCarloPrediction;
    const projectedDelta =
        mc?.bestEstimate != null && liveRun.pb != null
            ? mc.bestEstimate - liveRun.pb
            : null;

    // Per-split delta computation for completed splits.
    const completed = liveRun.splits.slice(0, liveRun.currentSplitIndex);
    const splitDeltas = completed.map((s, i) => {
        // Single-time delta (this split's standalone gain/loss).
        const prevSplit =
            s.splitTime != null && i > 0 ? completed[i - 1].splitTime : null;
        const singleNow =
            s.splitTime != null
                ? i === 0
                    ? s.splitTime
                    : prevSplit != null
                      ? s.splitTime - prevSplit
                      : null
                : null;

        const prevPb =
            s.pbSplitTime != null && i > 0
                ? completed[i - 1].pbSplitTime
                : null;
        const pbSingle =
            s.pbSplitTime != null
                ? i === 0
                    ? s.pbSplitTime
                    : prevPb != null
                      ? s.pbSplitTime - prevPb
                      : null
                : null;

        const singleDelta =
            singleNow != null && pbSingle != null ? singleNow - pbSingle : null;

        const isGold =
            singleNow != null &&
            s.bestPossible != null &&
            singleNow < s.bestPossible;

        return { s, i, singleDelta, isGold };
    });

    const maxAbsSingle = Math.max(
        1,
        ...splitDeltas.map((d) =>
            d.singleDelta != null ? Math.abs(d.singleDelta) : 0,
        ),
    );

    return (
        <>
            <div className={styles.sectionTitle}>
                Pace vs PB
                <span className={styles.sectionTitleSub}>
                    Above the line = behind PB · below = ahead
                </span>
            </div>
            <PaceVsPbChart liveRun={liveRun} />

            <div className={styles.sectionTitle}>Projected finish</div>
            <div className={styles.heroSolo}>
                <div className={clsx(styles.heroCard, styles.heroCardWide)}>
                    <span className={styles.heroNumberLabel}>
                        {mc ? 'Best estimate' : 'Awaiting projection'}
                    </span>
                    <span
                        className={clsx(styles.heroNumber, styles.heroNumberLg)}
                    >
                        {formatTimeMs(mc?.bestEstimate ?? null)}
                    </span>
                    {mc != null && (
                        <DeltaPill ms={projectedDelta} label="vs PB" />
                    )}
                </div>
            </div>

            {mc != null && (
                <RangeBar
                    p10={mc.percentiles.p10}
                    p90={mc.percentiles.p90}
                    pb={liveRun.pb ?? null}
                    projected={mc.bestEstimate ?? null}
                />
            )}

            <div className={styles.sectionTitle}>Pace anchors</div>
            <div className={styles.statCardRow}>
                <div
                    className={styles.statCard}
                    title="Personal Best — the runner's fastest completed run."
                >
                    <span className={styles.statCardLabel}>PB</span>
                    <span className={styles.statCardValue}>
                        {formatTimeMs(liveRun.pb)}
                    </span>
                </div>
                <div
                    className={styles.statCard}
                    title="Sum of Best — adding the runner's best ever segment time on every split. The theoretical floor if they got every gold in one run."
                >
                    <span className={styles.statCardLabel}>
                        Sum of best (SOB)
                    </span>
                    <span className={styles.statCardValue}>
                        {formatTimeMs(liveRun.sob)}
                    </span>
                </div>
                <div
                    className={styles.statCard}
                    title="The fastest finish still achievable from where the runner is now — current time plus the gold time on every remaining split."
                >
                    <span className={styles.statCardLabel}>Best possible</span>
                    <span className={styles.statCardValue}>
                        {formatTimeMs(liveRun.bestPossible)}
                    </span>
                </div>
            </div>

            {mc != null && (
                <>
                    <div className={styles.sectionTitle}>
                        Likely finish range
                        <span className={styles.sectionTitleSub}>
                            Half of simulated runs land between these two
                        </span>
                    </div>
                    <div
                        className={clsx(
                            styles.statCardRow,
                            styles.statCardRow2,
                        )}
                    >
                        <div
                            className={styles.statCard}
                            title="25th percentile — only ¼ of simulated runs from here finish faster than this."
                        >
                            <span className={styles.statCardLabel}>
                                Optimistic (p25)
                            </span>
                            <span className={styles.statCardValue}>
                                {formatTimeMs(mc.percentiles.p25)}
                            </span>
                        </div>
                        <div
                            className={styles.statCard}
                            title="75th percentile — ¾ of simulated runs from here finish faster than this; only ¼ are slower."
                        >
                            <span className={styles.statCardLabel}>
                                Pessimistic (p75)
                            </span>
                            <span className={styles.statCardValue}>
                                {formatTimeMs(mc.percentiles.p75)}
                            </span>
                        </div>
                    </div>
                </>
            )}

            {splitDeltas.length > 0 && (
                <>
                    <div className={styles.sectionTitle}>
                        Per-split (single time vs PB)
                    </div>
                    {splitDeltas.map((d) => (
                        <DeltaBar
                            key={d.i}
                            label={d.s.name || `Split ${d.i + 1}`}
                            deltaMs={d.singleDelta}
                            maxAbs={maxAbsSingle}
                            isGold={d.isGold}
                            isActive={d.i === selectedIndex}
                        />
                    ))}
                </>
            )}
        </>
    );
};
