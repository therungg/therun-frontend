'use client';

import clsx from 'clsx';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import styles from '../commentary-drawer.module.scss';
import { formatDelta, formatTimeMs } from '../format';

const StatCard = ({ label, value }: { label: string; value: string }) => (
    <div className={styles.statCard}>
        <span className={styles.statCardLabel}>{label}</span>
        <span className={styles.statCardValue}>{value}</span>
    </div>
);

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
                <StatCard label="PB" value={formatTimeMs(liveRun.pb)} />
                <StatCard label="SOB" value={formatTimeMs(liveRun.sob)} />
                <StatCard
                    label="Best possible"
                    value={formatTimeMs(liveRun.bestPossible)}
                />
            </div>

            {mc != null && (
                <>
                    <div className={styles.sectionTitle}>Distribution</div>
                    <div
                        className={clsx(
                            styles.statCardRow,
                            styles.statCardRow2,
                        )}
                    >
                        <StatCard
                            label="p25"
                            value={formatTimeMs(mc.percentiles.p25)}
                        />
                        <StatCard
                            label="p75"
                            value={formatTimeMs(mc.percentiles.p75)}
                        />
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
