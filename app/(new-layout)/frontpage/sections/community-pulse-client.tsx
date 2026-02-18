'use client';

import { useEffect, useRef, useState } from 'react';
import type { GlobalStats } from '~src/lib/highlights';
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

function formatHours(ms: number): string {
    const hours = ms / 3_600_000;
    if (hours >= 1_000_000) return `${(hours / 1_000_000).toFixed(1)}M`;
    if (hours >= 1_000) return `${(hours / 1_000).toFixed(1)}K`;
    return Math.round(hours).toLocaleString();
}

interface Last24h {
    pbs: number;
    runs: number;
    hoursMs: number;
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

    const pbs = useCountUp(last24h.pbs, 1400, visible);
    const runs = useCountUp(last24h.runs, 1600, visible);
    const hours = useCountUp(
        Math.round(last24h.hoursMs / 3_600_000),
        1400,
        visible,
    );

    return (
        <div
            ref={ref}
            className={`${styles.pulse} ${visible ? styles.visible : ''}`}
        >
            {/* Top tier — The Pulse: 24h activity */}
            <div className={styles.pulseGrid}>
                <div className={`${styles.cell} ${styles.heroCell}`}>
                    <span className={styles.bigNumber}>
                        {pbs.toLocaleString()}
                    </span>
                    <span className={styles.cellLabel}>personal bests</span>
                    <span className={styles.allTimeLabel}>
                        {compact.format(allTime.totalPbs)} all time
                    </span>
                </div>
                <div className={styles.cell}>
                    <span className={styles.bigNumber}>
                        {runs.toLocaleString()}
                    </span>
                    <span className={styles.cellLabel}>runs completed</span>
                    <span className={styles.allTimeLabel}>
                        {compact.format(allTime.totalFinishedAttemptCount)} all
                        time
                    </span>
                </div>
                <div className={styles.cell}>
                    <span className={styles.bigNumber}>
                        {hours.toLocaleString()}
                    </span>
                    <span className={styles.cellLabel}>hours played</span>
                    <span className={styles.allTimeLabel}>
                        {formatHours(allTime.totalRunTime)} all time
                    </span>
                </div>
            </div>

            <div className={styles.pulseTag}>
                <span className={styles.pulseDot} />
                last 24 hours
            </div>

            {/* Bottom tier — The Scale: all-time totals */}
            <div className={styles.scale}>
                <span className={styles.scaleStat}>
                    <span className={styles.scaleValue}>
                        {compact.format(allTime.totalRunners)}
                    </span>{' '}
                    runners
                </span>
                <span className={styles.dot} />
                <span className={styles.scaleStat}>
                    <span className={styles.scaleValue}>
                        {compact.format(allTime.totalGames)}
                    </span>{' '}
                    games
                </span>
                <span className={styles.dot} />
                <span className={styles.scaleStat}>
                    <span className={styles.scaleValue}>
                        {compact.format(allTime.totalCategories)}
                    </span>{' '}
                    categories
                </span>
                <span className={styles.dot} />
                <span className={styles.scaleStat}>
                    <span className={styles.scaleValue}>{liveCount}</span>{' '}
                    <span className={styles.liveDot} />
                    live now
                </span>
            </div>
        </div>
    );
};
