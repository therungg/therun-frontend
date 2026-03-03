'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useRef, useState, useTransition } from 'react';
import { FaTrophy } from 'react-icons/fa6';
import {
    type CategoryActivity,
    type CategoryStats,
    type GameActivity,
    type GameWithImage,
    getCategoryActivityForGame,
    getGameActivity,
    getTopCategoriesForGame,
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

// ── Period definitions ──

type PeriodKey = '24h' | '7d' | '30d' | '1y' | 'all';

interface PeriodDef {
    key: PeriodKey;
    label: string;
    days: number;
}

const PERIODS: PeriodDef[] = [
    { key: '24h', label: '24h', days: 1 },
    { key: '7d', label: '7d', days: 7 },
    { key: '30d', label: '30d', days: 30 },
    { key: '1y', label: '1y', days: 365 },
    { key: 'all', label: 'All Time', days: 0 },
];

function getDateDaysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

function getToday(): string {
    return new Date().toISOString().split('T')[0];
}

// ── Normalizers: map all-time data shapes to GameActivity/CategoryActivity ──

function normalizeGame(g: GameWithImage): GameActivity {
    return {
        gameId: g.gameId,
        gameDisplay: g.gameDisplay,
        gameImage: g.gameImage,
        totalPlaytime: g.totalRunTime,
        totalAttempts: g.totalAttemptCount,
        totalFinishedAttempts: g.totalFinishedAttemptCount,
        totalPbs: g.totalPbs,
        totalPbsWithPrevious: 0,
        uniquePlayers: g.uniqueRunners,
    };
}

function normalizeCategoryStat(c: CategoryStats): CategoryActivity {
    return {
        gameId: c.gameId,
        categoryId: c.categoryId,
        gameDisplay: c.gameDisplay,
        categoryDisplay: c.categoryDisplay,
        gameImage: c.gameImage ?? '',
        totalPlaytime: c.totalRunTime,
        totalAttempts: c.totalAttemptCount,
        totalFinishedAttempts: c.totalFinishedAttemptCount,
        totalPbs: c.totalPbs,
        totalPbsWithPrevious: 0,
        uniquePlayers: c.uniqueRunners,
    };
}

// ── Cache type ──

interface PeriodData {
    games: GameActivity[];
    categoryMap: Record<number, CategoryActivity[]>;
}

// ── Main component ──

interface TrendingSectionClientProps {
    initialGames: GameActivity[];
    initialCategoryMap: Record<number, CategoryActivity[]>;
}

export const TrendingSectionClient = ({
    initialGames,
    initialCategoryMap,
}: TrendingSectionClientProps) => {
    const [activePeriod, setActivePeriod] = useState<PeriodKey>('24h');
    const [games, setGames] = useState(initialGames);
    const [categoryMap, setCategoryMap] =
        useState<Record<number, CategoryActivity[]>>(initialCategoryMap);
    const [isPending, startTransition] = useTransition();

    const cache = useRef<Map<PeriodKey, PeriodData>>(
        new Map([
            ['24h', { games: initialGames, categoryMap: initialCategoryMap }],
        ]),
    );

    const switchPeriod = useCallback(
        (period: PeriodKey) => {
            if (period === activePeriod) return;
            setActivePeriod(period);

            const cached = cache.current.get(period);
            if (cached) {
                setGames(cached.games);
                setCategoryMap(cached.categoryMap);
                return;
            }

            startTransition(async () => {
                let fetchedGames: GameActivity[];
                const catMap: Record<number, CategoryActivity[]> = {};

                if (period === 'all') {
                    const topGames = await getTopGames(5);
                    fetchedGames = topGames.map(normalizeGame);

                    const catResults = await Promise.all(
                        topGames.map((g) =>
                            getTopCategoriesForGame(g.gameId, 3),
                        ),
                    );
                    for (let i = 0; i < topGames.length; i++) {
                        catMap[topGames[i].gameId] = catResults[i].map(
                            normalizeCategoryStat,
                        );
                    }
                } else {
                    const def = PERIODS.find((p) => p.key === period)!;
                    const from = getDateDaysAgo(def.days);
                    const to = getToday();

                    fetchedGames = await getGameActivity(from, to, 5, 2);

                    const catResults = await Promise.all(
                        fetchedGames.map((g) =>
                            getCategoryActivityForGame(g.gameId, from, to, 3),
                        ),
                    );
                    for (let i = 0; i < fetchedGames.length; i++) {
                        catMap[fetchedGames[i].gameId] = catResults[i];
                    }
                }

                cache.current.set(period, {
                    games: fetchedGames,
                    categoryMap: catMap,
                });
                setGames(fetchedGames);
                setCategoryMap(catMap);
            });
        },
        [activePeriod],
    );

    return (
        <div className={styles.content}>
            <div className={styles.header}>
                <div className={styles.periodToggle}>
                    {PERIODS.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            className={`${styles.periodButton} ${activePeriod === p.key ? styles.periodButtonActive : ''}`}
                            onClick={() => switchPeriod(p.key)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {games.length === 0 && !isPending ? (
                <p className={styles.empty}>
                    No trending activity for this period.
                </p>
            ) : (
                <div
                    className={`${styles.games} ${isPending ? styles.gamesLoading : ''}`}
                >
                    {games.map((game, i) => (
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
    );
};

// ── Sub-components ──

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
                        {categories.slice(0, 3).map((c) => (
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
