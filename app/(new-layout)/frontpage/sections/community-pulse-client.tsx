'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { GameWithImage, GlobalStats } from '~src/lib/highlights';
import styles from './community-pulse.module.scss';

const compact = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
});

const compactPrecise = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 2,
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

export interface StatDeltas {
    runners: number;
    attempts: number;
    finished: number;
    hours: number;
}

function formatPlaytime(ms: number): string {
    const hours = ms / 3_600_000;
    if (hours >= 1_000_000) {
        return `${(hours / 1_000_000).toFixed(2)}M hours`;
    }
    return `${Math.round(hours).toLocaleString()} hours`;
}

export const CommunityPulseClient = ({
    globalStats,
    deltas,
    topGames,
}: {
    globalStats: GlobalStats;
    deltas: StatDeltas;
    topGames: GameWithImage[];
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
            { threshold: 0.2 },
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    const totalHours = Math.round(globalStats.totalRunTime / 3_600_000);

    const runners = useCountUp(globalStats.totalRunners, 1800, visible);
    const attempts = useCountUp(globalStats.totalAttemptCount, 1800, visible);
    const runs = useCountUp(
        globalStats.totalFinishedAttemptCount,
        1800,
        visible,
    );
    const hours = useCountUp(totalHours, 1800, visible);

    return (
        <div
            ref={ref}
            className={`${styles.pulse} ${visible ? styles.pulseVisible : ''}`}
        >
            {/* Main stats row */}
            <div className={styles.milestones}>
                <div className={styles.milestone}>
                    <span className={styles.number}>
                        {compact.format(runners)}
                    </span>
                    <span className={styles.label}>runners</span>
                    <DeltaPill value={deltas.runners} />
                </div>
                <div className={styles.milestone}>
                    <span className={styles.number}>
                        {compact.format(attempts)}
                    </span>
                    <span className={styles.label}>runs started</span>
                    <DeltaPill value={deltas.attempts} />
                </div>
                <div className={styles.milestone}>
                    <span className={styles.number}>
                        {compact.format(runs)}
                    </span>
                    <span className={styles.label}>runs completed</span>
                    <DeltaPill value={deltas.finished} />
                </div>
                <div className={styles.milestone}>
                    <span className={styles.number}>
                        {compact.format(hours)}
                    </span>
                    <span className={styles.label}>hours played</span>
                    <DeltaPill value={deltas.hours} />
                </div>
            </div>

            {/* Platform stats */}
            <div className={styles.platformStrip}>
                <span className={styles.platformStat}>
                    <span className={styles.platformValue}>
                        {compact.format(globalStats.totalGames)}
                    </span>{' '}
                    games
                </span>
                <span className={styles.platformDivider} />
                <span className={styles.platformStat}>
                    <span className={styles.platformValue}>
                        {compact.format(globalStats.totalCategories)}
                    </span>{' '}
                    categories
                </span>
            </div>

            {/* Top games */}
            {topGames.length > 0 && (
                <div className={styles.topGames}>
                    {topGames.map((game) => {
                        const hasImage =
                            game.gameImage &&
                            game.gameImage !== 'noimage' &&
                            game.gameImage !== '';
                        return (
                            <div key={game.gameId} className={styles.gameCard}>
                                <div className={styles.gameHeader}>
                                    {hasImage && (
                                        <div className={styles.gameImageWrap}>
                                            <Image
                                                src={game.gameImage}
                                                alt={game.gameDisplay}
                                                fill
                                                style={{ objectFit: 'cover' }}
                                                unoptimized
                                            />
                                        </div>
                                    )}
                                    <div className={styles.gameInfo}>
                                        <span className={styles.gameTitle}>
                                            {game.gameDisplay}
                                        </span>
                                        <div className={styles.gameStatRow}>
                                            <span className={styles.gameStat}>
                                                <span
                                                    className={
                                                        styles.gameStatValue
                                                    }
                                                >
                                                    {compactPrecise.format(
                                                        game.uniqueRunners,
                                                    )}
                                                </span>{' '}
                                                runners
                                            </span>
                                            <span className={styles.gameStat}>
                                                <span
                                                    className={
                                                        styles.gameStatValue
                                                    }
                                                >
                                                    {compactPrecise.format(
                                                        game.totalAttemptCount,
                                                    )}
                                                </span>{' '}
                                                attempts
                                            </span>
                                            <span className={styles.gameStat}>
                                                <span
                                                    className={
                                                        styles.gameStatValue
                                                    }
                                                >
                                                    {compactPrecise.format(
                                                        game.totalFinishedAttemptCount,
                                                    )}
                                                </span>{' '}
                                                finished
                                            </span>
                                            <span className={styles.gameStat}>
                                                <span
                                                    className={
                                                        styles.gameStatValue
                                                    }
                                                >
                                                    {formatPlaytime(
                                                        game.totalRunTime,
                                                    )}
                                                </span>{' '}
                                                played
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const DeltaPill = ({ value }: { value: number }) => {
    if (value <= 0) return null;
    return (
        <span className={styles.delta}>
            <span className={styles.deltaArrow}>&#9650;</span>
            {compact.format(value)} today
        </span>
    );
};
