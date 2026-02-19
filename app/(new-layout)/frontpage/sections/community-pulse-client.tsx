'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    FaBolt,
    FaClock,
    FaFlagCheckered,
    FaGamepad,
    FaLayerGroup,
    FaPlay,
    FaTrophy,
    FaUsers,
} from 'react-icons/fa6';
import type { GameWithImage, GlobalStats } from '~src/lib/highlights';
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
    topGames,
}: {
    last24h: Last24h;
    allTime: GlobalStats;
    liveCount: number;
    topGames: GameWithImage[];
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
            <div className={styles.sectionHeader}>Last 24 Hours</div>
            <div className={styles.ticker}>
                <div className={`${styles.cell} ${styles.hero}`}>
                    <span className={styles.number}>
                        {pbs.toLocaleString()}
                    </span>
                    <span className={styles.label}>
                        <FaTrophy size={11} /> Personal Bests
                    </span>
                    <span className={styles.allTime}>
                        {compact.format(allTime.totalPbs)} all time
                    </span>
                </div>
                <div className={styles.cell}>
                    <span className={styles.number}>
                        {runs.toLocaleString()}
                    </span>
                    <span className={styles.label}>
                        <FaFlagCheckered size={11} /> Runs Completed
                    </span>
                    <span className={styles.allTime}>
                        {compact.format(allTime.totalFinishedAttemptCount)} all
                        time
                    </span>
                </div>
                <div className={styles.cell}>
                    <span className={styles.number}>
                        {attempts.toLocaleString()}
                    </span>
                    <span className={styles.label}>
                        <FaBolt size={11} /> Total Attempts
                    </span>
                    <span className={styles.allTime}>
                        {compact.format(allTime.totalAttemptCount)} all time
                    </span>
                </div>
                <div className={styles.cell}>
                    <span className={styles.number}>
                        {hours.toLocaleString()}
                    </span>
                    <span className={styles.label}>
                        <FaClock size={11} /> Hours Played
                    </span>
                    <span className={styles.allTime}>
                        {formatHours(allTime.totalRunTime)} all time
                    </span>
                </div>
            </div>

            <div className={styles.sectionHeader}>All Time</div>
            <div className={styles.allTimeRow}>
                <div className={styles.footer}>
                    <span className={styles.footerChip}>
                        <FaUsers size={12} className={styles.chipIcon} />
                        <span className={styles.chipNumber}>
                            {compact.format(allTime.totalRunners)}
                        </span>
                        <span className={styles.chipLabel}>runners</span>
                    </span>
                    <span className={styles.footerChip}>
                        <FaGamepad size={12} className={styles.chipIcon} />
                        <span className={styles.chipNumber}>
                            {compact.format(allTime.totalGames)}
                        </span>
                        <span className={styles.chipLabel}>games</span>
                    </span>
                    <span className={styles.footerChip}>
                        <FaLayerGroup size={12} className={styles.chipIcon} />
                        <span className={styles.chipNumber}>
                            {compact.format(allTime.totalCategories)}
                        </span>
                        <span className={styles.chipLabel}>categories</span>
                    </span>
                    <span className={styles.footerChip}>
                        <FaPlay size={10} className={styles.chipIcon} />
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
                <div className={styles.topGames}>
                    <div className={styles.topGamesHeader}>
                        <FaTrophy size={11} /> Top Games by Playtime
                    </div>
                    {topGames.map((game, i) => (
                        <div key={game.gameId} className={styles.gameRow}>
                            <span className={styles.gameRank}>{i + 1}</span>
                            {game.gameImage && game.gameImage !== 'noimage' && (
                                <img
                                    src={game.gameImage}
                                    alt=""
                                    className={styles.gameImage}
                                />
                            )}
                            <span className={styles.gameName}>
                                {game.gameDisplay}
                            </span>
                            <span className={styles.gameStats}>
                                <span className={styles.gameStat}>
                                    <FaClock size={9} />
                                    {Math.round(
                                        game.totalRunTime / 3_600_000,
                                    ).toLocaleString()}{' '}
                                    hrs
                                </span>
                                <span className={styles.gameStat}>
                                    <FaBolt size={9} />
                                    {compact.format(game.totalAttemptCount)}
                                </span>
                                <span className={styles.gameStat}>
                                    <FaFlagCheckered size={9} />
                                    {compact.format(
                                        game.totalFinishedAttemptCount,
                                    )}
                                </span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
