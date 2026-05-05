'use client';

import { useRef, useState } from 'react';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import styles from '../commentary-drawer.module.scss';
import { formatDelta, formatTimeMs } from '../format';

const StatCard = ({ label, value }: { label: string; value: string }) => (
    <div className={styles.statCard}>
        <span className={styles.statCardLabel}>{label}</span>
        <span className={styles.statCardValue}>{value}</span>
    </div>
);

interface HistoryPoint {
    splitIndex: number;
    splitName: string;
    p10: number;
    p50: number | null;
    p90: number | null;
}

const PredictionHistoryChart = ({
    points,
    pb,
    currentP10,
}: {
    points: HistoryPoint[];
    pb: number | null;
    currentP10: number | null;
}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);

    if (points.length === 0) return null;

    const width = 360;
    const height = 140;
    const padL = 44;
    const padR = 12;
    const padT = 10;
    const padB = 22;

    const innerW = width - padL - padR;
    const innerH = height - padT - padB;

    const allValues: number[] = [];
    for (const p of points) {
        allValues.push(p.p10);
        if (p.p50 != null) allValues.push(p.p50);
        if (p.p90 != null) allValues.push(p.p90);
    }
    if (pb != null) allValues.push(pb);
    if (currentP10 != null) allValues.push(currentP10);
    if (allValues.length === 0) return null;

    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const span = Math.max(1, maxVal - minVal);
    const minBound = minVal - span * 0.05;
    const maxBound = maxVal + span * 0.05;

    const xFor = (i: number) => {
        if (points.length === 1) return padL + innerW / 2;
        return padL + (i / (points.length - 1)) * innerW;
    };
    const yFor = (v: number) =>
        padT + innerH - ((v - minBound) / (maxBound - minBound)) * innerH;

    const linePath = (key: 'p10' | 'p50' | 'p90') => {
        const segs: string[] = [];
        let started = false;
        points.forEach((p, i) => {
            const v = p[key];
            if (v == null) return;
            const cmd = started ? 'L' : 'M';
            segs.push(`${cmd}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`);
            started = true;
        });
        return segs.join(' ');
    };

    const p10Path = linePath('p10');
    const p50Path = linePath('p50');
    const p90Path = linePath('p90');

    const rangePath = (() => {
        const upper = points
            .map((p, i) =>
                p.p10 != null
                    ? `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(p.p10).toFixed(1)}`
                    : '',
            )
            .filter(Boolean);
        const lower = [...points]
            .map((p, i) => ({ p, i }))
            .reverse()
            .map(({ p, i }) =>
                p.p90 != null
                    ? `L${xFor(i).toFixed(1)},${yFor(p.p90).toFixed(1)}`
                    : '',
            )
            .filter(Boolean);
        if (upper.length === 0 || lower.length === 0) return '';
        return `${upper.join(' ')} ${lower.join(' ')} Z`;
    })();

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        if (rect.width === 0) return;
        const xPx = ((e.clientX - rect.left) / rect.width) * width;
        // Find nearest point.
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < points.length; i++) {
            const dx = Math.abs(xPx - xFor(i));
            if (dx < bestDist) {
                bestDist = dx;
                bestIdx = i;
            }
        }
        setHoverIdx(bestIdx);
    };

    const hovered = hoverIdx != null ? points[hoverIdx] : null;
    const hoveredX = hoverIdx != null ? xFor(hoverIdx) : null;

    const tooltipLeftPct =
        hoverIdx != null ? (xFor(hoverIdx) / width) * 100 : null;
    const tooltipOnRight = tooltipLeftPct != null && tooltipLeftPct < 50;

    return (
        <div className={styles.predictionChartWrap}>
            <div className={styles.predictionChartInner}>
                <svg
                    ref={svgRef}
                    className={styles.predictionChart}
                    viewBox={`0 0 ${width} ${height}`}
                    preserveAspectRatio="none"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoverIdx(null)}
                >
                    {/* y-axis labels */}
                    <text
                        x={padL - 6}
                        y={yFor(maxBound) + 4}
                        textAnchor="end"
                        className={styles.predictionAxisLabel}
                    >
                        {formatTimeMs(maxBound)}
                    </text>
                    <text
                        x={padL - 6}
                        y={yFor(minBound) + 4}
                        textAnchor="end"
                        className={styles.predictionAxisLabel}
                    >
                        {formatTimeMs(minBound)}
                    </text>

                    {/* x-axis (split count) */}
                    <text
                        x={padL}
                        y={height - 6}
                        className={styles.predictionAxisLabel}
                    >
                        Split 1
                    </text>
                    <text
                        x={width - padR}
                        y={height - 6}
                        textAnchor="end"
                        className={styles.predictionAxisLabel}
                    >
                        Split {points[points.length - 1].splitIndex + 1}
                    </text>

                    {/* PB reference line */}
                    {pb != null && (
                        <>
                            <line
                                x1={padL}
                                x2={width - padR}
                                y1={yFor(pb)}
                                y2={yFor(pb)}
                                className={styles.predictionPbLine}
                            />
                            <text
                                x={width - padR}
                                y={yFor(pb) - 3}
                                textAnchor="end"
                                className={styles.predictionAxisLabel}
                            >
                                PB {formatTimeMs(pb)}
                            </text>
                        </>
                    )}

                    {/* p10–p90 envelope */}
                    {rangePath && (
                        <path
                            d={rangePath}
                            className={styles.predictionRange}
                        />
                    )}

                    {/* p50 dashed line */}
                    {p50Path && (
                        <path d={p50Path} className={styles.predictionMedian} />
                    )}

                    {/* p90 (pessimistic) */}
                    {p90Path && (
                        <path
                            d={p90Path}
                            className={styles.predictionPessimistic}
                        />
                    )}

                    {/* p10 (optimistic) — drawn last so it sits on top */}
                    {p10Path && (
                        <path
                            d={p10Path}
                            className={styles.predictionOptimistic}
                        />
                    )}

                    {/* Hover guide + markers */}
                    {hovered && hoveredX != null && (
                        <>
                            <line
                                x1={hoveredX}
                                x2={hoveredX}
                                y1={padT}
                                y2={height - padB}
                                className={styles.predictionHoverLine}
                            />
                            {hovered.p90 != null && (
                                <circle
                                    cx={hoveredX}
                                    cy={yFor(hovered.p90)}
                                    r={2.5}
                                    className={
                                        styles.predictionHoverDotPessimistic
                                    }
                                />
                            )}
                            {hovered.p50 != null && (
                                <circle
                                    cx={hoveredX}
                                    cy={yFor(hovered.p50)}
                                    r={2.5}
                                    className={styles.predictionHoverDotMedian}
                                />
                            )}
                            <circle
                                cx={hoveredX}
                                cy={yFor(hovered.p10)}
                                r={2.8}
                                className={styles.predictionHoverDotOptimistic}
                            />
                        </>
                    )}
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
                            Split {hovered.splitIndex + 1} — {hovered.splitName}
                        </div>
                        <div className={styles.predictionTooltipRow}>
                            <span
                                className={
                                    styles.predictionLegendSwatchOptimistic
                                }
                            />
                            <span className={styles.predictionTooltipLabel}>
                                p10
                            </span>
                            <span className={styles.predictionTooltipValue}>
                                {formatTimeMs(hovered.p10)}
                            </span>
                        </div>
                        {hovered.p50 != null && (
                            <div className={styles.predictionTooltipRow}>
                                <span
                                    className={
                                        styles.predictionLegendSwatchMedian
                                    }
                                />
                                <span className={styles.predictionTooltipLabel}>
                                    p50
                                </span>
                                <span className={styles.predictionTooltipValue}>
                                    {formatTimeMs(hovered.p50)}
                                </span>
                            </div>
                        )}
                        {hovered.p90 != null && (
                            <div className={styles.predictionTooltipRow}>
                                <span
                                    className={
                                        styles.predictionLegendSwatchPessimistic
                                    }
                                />
                                <span className={styles.predictionTooltipLabel}>
                                    p90
                                </span>
                                <span className={styles.predictionTooltipValue}>
                                    {formatTimeMs(hovered.p90)}
                                </span>
                            </div>
                        )}
                        {pb != null && (
                            <div className={styles.predictionTooltipRow}>
                                <span className={styles.predictionTooltipLabel}>
                                    vs PB
                                </span>
                                <span className={styles.predictionTooltipValue}>
                                    {formatDelta(hovered.p10 - pb).text}
                                </span>
                            </div>
                        )}
                        {currentP10 != null && (
                            <div className={styles.predictionTooltipRow}>
                                <span className={styles.predictionTooltipLabel}>
                                    vs now
                                </span>
                                <span className={styles.predictionTooltipValue}>
                                    {formatDelta(hovered.p10 - currentP10).text}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className={styles.predictionLegend}>
                <span>
                    <span className={styles.predictionLegendSwatchOptimistic} />{' '}
                    p10 (optimistic)
                </span>
                <span>
                    <span className={styles.predictionLegendSwatchMedian} /> p50
                </span>
                <span>
                    <span
                        className={styles.predictionLegendSwatchPessimistic}
                    />{' '}
                    p90
                </span>
                {pb != null && (
                    <span>
                        <span className={styles.predictionLegendSwatchPb} /> PB
                    </span>
                )}
            </div>
        </div>
    );
};

