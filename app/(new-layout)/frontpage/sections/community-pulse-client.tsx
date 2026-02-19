'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GlobalStats } from '~src/lib/highlights';
import styles from './community-pulse.module.scss';

const compact = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
});

function formatHours(ms: number): string {
    const hours = ms / 3_600_000;
    if (hours >= 1_000_000) return `${(hours / 1_000_000).toFixed(1)}M`;
    if (hours >= 1_000) return `${(hours / 1_000).toFixed(1)}K`;
    return Math.round(hours).toLocaleString();
}

function easeOutExpo(t: number): number {
    return t === 1 ? 1 : 1 - 2 ** (-10 * t);
}

function useCountUp(target: number, duration = 1400, active = false): number {
    const [value, setValue] = useState(0);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        if (!active) return;
        const start = performance.now();
        const tick = (now: number) => {
            const elapsed = Math.min((now - start) / duration, 1);
            setValue(Math.round(easeOutExpo(elapsed) * target));
            if (elapsed < 1) {
                frameRef.current = requestAnimationFrame(tick);
            }
        };
        frameRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameRef.current);
    }, [active, target, duration]);

    return active ? value : 0;
}

interface Last24h {
    pbs: number;
    runs: number;
    attempts: number;
    playtimeMs: number;
}

export const CommunityPulseClient = ({
    last24h,
    allTime,
    liveCount,
}: {
    last24h: Last24h;
    allTime: GlobalStats;
    liveCount: number;
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    const onIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
        if (entries[0].isIntersecting) setVisible(true);
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(onIntersect, { threshold: 0.2 });
        obs.observe(el);
        return () => obs.disconnect();
    }, [onIntersect]);

    const pbs = useCountUp(last24h.pbs, 1400, visible);
    const runs = useCountUp(last24h.runs, 1400, visible);
    const attempts = useCountUp(last24h.attempts, 1400, visible);
    const hours = useCountUp(
        Math.round(last24h.playtimeMs / 3_600_000),
        1400,
        visible,
    );

    return (
        <div ref={ref} className={styles.content}>
            <div className={styles.ticker}>
                <div className={`${styles.cell} ${styles.hero}`}>
                    <span className={styles.number}>
                        {pbs.toLocaleString()}
                    </span>
                    <span className={styles.label}>Personal Bests</span>
                    <span className={styles.allTime}>
                        {compact.format(allTime.totalPbs)} all time
                    </span>
                </div>
                <div className={styles.cell}>
                    <span className={styles.number}>
                        {runs.toLocaleString()}
                    </span>
                    <span className={styles.label}>Runs Completed</span>
                    <span className={styles.allTime}>
                        {compact.format(allTime.totalFinishedAttemptCount)} all
                        time
                    </span>
                </div>
                <div className={styles.cell}>
                    <span className={styles.number}>
                        {attempts.toLocaleString()}
                    </span>
                    <span className={styles.label}>Total Attempts</span>
                    <span className={styles.allTime}>
                        {compact.format(allTime.totalAttemptCount)} all time
                    </span>
                </div>
                <div className={styles.cell}>
                    <span className={styles.number}>
                        {hours.toLocaleString()}
                    </span>
                    <span className={styles.label}>Hours Played</span>
                    <span className={styles.allTime}>
                        {formatHours(allTime.totalRunTime)} all time
                    </span>
                </div>
            </div>

            <div className={styles.footer}>
                <span className={styles.footerChip}>
                    <span className={styles.chipNumber}>
                        {compact.format(allTime.totalRunners)}
                    </span>
                    <span className={styles.chipLabel}>runners</span>
                </span>
                <span className={styles.footerChip}>
                    <span className={styles.chipNumber}>
                        {compact.format(allTime.totalGames)}
                    </span>
                    <span className={styles.chipLabel}>games</span>
                </span>
                <span className={styles.footerChip}>
                    <span className={styles.chipNumber}>
                        {compact.format(allTime.totalCategories)}
                    </span>
                    <span className={styles.chipLabel}>categories</span>
                </span>
                <span className={styles.footerChip}>
                    <span className={styles.chipNumber}>
                        {compact.format(allTime.totalRaces)}
                    </span>
                    <span className={styles.chipLabel}>races</span>
                </span>
                <span className={styles.liveChip}>
                    <span className={styles.liveDot} />
                    <span className={styles.chipNumber}>{liveCount}</span>
                    <span className={styles.chipLabel}>live</span>
                </span>
            </div>
        </div>
    );
};
