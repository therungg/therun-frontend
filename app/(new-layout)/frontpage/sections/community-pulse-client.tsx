'use client';

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
    return (
        <div className={styles.content}>
            <div className={styles.grid}>
                <div className={`${styles.stat} ${styles.hero}`}>
                    <span className={styles.number}>
                        {last24h.pbs.toLocaleString()}
                    </span>
                    <span className={styles.label}>personal bests</span>
                    <span className={styles.total}>
                        {compact.format(allTime.totalPbs)} all time
                    </span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.number}>
                        {last24h.runs.toLocaleString()}
                    </span>
                    <span className={styles.label}>runs completed</span>
                    <span className={styles.total}>
                        {compact.format(allTime.totalFinishedAttemptCount)} all
                        time
                    </span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.number}>
                        {Math.round(
                            last24h.hoursMs / 3_600_000,
                        ).toLocaleString()}
                    </span>
                    <span className={styles.label}>hours played</span>
                    <span className={styles.total}>
                        {formatHours(allTime.totalRunTime)} all time
                    </span>
                </div>
            </div>

            <div className={styles.footer}>
                <span className={styles.footerStat}>
                    <strong>{compact.format(allTime.totalRunners)}</strong>{' '}
                    runners
                </span>
                <span className={styles.dot} />
                <span className={styles.footerStat}>
                    <strong>{compact.format(allTime.totalGames)}</strong> games
                </span>
                <span className={styles.dot} />
                <span className={styles.footerStat}>
                    <strong>{compact.format(allTime.totalCategories)}</strong>{' '}
                    categories
                </span>
                <span className={styles.dot} />
                <span className={styles.footerStat}>
                    <strong>{liveCount}</strong>{' '}
                    <span className={styles.liveDot} /> live
                </span>
            </div>
        </div>
    );
};
