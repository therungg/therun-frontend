'use client';

import clsx from 'clsx';
import Image from 'next/image';
import { useState } from 'react';
import { DurationToFormatted, FromNow } from '~src/components/util/datetime';
import { UserSummary } from '~src/types/summary.types';
import styles from './your-stats.module.scss';

interface GameData {
    image?: string;
    display?: string;
}

interface YourStatsClientProps {
    weekStats?: UserSummary;
    monthStats?: UserSummary;
    gameDataMap: Record<string, unknown>;
}

export const YourStatsClient = ({
    weekStats,
    monthStats,
    gameDataMap,
}: YourStatsClientProps) => {
    const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>(
        'week',
    );

    const stats = selectedPeriod === 'week' ? weekStats : monthStats;
    const games = gameDataMap as Record<string, GameData>;

    if (!stats) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyStateText}>
                    No data for this period yet
                </div>
                <div className={styles.emptyStateHint}>
                    Start running to see your stats here!
                </div>
            </div>
        );
    }

    const pbCount = stats.finishedRuns.filter(
        (r) => r.time !== undefined,
    ).length;
    const finishRate =
        stats.totalRuns > 0
            ? `${((stats.totalFinishedRuns / stats.totalRuns) * 100).toFixed(0)}%`
            : '0%';

    const recentRuns = [...stats.finishedRuns]
        .sort((a, b) => b.date - a.date)
        .slice(0, 5);

    return (
        <>
            {/* Period Toggle */}
            <div className="d-flex justify-content-center">
                <div className={styles.periodToggle}>
                    <button
                        type="button"
                        className={clsx(
                            styles.periodButton,
                            selectedPeriod === 'week' &&
                                styles.periodButtonActive,
                        )}
                        onClick={() => setSelectedPeriod('week')}
                    >
                        Week
                    </button>
                    <button
                        type="button"
                        className={clsx(
                            styles.periodButton,
                            selectedPeriod === 'month' &&
                                styles.periodButtonActive,
                        )}
                        onClick={() => setSelectedPeriod('month')}
                    >
                        Month
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statValue}>
                        <DurationToFormatted
                            duration={stats.totalPlaytime}
                            human
                        />
                    </div>
                    <div className={styles.statLabel}>Playtime</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statValue}>
                        {stats.totalFinishedRuns}
                        <span
                            style={{
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                opacity: 0.5,
                            }}
                        >
                            /{stats.totalRuns}
                        </span>
                    </div>
                    <div className={styles.statLabel}>Completed</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statValue}>{pbCount}</div>
                    <div className={styles.statLabel}>PBs Set</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statValue}>{finishRate}</div>
                    <div className={styles.statLabel}>Finish Rate</div>
                </div>
            </div>

            {/* Recent Runs */}
            {recentRuns.length > 0 && (
                <>
                    <div className={styles.recentRunsHeader}>Recent Runs</div>
                    <div className={styles.recentRunsList}>
                        {recentRuns.map((run) => {
                            const gameData = games[run.game];
                            const hasImage =
                                gameData?.image && gameData.image !== 'noimage';
                            const displayName = gameData?.display ?? run.game;
                            const isPb = run.time !== undefined;

                            return (
                                <div
                                    key={`${run.game}-${run.date}`}
                                    className={styles.recentRunItem}
                                >
                                    {hasImage ? (
                                        <Image
                                            src={gameData.image!}
                                            alt={displayName}
                                            width={20}
                                            height={20}
                                            className={styles.runGameImage}
                                            unoptimized
                                        />
                                    ) : (
                                        <div
                                            className={
                                                styles.runGameImagePlaceholder
                                            }
                                        />
                                    )}
                                    <div className={styles.runInfo}>
                                        <div className={styles.runGame}>
                                            {displayName}
                                        </div>
                                        <div className={styles.runCategory}>
                                            {run.category}
                                        </div>
                                    </div>
                                    <div className={styles.runTime}>
                                        <DurationToFormatted
                                            duration={run.duration}
                                        />
                                    </div>
                                    {isPb && (
                                        <span className={styles.pbBadge}>
                                            PB!
                                        </span>
                                    )}
                                    <span className={styles.runTimestamp}>
                                        <FromNow time={new Date(run.date)} />
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </>
    );
};
