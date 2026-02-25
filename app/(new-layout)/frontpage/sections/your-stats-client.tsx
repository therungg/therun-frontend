'use client';

import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
    FaBolt,
    FaCalendarCheck,
    FaFire,
    FaRedo,
    FaTrophy,
} from 'react-icons/fa';
import { DurationToFormatted, FromNow } from '~src/components/util/datetime';
import type {
    DashboardPb,
    DashboardPeriod,
    DashboardRace,
    DashboardResponse,
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

const HIGHLIGHT_ACCENTS: Record<string, string> = {
    pb_improvement: 'Green',
    new_pb: 'Green',
    pb_spree: 'Green',
    pb_machine: 'Green',
    streak: 'Amber',
    longest_streak: 'Amber',
    consistency: 'Amber',
    grinder: 'Amber',
    busiest_game: 'Amber',
    race_win: 'Gold',
    race_placement: 'Gold',
    completion_rate: 'Gold',
    runs_per_pb: 'Gold',
    comeback: 'Blue',
    playtime_surge: 'Blue',
    total_playtime: 'Blue',
    alltime_playtime: 'Blue',
    alltime_runs: 'Primary',
    alltime_games: 'Primary',
    alltime_finish_rate: 'Gold',
};

function getHighlightAccent(type: string): string {
    return HIGHLIGHT_ACCENTS[type] ?? 'Primary';
}

function ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const YourStatsClient = ({
    dashboards,
    username,
}: YourStatsClientProps) => {
    const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('7d');

    const dashboard = dashboards[selectedPeriod] ?? null;

    const periodToggle = (
        <div className={styles.periodToggleWrap}>
            <div className={styles.periodToggle}>
                {PERIODS.map((p) => (
                    <button
                        key={p}
                        type="button"
                        className={clsx(
                            styles.periodButton,
                            selectedPeriod === p && styles.periodButtonActive,
                        )}
                        onClick={() => setSelectedPeriod(p)}
                    >
                        {PERIOD_LABELS[p]}
                    </button>
                ))}
            </div>
        </div>
    );

    if (!dashboard) {
        return (
            <div className={styles.content}>
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
        highlight,
        globalStats,
    } = dashboard;
    const topGame = topGames[0] ?? null;

    const pbsDelta = formatDelta(stats.totalPbs, previousStats.totalPbs);

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
            {highlight && <HighlightCard highlight={highlight} />}

            {periodToggle}

            <div className={styles.statRibbon}>
                <div className={styles.statCell}>
                    <div className={styles.statValue}>
                        <DurationToFormatted duration={stats.playtime} human />
                    </div>
                    <div className={styles.statLabel}>Playtime</div>
                    {globalStats && globalStats.totalRunTime > 0 && (
                        <span className={styles.statAllTime}>
                            of{' '}
                            <DurationToFormatted
                                duration={globalStats.totalRunTime}
                                human
                            />
                        </span>
                    )}
                </div>
                <div className={styles.statCell}>
                    <div className={styles.statValue}>{stats.totalPbs}</div>
                    <div className={styles.statLabel}>PBs</div>
                    <DeltaBadge {...pbsDelta} />
                </div>
                <div className={styles.statCell}>
                    <div className={styles.statValue}>{stats.finishedRuns}</div>
                    <div className={styles.statLabel}>Runs</div>
                    {globalStats &&
                        globalStats.totalFinishedAttemptCount > 0 && (
                            <span className={styles.statAllTime}>
                                of{' '}
                                {formatCompact(
                                    globalStats.totalFinishedAttemptCount,
                                )}
                            </span>
                        )}
                </div>
                <div className={styles.statCell}>
                    <div className={styles.statValue}>
                        {streak?.current ?? 0}d
                    </div>
                    <div className={styles.statLabel}>Streak</div>
                </div>
            </div>

            {globalStats &&
                (globalStats.totalGames > 0 ||
                    globalStats.totalCategories > 0) && (
                    <div className={styles.statRibbon}>
                        <div className={styles.statCell}>
                            <div className={styles.statValue}>
                                {globalStats.totalGames}
                            </div>
                            <div className={styles.statLabel}>Games</div>
                        </div>
                        <div className={styles.statCell}>
                            <div className={styles.statValue}>
                                {globalStats.totalCategories}
                            </div>
                            <div className={styles.statLabel}>Categories</div>
                        </div>
                    </div>
                )}

            {topGame && (
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
            )}

            {allTimeTopGames.length > 0 && (
                <>
                    <div className={styles.allTimeLabel}>
                        All-Time Favorites
                    </div>
                    <div className={styles.allTimeChips}>
                        {allTimeTopGames.slice(0, 3).map((game) => (
                            <Link
                                key={game.gameDisplay}
                                href={`/${username}/${encodeURIComponent(game.gameDisplay)}`}
                                className={styles.allTimeChip}
                            >
                                {hasValidImage(game.gameImage) && (
                                    <Image
                                        src={game.gameImage}
                                        alt={game.gameDisplay}
                                        width={20}
                                        height={27}
                                        className={styles.allTimeChipImage}
                                        unoptimized
                                    />
                                )}
                                <span className={styles.allTimeChipName}>
                                    {game.gameDisplay}
                                </span>
                                <span className={styles.allTimeChipHours}>
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

            {activity.length > 0 && (
                <>
                    <div className={styles.allTimeLabel}>Recent Activity</div>
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
                                />
                            ),
                        )}
                    </div>
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

const HIGHLIGHT_ICONS: Record<string, React.ReactNode> = {
    streak: <FaFire size={18} className={styles.highlightIcon} />,
    longest_streak: <FaFire size={18} className={styles.highlightIcon} />,
    comeback: <FaRedo size={16} className={styles.highlightIcon} />,
    playtime_surge: <FaBolt size={16} className={styles.highlightIcon} />,
    consistency: <FaCalendarCheck size={16} className={styles.highlightIcon} />,
    completion_rate: <FaTrophy size={16} className={styles.highlightIcon} />,
};

// Duration-based highlight values that should render with DurationToFormatted
const DURATION_VALUES = new Set([
    'most_played',
    'total_playtime',
    'alltime_playtime',
]);

const DURATION_SECONDARY = new Set(['pb_improvement', 'new_pb']);

function HighlightValue({
    highlight,
    icon,
}: {
    highlight: NonNullable<DashboardResponse['highlight']>;
    icon?: React.ReactNode;
}) {
    const primary = highlight.value;
    const secondary = highlight.secondaryValue;

    const primaryNode = DURATION_VALUES.has(highlight.type) ? (
        primary != null ? (
            <DurationToFormatted duration={primary} human />
        ) : null
    ) : highlight.type === 'pb_improvement' ? (
        primary != null ? (
            `${primary.toFixed(1)}%`
        ) : null
    ) : highlight.type === 'playtime_surge' ? (
        primary != null ? (
            `+${primary}%`
        ) : null
    ) : highlight.type === 'completion_rate' ||
      highlight.type === 'alltime_finish_rate' ? (
        primary != null ? (
            `${primary}%`
        ) : null
    ) : highlight.type === 'consistency' ? (
        `${primary}/${secondary}`
    ) : primary != null ? (
        String(primary)
    ) : null;

    const secondaryNode = DURATION_SECONDARY.has(highlight.type) ? (
        secondary != null ? (
            <DurationToFormatted duration={secondary} withMillis />
        ) : null
    ) : highlight.type === 'playtime_surge' ? (
        secondary != null ? (
            <DurationToFormatted duration={secondary} human />
        ) : null
    ) : highlight.type === 'alltime_games' ? (
        secondary != null ? (
            `${secondary} categories`
        ) : null
    ) : highlight.type === 'alltime_runs' ? (
        secondary != null ? (
            `${secondary} finished`
        ) : null
    ) : highlight.type === 'race_win' || highlight.type === 'race_placement' ? (
        secondary != null ? (
            <span
                className={clsx(
                    secondary > 0 ? styles.deltaUp : styles.deltaDown,
                )}
            >
                {secondary > 0 ? '+' : ''}
                {secondary} rating
            </span>
        ) : null
    ) : null;

    return (
        <>
            {primaryNode != null && (
                <span className={styles.highlightValue}>
                    {icon}
                    {primaryNode}
                </span>
            )}
            {secondaryNode != null && (
                <span className={styles.highlightSecondary}>
                    {secondaryNode}
                </span>
            )}
        </>
    );
}

function HighlightCard({
    highlight,
}: {
    highlight: NonNullable<DashboardResponse['highlight']>;
}) {
    const accent = getHighlightAccent(highlight.type);
    const accentClass =
        styles[`highlight${accent}` as keyof typeof styles] ?? '';
    const showBg = hasValidImage(highlight.gameImage);

    const icon = HIGHLIGHT_ICONS[highlight.type];
    const valueDisplay = <HighlightValue highlight={highlight} icon={icon} />;

    return (
        <div className={clsx(styles.highlight, accentClass)}>
            {showBg && (
                <div
                    className={styles.highlightBg}
                    style={{
                        backgroundImage: `url(${highlight.gameImage})`,
                    }}
                />
            )}
            <div className={styles.highlightBody}>
                <div className={styles.highlightTag}>Fun Fact</div>
                {valueDisplay}
                <div className={styles.highlightLabel}>{highlight.label}</div>
                {highlight.game && (
                    <div className={styles.highlightGame}>
                        {highlight.game}
                        {highlight.category ? ` — ${highlight.category}` : ''}
                    </div>
                )}
            </div>
        </div>
    );
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
                    width={15}
                    height={20}
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

function RaceActivityItem({ race }: { race: DashboardRace }) {
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
        <div className={styles.activityItem}>
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
        </div>
    );
}
