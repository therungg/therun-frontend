'use client';

import { useEffect, useRef, useState } from 'react';
import type { GlobalStats, PeriodStats, TodayStats } from '~src/lib/highlights';
import styles from './community-pulse.module.scss';

const compact = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
});

function easeOutExpo(t: number): number {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function useCountUp(target: number, duration: number, active: boolean): number {
    const [value, setValue] = useState(0);
    const ran = useRef(false);

    useEffect(() => {
        if (!active || ran.current || target === 0) return;
        ran.current = true;

        const t0 = performance.now();
        const tick = (now: number) => {
            const p = Math.min((now - t0) / duration, 1);
            setValue(Math.round(easeOutExpo(p) * target));
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [active, target, duration]);

    return value;
}

function formatHoursCompact(ms: number): string {
    const hours = ms / 3_600_000;
    if (hours >= 1_000_000) return `${(hours / 1_000_000).toFixed(1)}M`;
    if (hours >= 1_000) return `${(hours / 1_000).toFixed(1)}K`;
    return Math.round(hours).toLocaleString();
}

export const CommunityPulseClient = ({
    globalStats,
    todayStats,
    weekStats,
    prevWeekStats,
}: {
    globalStats: GlobalStats;
    todayStats: TodayStats;
    weekStats: PeriodStats;
    prevWeekStats: PeriodStats;
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    const [weekReady, setWeekReady] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) {
                    setVisible(true);
                    obs.disconnect();
                }
            },
            { threshold: 0.15 },
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    // Delay week count-up to match its CSS stagger
    useEffect(() => {
        if (!visible) return;
        const t = setTimeout(() => setWeekReady(true), 450);
        return () => clearTimeout(t);
    }, [visible]);

    const pbCount = useCountUp(todayStats.pbCount, 1400, visible);
    const runCount = useCountUp(todayStats.runCount, 1600, visible);
    const weekRuns = useCountUp(weekStats.runCount, 1400, weekReady);
    const weekPbs = useCountUp(weekStats.pbCount, 1400, weekReady);

    const pbRate =
        todayStats.runCount > 0 && todayStats.pbCount > 0
            ? Math.round(todayStats.runCount / todayStats.pbCount)
            : null;

    const runsDelta =
        prevWeekStats.runCount > 0
            ? ((weekStats.runCount - prevWeekStats.runCount) /
                  prevWeekStats.runCount) *
              100
            : null;

    const pbsDelta =
        prevWeekStats.pbCount > 0
            ? ((weekStats.pbCount - prevWeekStats.pbCount) /
                  prevWeekStats.pbCount) *
              100
            : null;

    return (
        <div
            ref={ref}
            className={`${styles.pulse} ${visible ? styles.visible : ''}`}
        >
            {/* Today's pulse — the heartbeat */}
            <div className={styles.today}>
                <div className={`${styles.card} ${styles.heroCard}`}>
                    <span className={styles.heroNumber}>
                        {pbCount.toLocaleString()}
                    </span>
                    <span className={styles.cardLabel}>
                        <span className={styles.todayDot} />
                        personal bests today
                    </span>
                </div>
                <div className={styles.card}>
                    <span className={styles.cardNumber}>
                        {runCount.toLocaleString()}
                    </span>
                    <span className={styles.cardLabel}>
                        runs completed today
                    </span>
                </div>
                {pbRate !== null && (
                    <div className={styles.card}>
                        <span className={styles.cardNumber}>
                            1 <span className={styles.rateSep}>in</span>{' '}
                            {pbRate}
                        </span>
                        <span className={styles.cardLabel}>
                            runs is a personal best
                        </span>
                    </div>
                )}
            </div>

            <div className={styles.divider} />

            {/* Weekly momentum */}
            <div className={styles.week}>
                <span className={styles.weekHeader}>this week</span>
                <div className={styles.weekMetrics}>
                    <div className={styles.weekMetric}>
                        <span className={styles.weekNumber}>
                            {weekRuns.toLocaleString()}
                        </span>
                        <span className={styles.weekLabel}>runs</span>
                        {runsDelta !== null && <DeltaBadge value={runsDelta} />}
                    </div>
                    <div className={styles.weekMetric}>
                        <span className={styles.weekNumber}>
                            {weekPbs.toLocaleString()}
                        </span>
                        <span className={styles.weekLabel}>personal bests</span>
                        {pbsDelta !== null && <DeltaBadge value={pbsDelta} />}
                    </div>
                </div>
            </div>

            <div className={styles.divider} />

            {/* All-time — social proof, deemphasized */}
            <div className={styles.allTime}>
                <span className={styles.allTimeStat}>
                    <span className={styles.allTimeValue}>
                        {compact.format(globalStats.totalRunners)}
                    </span>{' '}
                    runners
                </span>
                <span className={styles.dot} />
                <span className={styles.allTimeStat}>
                    <span className={styles.allTimeValue}>
                        {compact.format(globalStats.totalFinishedAttemptCount)}
                    </span>{' '}
                    runs completed
                </span>
                <span className={styles.dot} />
                <span className={styles.allTimeStat}>
                    <span className={styles.allTimeValue}>
                        {formatHoursCompact(globalStats.totalRunTime)}
                    </span>{' '}
                    hours played
                </span>
                <span className={styles.dot} />
                <span className={styles.allTimeStat}>
                    <span className={styles.allTimeValue}>
                        {compact.format(globalStats.totalGames)}
                    </span>{' '}
                    games
                </span>
            </div>
        </div>
    );
};

const DeltaBadge = ({ value }: { value: number }) => {
    const isUp = value >= 0;
    const display = `${isUp ? '+' : ''}${Math.round(value)}%`;
    return (
        <span
            className={`${styles.delta} ${isUp ? styles.deltaUp : styles.deltaDown}`}
        >
            {display}
        </span>
    );
};
