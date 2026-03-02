import Image from 'next/image';
import Link from 'next/link';
import { FaBolt, FaClock, FaFire, FaTrophy, FaUsers } from 'react-icons/fa6';
import { Panel } from '~app/(new-layout)/components/panel.component';
import {
    type CategoryActivity,
    type GameActivity,
    getCategoryActivityForGame,
    getGameActivity,
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

    const hotGames = await getGameActivity(from24h, to, 5, 2);

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
            className={`${styles.gameCard} ${isTop ? styles.gameCardTop : ''}`}
        >
            <span className={styles.rank}>{rank}</span>
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
                    <span className={styles.categories}>
                        {categories
                            .slice(0, 2)
                            .map((c) => c.categoryDisplay)
                            .join(' · ')}
                    </span>
                )}
            </div>
            <div className={styles.stats}>
                <span className={`${styles.stat} ${styles.statHighlight}`}>
                    <FaClock size={11} aria-hidden="true" />
                    <span className={styles.statValue}>
                        {formatHoursCompact(game.totalPlaytime)}
                    </span>
                </span>
                <span className={styles.stat}>
                    <FaUsers size={11} aria-hidden="true" />
                    <span className={styles.statValue}>
                        {compact.format(game.uniquePlayers)}
                    </span>
                </span>
                <span className={`${styles.stat} ${styles.statSecondary}`}>
                    <FaBolt size={11} aria-hidden="true" />
                    <span className={styles.statValue}>
                        {compact.format(game.totalAttempts)}
                    </span>
                </span>
                <span className={`${styles.stat} ${styles.statSecondary}`}>
                    <FaTrophy size={11} aria-hidden="true" />
                    <span className={styles.statValue}>
                        {compact.format(game.totalPbs)}
                    </span>
                </span>
            </div>
        </Link>
    );
};
