'use client';

import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FaBolt, FaChevronLeft, FaChevronRight, FaFire } from 'react-icons/fa';
import { DurationToFormatted, FromNow } from '~src/components/util/datetime';
import { getUserDashboardCustomRange } from '~src/lib/user-dashboard';
import type {
    DashboardProminentRun,
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
    picture?: string;
}

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
        const thisYear = now.getFullYear();
        const showYear =
            start.getFullYear() !== thisYear || end.getFullYear() !== thisYear;
        const fmt = (d: Date) =>
            d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                ...(showYear && { year: 'numeric' }),
            });
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

/** Convert an arbitrary date to the offset for the period containing it. */
function dateToOffset(granularity: PeriodGranularity, date: Date): number {
    const now = new Date();
    if (granularity === 'week') {
        // Get Monday of the target week and Monday of the current week
        const getMonday = (d: Date) => {
            const copy = new Date(d);
            const day = copy.getDay();
            copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1));
            copy.setHours(0, 0, 0, 0);
            return copy;
        };
        const targetMonday = getMonday(date);
        const currentMonday = getMonday(now);
        const diffMs = targetMonday.getTime() - currentMonday.getTime();
        return Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
    } else if (granularity === 'month') {
        return (
            (date.getFullYear() - now.getFullYear()) * 12 +
            (date.getMonth() - now.getMonth())
        );
    } else {
        return date.getFullYear() - now.getFullYear();
    }
}

function hasValidImage(img: string | null | undefined): img is string {
    return !!img && img !== 'noimage' && img !== '';
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 90, 180, 365];

const MILESTONE_LABELS: Record<number, string> = {
    3: '3 days',
    7: '1 week',
    14: '2 weeks',
    30: '1 month',
    60: '2 months',
    90: '3 months',
    180: '6 months',
    365: '1 year',
};

