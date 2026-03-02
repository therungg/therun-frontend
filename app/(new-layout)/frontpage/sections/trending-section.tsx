import Image from 'next/image';
import Link from 'next/link';
import { FaCrown, FaFire, FaTrophy } from 'react-icons/fa6';
import { Panel } from '~app/(new-layout)/components/panel.component';
import {
    type CategoryActivity,
    type GameActivity,
    type GameWithImage,
    getCategoryActivityForGame,
    getGameActivity,
    getTopGames,
} from '~src/lib/highlights';
import { safeEncodeURI } from '~src/utils/uri';
import styles from './trending-section.module.scss';

const FALLBACK_IMAGE = '/logo_dark_theme_no_text_transparent.png';

function formatHoursCompact(ms: number): string {
    const hours = ms / 3_600_000;
    if (hours >= 1_000) return `${(hours / 1_000).toFixed(1)}K`;
    return Math.round(hours).toLocaleString();
}

const compact = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
});

function getDateDaysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

function getToday(): string {
    return new Date().toISOString().split('T')[0];
}

export const TrendingSection = async () => {
    const from24h = getDateDaysAgo(1);
    const to = getToday();

    const [hotGames, allTimeGames] = await Promise.all([
        getGameActivity(from24h, to, 5, 2),
        getTopGames(5),
    ]);

    const categoryMap: Record<number, CategoryActivity[]> = {};
    const categoryResults = await Promise.all(
        hotGames.map((game) =>
            getCategoryActivityForGame(game.gameId, from24h, to, 3),
        ),
    );
    for (let i = 0; i < hotGames.length; i++) {
        categoryMap[hotGames[i].gameId] = categoryResults[i];
    }

    return (
        <Panel
            panelId="trending"
            title="Trending Games"
            subtitle="Last 24 Hours"
            className="p-0 overflow-hidden"
        >
            <div className={styles.content}>
                <h3 className={styles.header}>
                    <FaFire size={12} aria-hidden="true" />
                    Hot Right Now
                </h3>

                {hotGames.length === 0 ? (
                    <p className={styles.empty}>
                        No trending activity in the last 24 hours.
                    </p>
                ) : (
                    <div className={styles.games}>
                        {hotGames.map((game, i) => (
                            <HotGameCard
                                key={game.gameId}
                                game={game}
                                rank={i + 1}
                                isTop={i === 0}
                                categories={categoryMap[game.gameId] ?? []}
                            />
                        ))}
                    </div>
                )}
            </div>

            {allTimeGames.length > 0 && (
                <div className={styles.allTimeZone}>
                    <h3 className={styles.allTimeHeader}>
                        <FaCrown size={10} aria-hidden="true" />
                        Most Played All Time
                    </h3>
                    <div className={styles.allTimeList}>
                        {allTimeGames.map((game, i) => (
                            <AllTimeRow
                                key={game.gameId}
                                game={game}
                                rank={i + 1}
                            />
                        ))}
                    </div>
                </div>
            )}
        </Panel>
    );
};

const HotGameCard = ({
    game,
    rank,
    isTop,
    categories,
}: {
    game: GameActivity;
    rank: number;
    isTop: boolean;
    categories: CategoryActivity[];
}) => {
    const imageUrl =
        game.gameImage && game.gameImage !== 'noimage'
            ? game.gameImage
            : FALLBACK_IMAGE;

    return (
        <Link
            href={`/${safeEncodeURI(game.gameDisplay)}`}
            className={styles.gameCard}
        >
            <RankBadge rank={rank} />
            <Image
                src={imageUrl}
                alt=""
                width={isTop ? 72 : 60}
                height={isTop ? 96 : 80}
                className={`${styles.gameArt} ${isTop ? styles.gameArtTop : ''}`}
                unoptimized
            />
            <div className={styles.gameInfo}>
                <span
                    className={`${styles.gameName} ${isTop ? styles.gameNameTop : ''}`}
                >
                    {game.gameDisplay}
                </span>
                {categories.length > 0 && (
                    <div className={styles.categories}>
                        {categories.slice(0, 3).map((c, i) => (
                            <span
                                key={c.categoryId}
                                className={styles.category}
                            >
                                <span className={styles.categoryName}>
                                    {c.categoryDisplay}
                                </span>
                                <span className={styles.categoryTime}>
                                    {formatHoursCompact(c.totalPlaytime)}h
                                </span>
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <div className={styles.stats}>
                <span className={`${styles.stat} ${styles.statHighlight}`}>
                    <span className={styles.statValue}>
                        {formatHoursCompact(game.totalPlaytime)}
                    </span>
                    <span className={styles.statLabel}>Hours</span>
                </span>
                <span className={styles.stat}>
                    <span className={styles.statValue}>
                        {compact.format(game.uniquePlayers)}
                    </span>
                    <span className={styles.statLabel}>Players</span>
                </span>
                <span className={`${styles.stat} ${styles.statSecondary}`}>
                    <span className={styles.statValue}>
                        {compact.format(game.totalAttempts)}
                    </span>
                    <span className={styles.statLabel}>Attempts</span>
                </span>
                <span className={`${styles.stat} ${styles.statSecondary}`}>
                    <span className={styles.statValue}>
                        {compact.format(game.totalPbs)}
                    </span>
                    <span className={styles.statLabel}>PBs</span>
                </span>
            </div>
        </Link>
    );
};

const TROPHY_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const;

const RankBadge = ({ rank }: { rank: number }) => {
    if (rank <= 3) {
        return (
            <span className={styles.rank}>
                <FaTrophy
                    size={14}
                    color={TROPHY_COLORS[rank - 1]}
                    aria-label={`#${rank}`}
                />
            </span>
        );
    }
    return (
        <span className={`${styles.rank} ${styles.rankNumber}`}>{rank}</span>
    );
};

const AllTimeRow = ({ game, rank }: { game: GameWithImage; rank: number }) => {
    const imageUrl =
        game.gameImage && game.gameImage !== 'noimage'
            ? game.gameImage
            : FALLBACK_IMAGE;

    const hours = Math.round(game.totalRunTime / 3_600_000).toLocaleString();

    return (
        <Link
            href={`/${safeEncodeURI(game.gameDisplay)}`}
            className={styles.allTimeRow}
        >
            <span className={styles.allTimeRank}>{rank}</span>
            <Image
                src={imageUrl}
                alt=""
                width={30}
                height={40}
                className={styles.allTimeArt}
                unoptimized
            />
            <span className={styles.allTimeName}>{game.gameDisplay}</span>
            <span className={styles.allTimeHours}>{hours}h</span>
        </Link>
    );
};
