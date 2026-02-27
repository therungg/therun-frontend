'use client';

import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FaBolt, FaChevronLeft, FaChevronRight, FaFire } from 'react-icons/fa';
import { DurationToFormatted, FromNow } from '~src/components/util/datetime';
import { getUserDashboardCustomRange } from '~src/lib/user-dashboard';
import type {
    DashboardPb,
    DashboardRace,
    DashboardResponse,
    DashboardSelection,
    DashboardStreak,
    DashboardStreakMilestone,
    PeriodGranularity,
} from '~src/types/dashboard.types';
import styles from './your-stats.module.scss';

interface YourStatsClientProps {
    dashboards: Record<string, DashboardResponse | null>;
    username: string;
}

type ActivityItem =
    | { kind: 'pb'; data: DashboardPb; sortDate: number }
    | { kind: 'race'; data: DashboardRace; sortDate: number };

const GRANULARITIES: PeriodGranularity[] = ['week', 'month', 'year'];
const GRANULARITY_LABELS: Record<PeriodGranularity, string> = {
    week: 'Week',
    month: 'Month',
    year: 'Year',
};

/** Map current granularity to the pre-fetched period key */
const GRANULARITY_TO_PRESET: Record<PeriodGranularity, string> = {
    week: '7d',
    month: '30d',
    year: 'year',
};

function getDateRange(
    granularity: PeriodGranularity,
    offset: number,
): { from: string; to: string; label: string } {
    const now = new Date();
    let start: Date;
    let end: Date;
    let label: string;

    if (granularity === 'week') {
        const day = now.getDay();
        const mondayOffset = day === 0 ? -6 : 1 - day;
        start = new Date(now);
        start.setDate(now.getDate() + mondayOffset + offset * 7);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        const fmt = (d: Date) =>
            d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        label = `${fmt(start)} – ${fmt(end)}`;
    } else if (granularity === 'month') {
        start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
        label = start.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
        });
    } else {
        start = new Date(now.getFullYear() + offset, 0, 1);
        end = new Date(now.getFullYear() + offset, 11, 31);
        label = String(start.getFullYear());
    }

    // Cap end date to today
    if (end > now) end = now;

    const toISO = (d: Date) => d.toISOString().slice(0, 10);
    return { from: toISO(start), to: toISO(end), label };
}

function getPeriodOptions(
    granularity: PeriodGranularity,
    count: number,
): { offset: number; label: string }[] {
    const options: { offset: number; label: string }[] = [];
    for (let i = 0; i >= -count + 1; i--) {
        const { label } = getDateRange(granularity, i);
        options.push({
            offset: i,
            label: i === 0 ? `${label} (current)` : label,
        });
    }
    return options;
}

const DROPDOWN_COUNTS: Record<PeriodGranularity, number> = {
    week: 12,
    month: 12,
    year: 5,
};