function getNextMilestone(current: number): {
    target: number;
    label: string;
    remaining: number;
} {
    for (const m of STREAK_MILESTONES) {
        if (current < m) {
            return {
                target: m,
                label: MILESTONE_LABELS[m],
                remaining: m - current,
            };
        }
    }
    // Past all milestones — next target is next multiple of 365
    const nextYear = Math.ceil((current + 1) / 365) * 365;
    return {
        target: nextYear,
        label: `${nextYear / 365} years`,
        remaining: nextYear - current,
    };
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

    const milestone = getNextMilestone(current);
    const progressPct = Math.min((current / milestone.target) * 100, 100);

    // Determine intensity tier — based on closeness to next milestone
    const milestoneRatio = current / milestone.target;
    const nearRecord =
        streakMilestone?.type === 'near_record' ||
        (allTimeBest > 0 && current / allTimeBest >= 0.8);
    const tier: 'normal' | 'hot' | 'nearRecord' | 'record' = isRecord
        ? 'record'
        : nearRecord
          ? 'nearRecord'
          : milestoneRatio >= 0.7
            ? 'hot'
            : 'normal';

    const cardClass = clsx(
        styles.streakCard,
        tier === 'hot' && styles.streakCardHot,
        tier === 'nearRecord' && styles.streakCardNearRecord,
        tier === 'record' && styles.streakCardRecord,
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

    const targetLabel = isRecord
        ? milestone.remaining === 1
            ? `Can you reach ${milestone.label}? 1 day to go`
            : `Can you reach ${milestone.label}? ${milestone.remaining} days to go`
        : milestone.remaining === 1
          ? `Next streak goal: ${milestone.label} — 1 day left`
          : `Next streak goal: ${milestone.label} — ${milestone.remaining} days left`;

    const pctDisplay = Math.round(progressPct);

    const milestoneMsg = isRecord
        ? 'New all time streak record — keep going!'
        : streakMilestone
          ? streakMilestone.message.replace(
                'your record',
                'your all time streak record',
            )
          : null;

    const longestDateLabel = streak?.longestStart
        ? new Date(streak.longestStart).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
          })
        : null;

    return (
        <div className={cardClass}>
            {/* Title */}
            <div className={styles.streakTitle}>Your Daily Streak</div>

            {/* Hero: fire icon with heat glow + big number */}
            <div className={styles.streakHeroWrap}>
                <div className={styles.streakIconWrap}>
                    <FaFire size={22} className={styles.streakIcon} />
                </div>
                <div className={styles.streakHeroText}>
                    <span className={styles.streakNumber}>{current}</span>
                    <span className={styles.streakDaysLabel}>
                        {current === 1 ? 'day' : 'days'}
                    </span>
                </div>
            </div>

            {/* Milestone target with progress */}
            <div className={styles.streakTarget}>
                <div className={styles.streakTargetHeader}>
                    <span className={styles.streakTargetLabel}>
                        {targetLabel}
                    </span>
                    <span className={styles.streakTargetPct}>
                        {pctDisplay}%
                    </span>
                </div>
                <div className={styles.streakProgressTrack}>
                    <div
                        className={fillClass}
                        style={{ width: `${progressPct}%` }}
                        role="progressbar"
                        aria-valuenow={current}
                        aria-valuemin={0}
                        aria-valuemax={milestone.target}
                    />
                </div>
            </div>

            {/* Footer: longest streak + milestone nudge */}
            {(allTimeBest > 0 || milestoneMsg) && (
                <div className={styles.streakFooter}>
                    {allTimeBest > 0 && !isRecord && (
                        <span className={styles.streakBest}>
                            Longest streak: <strong>{allTimeBest}d</strong>
                            {longestDateLabel && (
                                <span className={styles.streakBestDate}>
                                    {longestDateLabel}
                                </span>
                            )}
                        </span>
                    )}
                    {milestoneMsg && (
                        <div className={milestoneClass}>
                            <FaBolt size={10} />
                            {milestoneMsg}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export const YourStatsClient = ({
    dashboards,
    username,
    picture,
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
    const [jumpPickerOpen, setJumpPickerOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isCustom = selection.kind === 'custom';
    const isAllTime = selection.kind === 'all-time';
    const isCurrent = selection.kind === 'current';
    const activeGranularity =
        selection.kind === 'current' || selection.kind === 'offset'
            ? selection.granularity
            : null;

    // For "current" periods, use pre-fetched data. For offset/custom/all-time, fetch.
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

    // Fetch when navigating to offset, custom, or all-time periods
    useEffect(() => {
        if (selection.kind === 'offset') {
            const { from, to } = getDateRange(
                selection.granularity,
                selection.offset,
            );
            fetchRange(from, to);
        } else if (selection.kind === 'custom' && customFrom) {
            fetchRange(customFrom, customTo);
        } else if (selection.kind === 'all-time') {
            fetchRange('2000-01-01');
        }
    }, [selection, customFrom, customTo, fetchRange]);

    const selectGranularity = (g: PeriodGranularity) => {
        setSelection({ kind: 'current', granularity: g });
        setFetchedDashboard(null);
        setDropdownOpen(false);
        setJumpPickerOpen(false);
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

    const jumpToDate = (dateStr: string) => {
        if (!activeGranularity || !dateStr) return;
        const date = new Date(dateStr + 'T00:00:00');
        const offset = dateToOffset(activeGranularity, date);
        jumpToOffset(offset);
    };

    // Period navigation label
    const periodNav =
        activeGranularity && selection.kind === 'offset'
            ? getDateRange(activeGranularity, selection.offset)
            : null;

    const streakData = dashboards['7d']?.streak ?? null;
    const streakMilestoneData = dashboards['7d']?.streakMilestone ?? null;

    const hasAvatar = picture && picture !== 'noimage';
    const identityHeader = (
        <Link href={`/${username}`} className={styles.identityHeader}>
            {hasAvatar && (
                <Image
                    src={picture}
                    alt=""
                    width={32}
                    height={32}
                    className={styles.identityAvatar}
                    unoptimized
                />
            )}
            <span className={styles.identityName}>{username}</span>
        </Link>
    );

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
                                    !isAllTime &&
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
                            isAllTime && styles.periodButtonActive,
                        )}
                        onClick={() => {
                            setSelection({ kind: 'all-time' });
                            setDropdownOpen(false);
                            setJumpPickerOpen(false);
                        }}
                    >
                        All-time
                    </button>
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
                            <div className={styles.periodDropdownDivider} />
                            {jumpPickerOpen ? (
                                <input
                                    type="date"
                                    className={styles.periodDropdownDateInput}
                                    max={today}
                                    autoFocus
                                    onChange={(e) => jumpToDate(e.target.value)}
                                />
                            ) : (
                                <button
                                    type="button"
                                    className={styles.periodDropdownJump}
                                    onClick={() => setJumpPickerOpen(true)}
                                >
                                    Jump to date…
                                </button>
                            )}
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
                {identityHeader}
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
                {identityHeader}
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
                {identityHeader}
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
            {identityHeader}
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
    const { stats, streak, topGames, prominentRuns } = dashboard;

    const streakMilestone = dashboard.streakMilestone ?? null;

    const top3Games = topGames.slice(0, 3);

    return (
        <>
            {/* 1. Streak Card */}
            <StreakCard streak={streak} streakMilestone={streakMilestone} />

            {/* 2. Period Toggle */}
            {periodToggle}

            {/* 3. Core Stats */}
            <div className={styles.statRibbon}>
                <div className={styles.statCell}>
                    <div className={styles.statValue}>
                        <DurationToFormatted duration={stats.playtime} human />
                    </div>
                    <div className={styles.statLabel}>Playtime</div>
                </div>
                <div className={styles.statCell}>
                    <div className={styles.statValue}>{stats.totalRuns}</div>
                    <div className={styles.statLabel}>Attempts</div>
                </div>
                <div className={styles.statCell}>
                    <div className={styles.statValue}>{stats.finishedRuns}</div>
                    <div className={styles.statLabel}>Finished</div>
                </div>
                <div className={styles.statCell}>
                    <div className={styles.statValue}>{stats.totalPbs}</div>
                    <div className={styles.statLabel}>PBs</div>
                </div>
            </div>

            {/* 4. Top Games */}
            {top3Games.length > 0 && (
                <>
                    <div className={styles.sectionLabel}>
                        Top Games This Period
                    </div>
                    <div className={styles.topGamesList}>
                        {top3Games.map((game, i) => (
                            <Link
                                key={game.gameId}
                                href={`/${username}/${encodeURIComponent(game.gameDisplay)}`}
                                className={styles.topGameCard}
                            >
                                <span className={styles.topGameRank}>
                                    {i + 1}
                                </span>
                                {hasValidImage(game.gameImage) && (
                                    <Image
                                        src={game.gameImage}
                                        alt={game.gameDisplay}
                                        width={36}
                                        height={48}
                                        className={styles.topGameImage}
                                        unoptimized
                                    />
                                )}
                                <div className={styles.topGameInfo}>
                                    <div className={styles.topGameName}>
                                        {game.gameDisplay}
                                    </div>
                                    <div className={styles.topGameStats}>
                                        <DurationToFormatted
                                            duration={game.totalPlaytime}
                                            human
                                        />
                                        {' · '}
                                        {game.totalAttempts} attempts
                                        {' · '}
                                        {game.totalPbs} PBs
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </>
            )}

            {/* 5. Highlights */}
            {prominentRuns.length > 0 && (
                <>
                    <div className={styles.sectionLabel}>Highlights</div>
                    <div className={styles.activityList}>
                        {prominentRuns.map((run) => (
                            <ProminentRunItem
                                key={`${run.game}-${run.category}-${run.endedAt}`}
                                run={run}
                                username={username}
                            />
                        ))}
                    </div>
                </>
            )}
        </>
    );
}

function ProminentRunItem({
    run,
    username,
}: {
    run: DashboardProminentRun;
    username: string;
}) {
    const improvementMs =
        run.isPb && run.previousPb != null ? run.previousPb - run.time : null;

    return (
        <Link
            href={`/${username}/${encodeURIComponent(run.game)}`}
            className={styles.activityItem}
        >
            {hasValidImage(run.gameImage) ? (
                <Image
                    src={run.gameImage}
                    alt={run.game}
                    width={20}
                    height={27}
                    className={styles.activityImage}
                    unoptimized
                />
            ) : (
                <div className={styles.activityImagePlaceholder} />
            )}
            <div className={styles.activityInfo}>
                <div className={styles.activityGame}>{run.game}</div>
                <div className={styles.activityCategory}>
                    {run.category}
                    {run.isPb && <span className={styles.pbBadge}>PB</span>}
                </div>
            </div>
            <div className={styles.activityRight}>
                <span className={styles.activityTime}>
                    <DurationToFormatted duration={run.time} withMillis />
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
                    <FromNow time={new Date(run.endedAt)} />
                </span>
            </div>
        </Link>
    );
}