export const PredictionsTab = ({ liveRun }: { liveRun: LiveRun }) => {
    const splits = liveRun.splits ?? [];
    const total = splits.length;
    if (total === 0) return <div className={styles.empty}>No split data.</div>;

    const liveIdx = liveRun.currentSplitIndex;
    const liveSplit = splits[liveIdx];

    const predictedSegment = liveSplit?.predictedSingleTime ?? null;

    const prevCumulative =
        liveIdx === 0 ? 0 : (splits[liveIdx - 1]?.splitTime ?? null);
    const predictedSplitCumulative =
        predictedSegment != null && prevCumulative != null
            ? prevCumulative + predictedSegment
            : null;

    const mc = liveRun.monteCarloPrediction;
    const currentP10 = mc?.percentiles?.p10 ?? null;

    const history: HistoryPoint[] = splits
        .map((s, i) => {
            const p10 = s.monteCarlo?.percentiles?.p10;
            if (p10 == null) return null;
            return {
                splitIndex: i,
                splitName: s.name,
                p10,
                p50: s.monteCarlo?.percentiles?.p50 ?? null,
                p90: s.monteCarlo?.percentiles?.p90 ?? null,
            };
        })
        .filter((p): p is HistoryPoint => p != null);

    return (
        <>
            <div className={styles.sectionTitle}>
                Current predictions
                {liveSplit && (
                    <span className={styles.sectionTitleSub}>
                        {`Split ${liveIdx + 1} — ${liveSplit.name}`}
                    </span>
                )}
            </div>
            <div className={styles.statCardRow}>
                <StatCard
                    label="Segment"
                    value={formatTimeMs(predictedSegment)}
                />
                <StatCard
                    label="Split (cumulative)"
                    value={formatTimeMs(predictedSplitCumulative)}
                />
                <StatCard
                    label="Run finish (p10)"
                    value={formatTimeMs(currentP10)}
                />
            </div>

            <div className={styles.sectionTitle}>
                Prediction history
                <span className={styles.sectionTitleSub}>
                    Projected finish at each completed split
                </span>
            </div>
            {history.length === 0 ? (
                <div className={styles.empty}>
                    No completed splits yet — history will appear after the
                    first split.
                </div>
            ) : (
                <PredictionHistoryChart
                    points={history}
                    pb={liveRun.pb ?? null}
                    currentP10={currentP10}
                />
            )}
        </>
    );
};
