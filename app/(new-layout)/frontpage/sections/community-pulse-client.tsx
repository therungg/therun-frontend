'use client';

import clsx from 'clsx';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { GlobalStats, PeriodStats } from '~src/lib/highlights';
import styles from './community-pulse.module.scss';

const LiveCountChart = dynamic(() =>
    import('../panels/live-count-panel/live-count-chart').then(
        (mod) => mod.LiveCountChart,
    ),
);

interface LiveCountDataPoint {
    count: number;
    timestamp: number;
}

type Period = 'day' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
    day: 'Today',
    week: 'This Week',
    month: 'This Month',
};

const compactNumber = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
});

function calcDelta(current: number, previous: number): number | null {
    if (previous === 0) return null;
    return Math.round(((current - previous) / previous) * 100);
}

export const CommunityPulseClient = ({
    globalStats,
    periodStats,
    prevPeriodStats,
    countHistory,
    liveCount,
}: {
    globalStats: GlobalStats;
    periodStats: Record<Period, PeriodStats>;
    prevPeriodStats: Record<Period, PeriodStats>;
    countHistory: LiveCountDataPoint[];
    liveCount: number;
}) => {
    const [selectedPeriod, setSelectedPeriod] = useState<Period>('day');

    const current = periodStats[selectedPeriod];
    const previous = prevPeriodStats[selectedPeriod];

    const runsDelta = calcDelta(current.runCount, previous.runCount);
    const pbsDelta = calcDelta(current.pbCount, previous.pbCount);

    const totalHours = Math.round(globalStats.totalRunTime / 3_600_000);

    return (
        <div className={styles.pulseContainer}>
            {/* Header */}
            <div className={styles.header}>
                <h2 className={styles.title}>Community Pulse</h2>
                <div className={styles.toggleGroup}>
                    {(['day', 'week', 'month'] as Period[]).map((period) => (
                        <button
                            type="button"
                            key={period}
                            className={clsx(
                                styles.toggleBtn,
                                selectedPeriod === period &&
                                    styles.toggleBtnActive,
                            )}
                            onClick={() => setSelectedPeriod(period)}
                        >
                            {PERIOD_LABELS[period]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stat cards */}
            <div className={styles.statsRow}>
                {/* Live now — always shows */}
                <div className={styles.statCard}>
                    <div className={styles.statNumber}>
                        <span className={styles.liveDot} />
                        {liveCount.toLocaleString()}
                    </div>
                    <div className={styles.statLabel}>live now</div>
                </div>

                {/* Runs */}
                <div className={styles.statCard}>
                    <div className={styles.statNumber}>
                        {current.runCount.toLocaleString()}
                    </div>
                    <div className={styles.statLabel}>
                        runs {PERIOD_LABELS[selectedPeriod].toLowerCase()}
                    </div>
                    <DeltaBadge value={runsDelta} />
                </div>

                {/* PBs */}
                <div className={styles.statCard}>
                    <div className={styles.statNumber}>
                        {current.pbCount.toLocaleString()}
                    </div>
                    <div className={styles.statLabel}>
                        PBs {PERIOD_LABELS[selectedPeriod].toLowerCase()}
                    </div>
                    <DeltaBadge value={pbsDelta} />
                </div>
            </div>

            {/* Activity chart */}
            <div className={styles.chartWrapper}>
                <LiveCountChart data={countHistory} />
            </div>

            {/* All-time totals */}
            <div className={styles.allTimeRow}>
                <span>
                    {compactNumber.format(globalStats.totalRunners)} runners
                </span>
                <span className={styles.allTimeSeparator}>&middot;</span>
                <span>
                    {compactNumber.format(
                        globalStats.totalFinishedAttemptCount,
                    )}{' '}
                    runs completed
                </span>
                <span className={styles.allTimeSeparator}>&middot;</span>
                <span>{compactNumber.format(totalHours)} hours played</span>
            </div>
        </div>
    );
};

const DeltaBadge = ({ value }: { value: number | null }) => {
    if (value === null) return null;

    const isPositive = value >= 0;
    return (
        <div
            className={clsx(
                styles.delta,
                isPositive ? styles.deltaPositive : styles.deltaNegative,
            )}
        >
            {isPositive ? '\u25B2' : '\u25BC'} {Math.abs(value)}%
        </div>
    );
};
