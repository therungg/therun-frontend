'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
    FaBolt,
    FaClock,
    FaCrown,
    FaFire,
    FaTrophy,
    FaUsers,
} from 'react-icons/fa6';
import useSWR from 'swr';
import type {
    CategoryActivity,
    GameActivity,
    GameWithImage,
} from '~src/lib/highlights';
import { safeEncodeURI } from '~src/utils/uri';
import styles from './trending-section.module.scss';

const FALLBACK_IMAGE = '/logo_dark_theme_no_text_transparent.png';
const BASE_URL = process.env.NEXT_PUBLIC_DATA_URL;

type Period = '1' | '3' | '7' | '30';
type Metric = 'playtime' | 'players' | 'attempts' | 'pbs';

const PERIODS: { value: Period; label: string }[] = [
    { value: '1', label: '24h' },
    { value: '3', label: '3d' },
    { value: '7', label: '7d' },
    { value: '30', label: '30d' },
];

const METRICS: { value: Metric; label: string }[] = [
    { value: 'playtime', label: 'Playtime' },
    { value: 'players', label: 'Players' },
    { value: 'attempts', label: 'Attempts' },
    { value: 'pbs', label: 'PBs' },
];

function getDateDaysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

function getToday(): string {
    return new Date().toISOString().split('T')[0];
}

function getMinPlayers(period: Period): number {
    return period === '1' || period === '3' ? 2 : 3;
}

function formatHoursCompact(ms: number): string {
    const hours = ms / 3_600_000;
    if (hours >= 1_000) return `${(hours / 1_000).toFixed(1)}K`;
    return Math.round(hours).toLocaleString();
}

const compact = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
});

function sortByMetric(games: GameActivity[], metric: Metric): GameActivity[] {
    const sorted = [...games];
    sorted.sort((a, b) => {
        switch (metric) {
            case 'playtime':
                return b.totalPlaytime - a.totalPlaytime;
            case 'players':
                return b.uniquePlayers - a.uniquePlayers;
            case 'attempts':
                return b.totalAttempts - a.totalAttempts;
            case 'pbs':
                return b.totalPbs - a.totalPbs;
        }
    });
    return sorted;
}

