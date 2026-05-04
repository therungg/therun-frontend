'use client';

import clsx from 'clsx';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import styles from '../commentary-drawer.module.scss';
import { formatDelta, formatTimeMs } from '../format';

const Row = ({
    label,
    value,
    toneClass,
}: {
    label: string;
    value: string;
    toneClass?: string;
}) => (
    <div className={styles.statRow}>
        <span className={styles.statLabel}>{label}</span>
        <span className={clsx(styles.statValue, toneClass)}>{value}</span>
    </div>
);

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
    const projectedTone = formatDelta(projectedDelta);

    return (
        <>
            <div className={styles.sectionTitle}>Projection</div>
            <Row label="PB" value={formatTimeMs(liveRun.pb)} />
            <Row label="SOB" value={formatTimeMs(liveRun.sob)} />
            <Row
                label="Best possible"
                value={formatTimeMs(liveRun.bestPossible)}
            />
            {mc ? (
                <>
                    <Row
                        label="Projected finish"
                        value={formatTimeMs(mc.bestEstimate)}
                    />
                    <Row
                        label="vs PB"
                        value={projectedTone.text}
                        toneClass={
                            projectedTone.tone === 'ahead'
                                ? styles.toneAhead
                                : projectedTone.tone === 'behind'
                                  ? styles.toneBehind
                                  : styles.toneNeutral
                        }
                    />
                    <Row label="p10" value={formatTimeMs(mc.percentiles.p10)} />
                    <Row label="p25" value={formatTimeMs(mc.percentiles.p25)} />
                    <Row label="p50" value={formatTimeMs(mc.percentiles.p50)} />
                    <Row label="p75" value={formatTimeMs(mc.percentiles.p75)} />
                    <Row label="p90" value={formatTimeMs(mc.percentiles.p90)} />
                    <Row
                        label="CI low"
                        value={formatTimeMs(mc.confidenceInterval.lower)}
                    />
                    <Row
                        label="CI high"
                        value={formatTimeMs(mc.confidenceInterval.upper)}
                    />
                </>
            ) : (
                <div className={styles.empty}>No projection yet.</div>
            )}

            <div className={styles.sectionTitle}>Per-split deltas</div>
            {liveRun.splits.slice(0, liveRun.currentSplitIndex).map((s, i) => {
                const d =
                    s.splitTime != null && s.pbSplitTime != null
                        ? s.splitTime - s.pbSplitTime
                        : null;
                const fd = formatDelta(d);
                return (
                    <Row
                        key={i}
                        label={`${i === selectedIndex ? '▶ ' : ''}${s.name}`}
                        value={fd.text}
                        toneClass={
                            fd.tone === 'ahead'
                                ? styles.toneAhead
                                : fd.tone === 'behind'
                                  ? styles.toneBehind
                                  : styles.toneNeutral
                        }
                    />
                );
            })}
        </>
    );
};
