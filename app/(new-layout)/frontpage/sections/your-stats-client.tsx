'use client';

import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { FaFire } from 'react-icons/fa';
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

function getHighlightAccent(type: string): string {
    switch (type) {
        case 'pb_improvement':
        case 'new_pb':
            return 'Green';
        case 'streak':
            return 'Amber';
        case 'race_win':
        case 'race_placement':
            return 'Gold';
        case 'most_played':
        default:
            return 'Primary';
    }
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
    } = dashboard;
    const topGame = topGames[0] ?? null;

    const playtimeDelta = formatDelta(stats.playtime, previousStats.playtime);
    const pbsDelta = formatDelta(stats.totalPbs, previousStats.totalPbs);
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
            {highlight && <HighlightCard highlight={highlight} />}

            {periodToggle}

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
                <div className={styles.statCell}>
                    <div className={styles.statValue}>
                        {streak?.current ?? 0}d
                    </div>
                    <div className={styles.statLabel}>Streak</div>
                </div>
            </div>

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

function HighlightCard({
    highlight,
}: {
    highlight: NonNullable<DashboardResponse['highlight']>;
}) {
    const accent = getHighlightAccent(highlight.type);
    const accentClass =
        styles[`highlight${accent}` as keyof typeof styles] ?? '';
    const showBg = hasValidImage(highlight.gameImage);

    let valueDisplay: React.ReactNode;
    switch (highlight.type) {
        case 'pb_improvement':
            valueDisplay = (
                <>
                    <span className={styles.highlightValue}>
                        {highlight.value != null
                            ? `${highlight.value.toFixed(1)}%`
                            : ''}
                    </span>
                    {highlight.secondaryValue != null && (
                        <span className={styles.highlightSecondary}>
                            <DurationToFormatted
                                duration={highlight.secondaryValue}
                                withMillis
                            />
                        </span>
                    )}
                </>
            );
            break;
        case 'streak':
            valueDisplay = (
                <span className={styles.highlightValue}>
                    <FaFire size={18} className={styles.streakIcon} />
                    {highlight.value ?? 0} days
                </span>
            );
            break;
        case 'new_pb':
            valueDisplay = (
                <span className={styles.highlightValue}>
                    {highlight.secondaryValue != null ? (
                        <DurationToFormatted
                            duration={highlight.secondaryValue}
                            withMillis
                        />
                    ) : (
                        'New PB'
                    )}
                </span>
            );
            break;
        case 'most_played':
            valueDisplay = (
                <span className={styles.highlightValue}>
                    {highlight.value != null ? (
                        <DurationToFormatted duration={highlight.value} human />
                    ) : (
                        ''
                    )}
                </span>
            );
            break;
        case 'race_win':
        case 'race_placement':
            valueDisplay = (
                <>
                    <span className={styles.highlightValue}>
                        {highlight.value != null
                            ? ordinal(highlight.value)
                            : ''}
                    </span>
                    {highlight.secondaryValue != null && (
                        <span
                            className={clsx(
                                styles.highlightSecondary,
                                highlight.secondaryValue > 0
                                    ? styles.deltaUp
                                    : styles.deltaDown,
                            )}
                        >
                            {highlight.secondaryValue > 0 ? '+' : ''}
                            {highlight.secondaryValue} rating
                        </span>
                    )}
                </>
            );
            break;
        default:
            valueDisplay = null;
    }

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
