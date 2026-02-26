'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
    FaBolt,
    FaClock,
    FaCrown,
    FaFire,
    FaTrophy,
    FaUsers,
} from 'react-icons/fa6';
import type {
    CategoryActivity,
    GameActivity,
    GameWithImage,
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

interface TrendingSectionClientProps {
    initialGames: GameActivity[];
    initialCategoryMap: Record<number, CategoryActivity[]>;
    allTimeGames: GameWithImage[];
}

export const TrendingSectionClient = ({
    initialGames,
    initialCategoryMap,
    allTimeGames,
}: TrendingSectionClientProps) => {
    return (
        <div className={styles.content}>
            {/* Hot Right Now zone */}
            <div className={styles.hotZone}>
                <div className={styles.hotHeader}>
                    <h3 className={styles.hotTitle}>
                        <FaFire size={12} aria-hidden="true" />
                        Hot Right Now
                    </h3>
                    <span className={styles.periodLabel}>Last 24 hours</span>
                </div>

                <div className={styles.hotGames}>
                    {initialGames.map((game, i) => (
                        <HotGameCard
                            key={game.gameId}
                            game={game}
                            rank={i + 1}
                            categories={initialCategoryMap[game.gameId] ?? []}
                        />
                    ))}
                </div>
            </div>

            {/* All-Time zone */}
            <div className={styles.allTimeZone}>
                <h3 className={styles.allTimeHeader}>
                    <FaCrown size={12} aria-hidden="true" />
                    All-Time
                </h3>
                <div className={styles.allTimeGames}>
                    {allTimeGames.map((game, i) => (
                        <AllTimeGameRow
                            key={game.gameId}
                            game={game}
                            rank={i + 1}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

const HotGameCard = ({
    game,
    rank,
    categories,
}: {
    game: GameActivity;
    rank: number;
    categories: CategoryActivity[];
}) => {
    const imageUrl =
        game.gameImage && game.gameImage !== 'noimage'
            ? game.gameImage
            : FALLBACK_IMAGE;

    return (
        <Link
            href={`/${safeEncodeURI(game.gameDisplay)}`}
            className={styles.hotGameCard}
        >
            <span className={styles.rank}>{rank}</span>
            <Image
                src={imageUrl}
                alt=""
                width={45}
                height={60}
                className={styles.gameArt}
                unoptimized
            />
            <div className={styles.gameInfo}>
                <span className={styles.gameName}>{game.gameDisplay}</span>
                {categories.length > 0 && (
                    <span className={styles.categories}>
                        {categories
                            .slice(0, 2)
                            .map((c) => c.categoryDisplay)
                            .join(' · ')}
                    </span>
                )}
            </div>
            <div className={styles.statGrid}>
                <div className={`${styles.stat} ${styles.statHighlight}`}>
                    <FaClock size={11} aria-hidden="true" />
                    <span className={styles.statValue}>
                        {formatHoursCompact(game.totalPlaytime)}
                    </span>
                    <span className={styles.statLabel}>hrs</span>
                </div>
                <div className={styles.stat}>
                    <FaUsers size={11} aria-hidden="true" />
                    <span className={styles.statValue}>
                        {compact.format(game.uniquePlayers)}
                    </span>
                    <span className={styles.statLabel}>players</span>
                </div>
                <div className={styles.stat}>
                    <FaBolt size={11} aria-hidden="true" />
                    <span className={styles.statValue}>
                        {compact.format(game.totalAttempts)}
                    </span>
                    <span className={styles.statLabel}>attempts</span>
                </div>
                <div className={styles.stat}>
                    <FaTrophy size={11} aria-hidden="true" />
                    <span className={styles.statValue}>
                        {compact.format(game.totalPbs)}
                    </span>
                    <span className={styles.statLabel}>PBs</span>
                </div>
            </div>
        </Link>
    );
};

const AllTimeGameRow = ({
    game,
    rank,
}: {
    game: GameWithImage;
    rank: number;
}) => {
    const imageUrl =
        game.gameImage && game.gameImage !== 'noimage'
            ? game.gameImage
            : FALLBACK_IMAGE;

    return (
        <Link
            href={`/${safeEncodeURI(game.gameDisplay)}`}
            className={styles.allTimeRow}
        >
            <span className={styles.allTimeRank}>{rank}</span>
            <Image
                src={imageUrl}
                alt={game.gameDisplay}
                width={30}
                height={40}
                className={styles.allTimeArt}
                unoptimized
            />
            <span className={styles.allTimeName}>{game.gameDisplay}</span>
            <span className={styles.allTimeStats}>
                <span className={styles.allTimeStat}>
                    <FaClock size={9} aria-hidden="true" />
                    {Math.round(game.totalRunTime / 3_600_000).toLocaleString()}
                    h
                </span>
                <span className={styles.allTimeStat}>
                    <FaUsers size={9} aria-hidden="true" />
                    {compact.format(game.uniqueRunners)}
                    <span className="visually-hidden"> players</span>
                </span>
            </span>
        </Link>
    );
};