function hasValidImage(img: string | null | undefined): img is string {
    return !!img && img !== 'noimage' && img !== '';
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

    if (current === 0) return null;

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
        kind: 'current',
        granularity: 'week',
    });
    const [customFrom, setCustomFrom] = useState('');
    const today = new Date().toISOString().slice(0, 10);
    const [customTo, setCustomTo] = useState(today);
    const [fetchedDashboard, setFetchedDashboard] =
        useState<DashboardResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isCustom = selection.kind === 'custom';
    const isCurrent = selection.kind === 'current';
    const activeGranularity =
        selection.kind !== 'custom' ? selection.granularity : null;

    // For "current" periods, use pre-fetched data. For offset/custom, fetch.
    const dashboard = isCurrent
        ? (dashboards[GRANULARITY_TO_PRESET[selection.granularity]] ?? null)
        : fetchedDashboard;

    const fetchRange = useCallback(
        async (from: string, to?: string) => {
            if (!from) return;
            setLoading(true);
            try {
                const result = await getUserDashboardCustomRange(
                    username,
                    from,
                    to || undefined,
                );
                setFetchedDashboard(result);
            } catch {
                setFetchedDashboard(null);
            } finally {
                setLoading(false);
            }
        },
        [username],
    );

    // Close dropdown on click outside
    useEffect(() => {
        if (!dropdownOpen) return;
        const handler = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node)
            ) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [dropdownOpen]);

    // Fetch when navigating to offset or custom periods
    useEffect(() => {
        if (selection.kind === 'offset') {
            const { from, to } = getDateRange(
                selection.granularity,
                selection.offset,
            );
            fetchRange(from, to);
        } else if (selection.kind === 'custom' && customFrom) {
            fetchRange(customFrom, customTo);
        }
    }, [selection, customFrom, customTo, fetchRange]);

    const selectGranularity = (g: PeriodGranularity) => {
        setSelection({ kind: 'current', granularity: g });
        setFetchedDashboard(null);
        setDropdownOpen(false);
    };

    const navigateOffset = (delta: number) => {
        if (!activeGranularity) return;
        const currentOffset =
            selection.kind === 'offset' ? selection.offset : 0;
        const newOffset = currentOffset + delta;
        if (newOffset === 0) {
            setSelection({ kind: 'current', granularity: activeGranularity });
            setFetchedDashboard(null);
        } else {
            setSelection({
                kind: 'offset',
                granularity: activeGranularity,
                offset: newOffset,
            });
        }
    };

    const jumpToOffset = (offset: number) => {
        if (!activeGranularity) return;
        setDropdownOpen(false);
        if (offset === 0) {
            setSelection({ kind: 'current', granularity: activeGranularity });
            setFetchedDashboard(null);
        } else {
            setSelection({
                kind: 'offset',
                granularity: activeGranularity,
                offset,
            });
        }
    };

    // Period navigation label
    const periodNav =
        activeGranularity && selection.kind === 'offset'
            ? getDateRange(activeGranularity, selection.offset)
            : null;

    const streakData = dashboards['7d']?.streak ?? null;
    const streakMilestoneData = dashboards['7d']?.streakMilestone ?? null;

    const periodToggle = (
        <>
            <div className={styles.periodToggleWrap}>
                <div className={styles.periodToggle}>
                    {GRANULARITIES.map((g) => (
                        <button
                            key={g}
                            type="button"
                            className={clsx(
                                styles.periodButton,
                                !isCustom &&
                                    activeGranularity === g &&
                                    styles.periodButtonActive,
                            )}
                            onClick={() => selectGranularity(g)}
                        >
                            {GRANULARITY_LABELS[g]}
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
                    >
                        Custom
                    </button>
                </div>
            </div>
            {activeGranularity && (
                <div className={styles.periodNavRow} ref={dropdownRef}>
                    <button
                        type="button"
                        className={styles.periodNavArrow}
                        onClick={() => navigateOffset(-1)}
                        aria-label="Previous period"
                    >
                        <FaChevronLeft size={10} />
                    </button>
                    <button
                        type="button"
                        className={styles.periodNavLabel}
                        onClick={() => setDropdownOpen((v) => !v)}
                        aria-expanded={dropdownOpen}
                        aria-haspopup="listbox"
                    >
                        {periodNav
                            ? periodNav.label
                            : `This ${activeGranularity}`}
                    </button>
                    <button
                        type="button"
                        className={styles.periodNavArrow}
                        onClick={() => navigateOffset(1)}
                        disabled={isCurrent}
                        aria-label="Next period"
                    >
                        <FaChevronRight size={10} />
                    </button>
                    {dropdownOpen && (
                        <div className={styles.periodDropdown} role="listbox">
                            {getPeriodOptions(
                                activeGranularity,
                                DROPDOWN_COUNTS[activeGranularity],
                            ).map((opt) => {
                                const currentOffset =
                                    selection.kind === 'offset'
                                        ? selection.offset
                                        : 0;
                                const isActive =
                                    !isCustom && opt.offset === currentOffset;
                                return (
                                    <button
                                        key={opt.offset}
                                        type="button"
                                        role="option"
                                        aria-selected={isActive}
                                        className={clsx(
                                            styles.periodDropdownItem,
                                            isActive &&
                                                styles.periodDropdownItemActive,
                                        )}
                                        onClick={() => jumpToOffset(opt.offset)}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
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
                    streak={streakData}
                    streakMilestone={streakMilestoneData}
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

    if (loading) {
        return (
            <div className={styles.content}>
                <StreakCard
                    streak={streakData}
                    streakMilestone={streakMilestoneData}
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
                    streak={streakData}
                    streakMilestone={streakMilestoneData}
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
    const { stats, streak, topGames, recentPbs, recentRaces, globalStats } =
        dashboard;

    const streakMilestone = dashboard.streakMilestone ?? null;

    const topGame = topGames[0] ?? null;

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

            {/* 3. Core Stats — period + all-time */}
            <div className={styles.statRibbon}>
                <div className={styles.statCell}>
                    <div className={styles.statValue}>
                        <DurationToFormatted duration={stats.playtime} human />
                    </div>
                    <div className={styles.statLabel}>Playtime</div>
                    {globalStats && (
                        <span className={styles.statAllTime}>
                            <DurationToFormatted
                                duration={globalStats.totalRunTime}
                                human
                            />{' '}
                            all-time
                        </span>
                    )}
                </div>
                <div className={styles.statCell}>
                    <div className={styles.statValue}>{stats.totalPbs}</div>
                    <div className={styles.statLabel}>PBs</div>
                </div>
                <div className={styles.statCell}>
                    <div className={styles.statValue}>{stats.finishedRuns}</div>
                    <div className={styles.statLabel}>Runs</div>
                    {globalStats && (
                        <span className={styles.statAllTime}>
                            {formatCompact(
                                globalStats.totalFinishedAttemptCount,
                            )}{' '}
                            all-time
                        </span>
                    )}
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
        </>
    );
}

function formatCompact(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
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
