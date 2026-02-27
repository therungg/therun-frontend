'use client';

import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FaBolt, FaFire } from 'react-icons/fa';
import { DurationToFormatted, FromNow } from '~src/components/util/datetime';
import { getUserDashboardCustomRange } from '~src/lib/user-dashboard';
import type {
    DashboardPb,
    DashboardPeriod,
    DashboardRace,
    DashboardResponse,
    DashboardSelection,
    DashboardStreak,
    DashboardStreakMilestone,
} from '~src/types/dashboard.types';
import styles from './your-stats.module.scss';

interface YourStatsClientProps {
    dashboards: Record<string, DashboardResponse | null>;
    username: string;
}

type ActivityItem =
    | { kind: 'pb'; data: DashboardPb; sortDate: number }
    | { kind: 'race'; data: DashboardRace; sortDate: number };

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
    '7d': '7d',
    '30d': '30d',
    year: 'Year',
};

const PERIODS: DashboardPeriod[] = ['7d', '30d', 'year'];

function hasValidImage(img: string | null | undefined): img is string {
    return !!img && img !== 'noimage' && img !== '';
}

function formatDelta(
    current: number,
    previous: number,
): {
    text: string;
    direction: 'up' | 'down' | 'neutral';
} {
    if (!previous || previous === 0) return { text: '-', direction: 'neutral' };
    const pct = ((current - previous) / previous) * 100;
    if (pct === 0) return { text: '-', direction: 'neutral' };
    const rounded =
        Math.abs(pct) >= 100
            ? Math.round(Math.abs(pct))
            : Math.abs(pct).toFixed(0);
    if (pct > 0) return { text: `↑ ${rounded}%`, direction: 'up' };
    return { text: `↓ ${rounded}%`, direction: 'down' };
}

function ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function StreakCard({
    streak,
    streakMilestone,
}: {
    streak: DashboardStreak | null;
    streakMilestone: DashboardStreakMilestone | null;
}) {
    const current = streak?.current ?? 0;
    const allTimeBest = streak?.longest ?? 0;
    const isRecord = current > 0 && current >= allTimeBest;

    if (current === 0) {
        return (
            <div className={clsx(styles.streakCard, styles.streakCardZero)}>
                <div className={styles.streakZeroContent}>
                    <FaFire size={24} className={styles.streakZeroIcon} />
                    <div className={styles.streakZeroHeading}>
                        Start Your Streak
                    </div>
                    <div className={styles.streakZeroText}>
                        Every record starts with Day 1. Complete a run today.
                    </div>
                    <div className={styles.streakZeroBar}>
                        <div className={styles.streakZeroTrack} />
                        <span className={styles.streakZeroLabel}>Day 0</span>
                    </div>
                </div>
            </div>
        );
    }

    // Determine intensity tier
    const ratio = allTimeBest > 0 ? current / allTimeBest : 1;
    const tier: 'normal' | 'hot' | 'nearRecord' | 'record' = isRecord
        ? 'record'
        : streakMilestone?.type === 'near_record' || ratio >= 0.8
          ? 'nearRecord'
          : ratio >= 0.5
            ? 'hot'
            : 'normal';

    // Progress bar percentage — if no all-time best, scale to 30 days
    const progressMax = allTimeBest > 0 ? allTimeBest : 30;
    const progressPct = Math.min((current / progressMax) * 100, 100);

    const cardClass = clsx(
        styles.streakCard,
        tier === 'hot' && styles.streakCardHot,
        tier === 'nearRecord' && styles.streakCardNearRecord,
        tier === 'record' && styles.streakCardRecord,
    );

    const iconClass = clsx(
        styles.streakIcon,
        tier === 'hot' && styles.streakIconHot,
        tier === 'nearRecord' && styles.streakIconNearRecord,
        tier === 'record' && styles.streakIconRecord,
    );

    const fillClass = clsx(
        styles.streakProgressFill,
        tier === 'hot' && styles.streakProgressFillHot,
        tier === 'nearRecord' && styles.streakProgressFillNearRecord,
        tier === 'record' && styles.streakProgressFillRecord,
    );

    const milestoneClass = clsx(
        styles.streakMilestone,
        tier === 'nearRecord' && styles.streakMilestoneNearRecord,
        tier === 'record' && styles.streakMilestoneRecord,
    );

    return (
        <div className={cardClass}>
            {/* Hero number */}
            <div className={styles.streakHero}>
                <FaFire size={22} className={iconClass} />
                <span className={styles.streakNumber}>{current}</span>
                <span className={styles.streakDaysLabel}>
                    {current === 1 ? 'day' : 'days'}
                </span>
            </div>

            {/* Progress bar */}
            <div className={styles.streakProgressWrap}>
                <div className={styles.streakProgressTrack}>
                    <div
                        className={fillClass}
                        style={{ width: `${progressPct}%` }}
                        role="progressbar"
                        aria-valuenow={current}
                        aria-valuemin={0}
                        aria-valuemax={progressMax}
                    />
                </div>
                <div className={styles.streakProgressLabel}>
                    <span>
                        {isRecord
                            ? 'New record!'
                            : allTimeBest > 0
                              ? `${current} of ${allTimeBest} days`
                              : `${current} days`}
                    </span>
                    {allTimeBest > 0 && !isRecord && (
                        <span>Record: {allTimeBest}d</span>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className={styles.streakStats}>
                <div className={styles.streakStat}>
                    <span className={styles.streakStatValue}>{current}</span>
                    <span className={styles.streakStatLabel}>Current</span>
                </div>
                <div className={styles.streakStat}>
                    <span className={styles.streakStatValue}>
                        {allTimeBest}
                    </span>
                    <span className={styles.streakStatLabel}>
                        All-Time Best
                    </span>
                </div>
            </div>

            {/* Milestone message */}
            {isRecord ? (
                <div className={milestoneClass}>
                    <FaBolt size={12} />
                    New all-time record — keep going!
                </div>
            ) : streakMilestone ? (
                <div className={milestoneClass}>
                    <FaBolt size={12} />
                    {streakMilestone.message}
                </div>
            ) : null}
        </div>
    );
}

export const YourStatsClient = ({
    dashboards,
    username,
}: YourStatsClientProps) => {
    const [selection, setSelection] = useState<DashboardSelection>({
        kind: 'preset',
        period: '7d',
    });
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [customDashboard, setCustomDashboard] =
        useState<DashboardResponse | null>(null);
    const [customLoading, setCustomLoading] = useState(false);

    const dashboard =
        selection.kind === 'preset'
            ? (dashboards[selection.period] ?? null)
            : customDashboard;

    const fetchCustom = useCallback(
        async (from: string, to: string) => {
            if (!from) return;
            setCustomLoading(true);
            try {
                const result = await getUserDashboardCustomRange(
                    username,
                    from,
                    to || undefined,
                );
                setCustomDashboard(result);
            } catch {
                setCustomDashboard(null);
            } finally {
                setCustomLoading(false);
            }
        },
        [username],
    );

    useEffect(() => {
        if (selection.kind === 'custom' && customFrom) {
            fetchCustom(customFrom, customTo);
        }
    }, [selection.kind, customFrom, customTo, fetchCustom]);

    const isCustom = selection.kind === 'custom';

    const periodToggle = (
        <>
            <div className={styles.periodToggleWrap}>
                <div className={styles.periodToggle}>
                    {PERIODS.map((p) => (
                        <button
                            key={p}
                            type="button"
                            className={clsx(
                                styles.periodButton,
                                !isCustom &&
                                    selection.kind === 'preset' &&
                                    selection.period === p &&
                                    styles.periodButtonActive,
                            )}
                            onClick={() =>
                                setSelection({ kind: 'preset', period: p })
                            }
                            aria-pressed={
                                selection.kind === 'preset' &&
                                selection.period === p
                            }
                        >
                            {PERIOD_LABELS[p]}
                        </button>
                    ))}
                    <button
                        type="button"
                        className={clsx(
                            styles.periodButton,
                            isCustom && styles.periodButtonActive,
                        )}
                        onClick={() =>
                            setSelection({
                                kind: 'custom',
                                from: customFrom,
                                to: customTo,
                            })
                        }
                        aria-pressed={isCustom}
                    >
                        Custom
                    </button>
                </div>
            </div>
            {isCustom && (
                <div className={styles.datePickerRow}>
                    <input
                        type="date"
                        className={styles.dateInput}
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        max={customTo || undefined}
                    />
                    <span className={styles.datePickerSeparator}>to</span>
                    <input
                        type="date"
                        className={styles.dateInput}
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        min={customFrom || undefined}
                    />
                </div>
            )}
        </>
    );

    if (isCustom && !customFrom) {
        return (
            <div className={styles.content}>
                <StreakCard
                    streak={dashboards['7d']?.streak ?? null}
                    streakMilestone={dashboards['7d']?.streakMilestone ?? null}
                />
                {periodToggle}
                <div className={styles.emptyState}>
                    <div className={styles.emptyStateText}>
                        Select a date range
                    </div>
                    <div className={styles.emptyStateHint}>
                        Pick a start date to view your stats
                    </div>
                </div>
            </div>
        );
    }

    if (isCustom && customLoading) {
        return (
            <div className={styles.content}>
                <StreakCard
                    streak={dashboards['7d']?.streak ?? null}
                    streakMilestone={dashboards['7d']?.streakMilestone ?? null}
                />
                {periodToggle}
                <div className={styles.emptyState}>
                    <div className={styles.emptyStateText}>Loading…</div>
                </div>
            </div>
        );
    }

    if (!dashboard) {
        return (
            <div className={styles.content}>
                <StreakCard
                    streak={dashboards['7d']?.streak ?? null}
                    streakMilestone={dashboards['7d']?.streakMilestone ?? null}
                />
                {periodToggle}
                <div className={styles.emptyState}>
                    <div className={styles.emptyStateText}>
                        No activity in this period
                    </div>
                    <div className={styles.emptyStateHint}>
                        Try selecting a different time range
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.content}>
            <DashboardContent
                dashboard={dashboard}
                username={username}
                periodToggle={periodToggle}
            />
        </div>
    );
};

function DashboardContent({
    dashboard,
    username,
    periodToggle,
}: {
    dashboard: DashboardResponse;
    username: string;
    periodToggle: React.ReactNode;
}) {
    const {
        stats,
        previousStats,
        streak,
        topGames,
        allTimeTopGames,
        recentPbs,
        recentRaces,
        globalStats,
    } = dashboard;

    const streakMilestone = dashboard.streakMilestone ?? null;

    const topGame = topGames[0] ?? null;

    const pbsDelta = formatDelta(stats.totalPbs, previousStats.totalPbs);
    const playtimeDelta = formatDelta(stats.playtime, previousStats.playtime);
    const runsDelta = formatDelta(
        stats.finishedRuns,
        previousStats.finishedRuns,
    );

    const activity: ActivityItem[] = [
        ...recentPbs.map(
            (pb): ActivityItem => ({
                kind: 'pb',
                data: pb,
                sortDate: new Date(pb.endedAt).getTime(),
            }),
        ),
        ...recentRaces.map(
            (race): ActivityItem => ({
                kind: 'race',
                data: race,
                sortDate: race.date,
            }),
        ),
    ]
        .sort((a, b) => b.sortDate - a.sortDate)
        .slice(0, 5);

    return (
        <>
            {/* 1. Streak Card */}
            <StreakCard streak={streak} streakMilestone={streakMilestone} />

            {/* 2. Period Toggle */}
            {periodToggle}

            {/* 3. Core Stats — 3 cells with deltas */}
            <div className={styles.statRibbon}>
                <div className={styles.statCell}>
                    <div className={styles.statValue}>
                        <DurationToFormatted duration={stats.playtime} human />
                    </div>
                    <div className={styles.statLabel}>Playtime</div>
                    <DeltaBadge {...playtimeDelta} />
                </div>
                <div className={styles.statCell}>
                    <div className={styles.statValue}>{stats.totalPbs}</div>
                    <div className={styles.statLabel}>PBs</div>
                    <DeltaBadge {...pbsDelta} />
                </div>
                <div className={styles.statCell}>
                    <div className={styles.statValue}>{stats.finishedRuns}</div>
                    <div className={styles.statLabel}>Runs</div>
                    <DeltaBadge {...runsDelta} />
                </div>
            </div>

            {/* 5. Recent Activity */}
            {activity.length > 0 && (
                <>
                    <div className={styles.sectionLabel}>Recent Activity</div>
                    <div className={styles.activityList}>
                        {activity.map((item) =>
                            item.kind === 'pb' ? (
                                <PbActivityItem
                                    key={`pb-${item.data.game}-${item.sortDate}`}
                                    pb={item.data}
                                    username={username}
                                />
                            ) : (
                                <RaceActivityItem
                                    key={`race-${item.data.game}-${item.sortDate}`}
                                    race={item.data}
                                    username={username}
                                />
                            ),
                        )}
                    </div>
                </>
            )}

            {/* 6. Top Game */}
            {topGame && (
                <>
                    <div className={styles.sectionLabel}>Top Game</div>
                    <Link
                        href={`/${username}/${encodeURIComponent(topGame.gameDisplay)}`}
                        className={styles.topGameCard}
                    >
                        {hasValidImage(topGame.gameImage) && (
                            <Image
                                src={topGame.gameImage}
                                alt={topGame.gameDisplay}
                                width={36}
                                height={48}
                                className={styles.topGameImage}
                                unoptimized
                            />
                        )}
                        <div className={styles.topGameInfo}>
                            <div className={styles.topGameName}>
                                {topGame.gameDisplay}
                            </div>
                            <div className={styles.topGameStats}>
                                <DurationToFormatted
                                    duration={topGame.totalPlaytime}
                                    human
                                />
                                {' · '}
                                {topGame.totalAttempts} attempts
                                {' · '}
                                {topGame.totalPbs} PBs
                            </div>
                        </div>
                    </Link>
                </>
            )}

            {/* 7. All-Time Favorites — ranked list */}
            {allTimeTopGames.length > 0 && (
                <>
                    <div className={styles.sectionLabel}>
                        All-Time Favorites
                    </div>
                    <div className={styles.allTimeList}>
                        {allTimeTopGames.slice(0, 3).map((game, i) => (
                            <Link
                                key={game.gameDisplay}
                                href={`/${username}/${encodeURIComponent(game.gameDisplay)}`}
                                className={styles.allTimeRow}
                            >
                                <span className={styles.allTimeRank}>
                                    {i + 1}
                                </span>
                                {hasValidImage(game.gameImage) && (
                                    <Image
                                        src={game.gameImage}
                                        alt={game.gameDisplay}
                                        width={20}
                                        height={27}
                                        className={styles.allTimeImage}
                                        unoptimized
                                    />
                                )}
                                <span className={styles.allTimeName}>
                                    {game.gameDisplay}
                                </span>
                                <span className={styles.allTimeHours}>
                                    <DurationToFormatted
                                        duration={game.totalRunTime}
                                        human
                                    />
                                </span>
                            </Link>
                        ))}
                    </div>
                </>
            )}

            {/* 8. Global Stats Footer */}
            {globalStats &&
                (globalStats.totalGames > 0 ||
                    globalStats.totalCategories > 0) && (
                    <div className={styles.globalFooter}>
                        {globalStats.totalGames} games ·{' '}
                        {globalStats.totalCategories} categories ·{' '}
                        {formatCompact(globalStats.totalFinishedAttemptCount)}{' '}
                        runs
                    </div>
                )}
        </>
    );
}

function formatCompact(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
}

function DeltaBadge({
    text,
    direction,
}: {
    text: string;
    direction: 'up' | 'down' | 'neutral';
}) {
    return (
        <span
            className={clsx(
                direction === 'up' && styles.deltaUp,
                direction === 'down' && styles.deltaDown,
                direction === 'neutral' && styles.deltaNeutral,
            )}
        >
            {text}
        </span>
    );
}

function PbActivityItem({
    pb,
    username,
}: {
    pb: DashboardPb;
    username: string;
}) {
    const improvementMs =
        pb.previousPb != null ? pb.previousPb - pb.time : null;

    return (
        <Link
            href={`/${username}/${encodeURIComponent(pb.game)}`}
            className={styles.activityItem}
        >
            {hasValidImage(pb.gameImage) ? (
                <Image
                    src={pb.gameImage}
                    alt={pb.game}
                    width={20}
                    height={27}
                    className={styles.activityImage}
                    unoptimized
                />
            ) : (
                <div className={styles.activityImagePlaceholder} />
            )}
            <div className={styles.activityInfo}>
                <div className={styles.activityGame}>{pb.game}</div>
                <div className={styles.activityCategory}>{pb.category}</div>
            </div>
            <div className={styles.activityRight}>
                <span className={styles.activityTime}>
                    <DurationToFormatted duration={pb.time} withMillis />
                </span>
                {improvementMs != null && improvementMs > 0 && (
                    <span className={styles.pbDelta}>
                        -
                        <DurationToFormatted
                            duration={improvementMs}
                            withMillis
                        />
                    </span>
                )}
                <span className={styles.activityTimestamp}>
                    <FromNow time={new Date(pb.endedAt)} />
                </span>
            </div>
        </Link>
    );
}

function RaceActivityItem({
    race,
    username,
}: {
    race: DashboardRace;
    username: string;
}) {
    const ratingChange = race.ratingAfter - race.ratingBefore;

    const placementColor =
        race.position === 1
            ? 'gold'
            : race.position === 2
              ? 'silver'
              : race.position === 3
                ? 'bronze'
                : 'default';

    return (
        <Link
            href={`/${username}/${encodeURIComponent(race.game)}`}
            className={styles.activityItem}
        >
            {hasValidImage(race.gameImage) ? (
                <Image
                    src={race.gameImage}
                    alt={race.game}
                    width={20}
                    height={27}
                    className={styles.activityImage}
                    unoptimized
                />
            ) : (
                <div className={styles.activityImagePlaceholder} />
            )}
            <div className={styles.activityInfo}>
                <div className={styles.activityGame}>{race.game}</div>
                <div className={styles.activityCategory}>{race.category}</div>
            </div>
            <div className={styles.activityRight}>
                <span
                    className={clsx(
                        styles.placementBadge,
                        styles[
                            `placement${placementColor.charAt(0).toUpperCase() + placementColor.slice(1)}` as keyof typeof styles
                        ],
                    )}
                >
                    {ordinal(race.position)}
                </span>
                {ratingChange !== 0 && (
                    <span
                        className={
                            ratingChange > 0
                                ? styles.ratingUp
                                : styles.ratingDown
                        }
                    >
                        {ratingChange > 0 ? '+' : ''}
                        {ratingChange}
                    </span>
                )}
                <span className={styles.activityTimestamp}>
                    <FromNow time={new Date(race.date)} />
                </span>
            </div>
        </Link>
    );
}