async function activityFetcher(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch activity');
    const json = await res.json();
    return json.result;
}

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
    const [period, setPeriod] = useState<Period>('7');
    const [metric, setMetric] = useState<Metric>('playtime');

    const from = getDateDaysAgo(Number(period));
    const to = getToday();
    const minPlayers = getMinPlayers(period);

    // Only use SWR when period differs from the default (7d)
    const shouldFetch = period !== '7';
    const gamesUrl = shouldFetch
        ? `${BASE_URL}/games/activity?from=${from}&to=${to}&type=games&minPlayers=${minPlayers}&limit=6`
        : null;

    const { data: fetchedGames } = useSWR<GameActivity[]>(
        gamesUrl,
        activityFetcher,
        { keepPreviousData: true },
    );

    const hotGames = sortByMetric(fetchedGames ?? initialGames, metric);

    // Fetch categories globally with high limit so all hot games get coverage
    const categoriesUrl = shouldFetch
        ? `${BASE_URL}/games/activity?from=${from}&to=${to}&type=categories&limit=50`
        : null;

    const { data: fetchedCategories } = useSWR<CategoryActivity[]>(
        categoriesUrl,
        activityFetcher,
        { keepPreviousData: true },
    );

    // Build category map: group fetched categories by gameId, take top 2
    const categoryMap: Record<number, CategoryActivity[]> = shouldFetch
        ? buildCategoryMap(fetchedCategories ?? [], hotGames)
        : initialCategoryMap;

    return (
        <div className={styles.content}>
            {/* Hot Right Now zone */}
            <div className={styles.hotZone}>
                <div className={styles.hotHeader}>
                    <div className={styles.hotTitle}>
                        <FaFire size={12} />
                        Hot Right Now
                    </div>
                    <div className={styles.periodPills}>
                        {PERIODS.map((p) => (
                            <button
                                key={p.value}
                                type="button"
                                className={`${styles.pill} ${period === p.value ? styles.pillActive : ''}`}
                                onClick={() => setPeriod(p.value)}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.metricPills}>
                    {METRICS.map((m) => (
                        <button
                            key={m.value}
                            type="button"
                            className={`${styles.metricPill} ${metric === m.value ? styles.metricPillActive : ''}`}
                            onClick={() => setMetric(m.value)}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                <div className={styles.hotGames}>
                    {hotGames.map((game, i) => (
                        <HotGameCard
                            key={game.gameId}
                            game={game}
                            rank={i + 1}
                            metric={metric}
                            categories={categoryMap[game.gameId] ?? []}
                        />
                    ))}
                </div>
            </div>

            {/* All-Time zone */}
            <div className={styles.allTimeZone}>
                <div className={styles.allTimeHeader}>
                    <FaCrown size={12} />
                    All-Time
                </div>
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

function buildCategoryMap(
    categories: CategoryActivity[],
    games: GameActivity[],
): Record<number, CategoryActivity[]> {
    const map: Record<number, CategoryActivity[]> = {};
    const gameIdSet = new Set(games.map((g) => g.gameId));
    for (const cat of categories) {
        if (!gameIdSet.has(cat.gameId)) continue;
        if (!map[cat.gameId]) map[cat.gameId] = [];
        if (map[cat.gameId].length < 2) map[cat.gameId].push(cat);
    }
    return map;
}

const HotGameCard = ({
    game,
    rank,
    metric,
    categories,
}: {
    game: GameActivity;
    rank: number;
    metric: Metric;
    categories: CategoryActivity[];
}) => {
    const imageUrl =
        game.gameImage && game.gameImage !== 'noimage'
            ? game.gameImage
            : FALLBACK_IMAGE;

    return (
        <div className={styles.hotGameCard}>
            <span className={styles.rank}>{rank}</span>
            <Image
                src={imageUrl}
                alt={game.gameDisplay}
                width={48}
                height={48}
                className={styles.gameArt}
                unoptimized
            />
            <div className={styles.gameInfo}>
                <Link
                    href={`/${safeEncodeURI(game.gameDisplay)}`}
                    className={styles.gameName}
                >
                    {game.gameDisplay}
                </Link>
                {categories.length > 0 && (
                    <span className={styles.categories}>
                        {categories
                            .map((c) => c.categoryDisplay)
                            .join(' \u00b7 ')}
                    </span>
                )}
            </div>
            <div className={styles.statGrid}>
                <div
                    className={`${styles.stat} ${metric === 'playtime' ? styles.statHighlight : ''}`}
                >
                    <FaClock size={9} />
                    <span>{formatHoursCompact(game.totalPlaytime)}</span>
                </div>
                <div
                    className={`${styles.stat} ${metric === 'players' ? styles.statHighlight : ''}`}
                >
                    <FaUsers size={9} />
                    <span>{compact.format(game.uniquePlayers)}</span>
                </div>
                <div
                    className={`${styles.stat} ${metric === 'attempts' ? styles.statHighlight : ''}`}
                >
                    <FaBolt size={9} />
                    <span>{compact.format(game.totalAttempts)}</span>
                </div>
                <div
                    className={`${styles.stat} ${metric === 'pbs' ? styles.statHighlight : ''}`}
                >
                    <FaTrophy size={9} />
                    <span>{compact.format(game.totalPbs)}</span>
                </div>
            </div>
        </div>
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
                width={32}
                height={32}
                className={styles.allTimeArt}
                unoptimized
            />
            <span className={styles.allTimeName}>{game.gameDisplay}</span>
            <span className={styles.allTimeStat}>
                <FaClock size={9} />
                {Math.round(game.totalRunTime / 3_600_000).toLocaleString()} hrs
            </span>
            <span className={styles.allTimeStat}>
                <FaUsers size={9} />
                {compact.format(game.uniqueRunners)}
            </span>
        </Link>
    );
};
