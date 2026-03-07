'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
    type FinishedRunsResult,
    searchFinishedRuns,
} from '~src/lib/finished-runs';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

import { parseDuration } from './duration-utils';
import { DEFAULT_FILTERS, FilterBar, type RunsFilters } from './filter-bar';
import styles from './runs-explorer.module.scss';
import { RunsPagination } from './runs-pagination';
import { RunsTable } from './runs-table';

const TEXT_FILTER_KEYS: (keyof RunsFilters)[] = [
    'game',
    'category',
    'username',
    'minTime',
    'maxTime',
];

const DEBOUNCE_MS = 400;

function filtersFromParams(params: URLSearchParams): RunsFilters {
    return {
        game: params.get('game') ?? '',
        gameId: null,
        gameImage: null,
        category: params.get('category') ?? '',
        categoryId: null,
        username: params.get('username') ?? '',
        isPb: params.get('isPb') === 'true',
        useGameTime: params.get('useGameTime') === 'true',
        minTime: params.get('minTime') ?? '',
        maxTime: params.get('maxTime') ?? '',
        afterDate: params.get('afterDate') ?? '',
        beforeDate: params.get('beforeDate') ?? '',
        sort: params.get('sort') ?? DEFAULT_FILTERS.sort,
    };
}

function pageFromParams(params: URLSearchParams): number {
    const raw = params.get('page');
    if (!raw) return 1;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 1 ? n : 1;
}

function limitFromParams(params: URLSearchParams): number {
    const raw = params.get('limit');
    if (!raw) return PAGE_SIZE_OPTIONS[0];
    const n = parseInt(raw, 10);
    return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
        ? n
        : PAGE_SIZE_OPTIONS[0];
}

function buildSearchParams(
    filters: RunsFilters,
    page: number,
    limit?: number,
): string {
    const params = new URLSearchParams();

    if (filters.game) params.set('game', filters.game);
    if (filters.category) params.set('category', filters.category);
    if (filters.username) params.set('username', filters.username);
    if (filters.isPb) params.set('isPb', 'true');
    if (filters.useGameTime) params.set('useGameTime', 'true');
    if (filters.minTime) params.set('minTime', filters.minTime);
    if (filters.maxTime) params.set('maxTime', filters.maxTime);
    if (filters.afterDate) params.set('afterDate', filters.afterDate);
    if (filters.beforeDate) params.set('beforeDate', filters.beforeDate);
    if (filters.sort && filters.sort !== DEFAULT_FILTERS.sort) {
        params.set('sort', filters.sort);
    }
    if (page > 1) params.set('page', String(page));
    if (limit && limit !== PAGE_SIZE_OPTIONS[0])
        params.set('limit', String(limit));

    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

function hasTextFilterChange(partial: Partial<RunsFilters>): boolean {
    return Object.keys(partial).some((key) =>
        TEXT_FILTER_KEYS.includes(key as keyof RunsFilters),
    );
}

interface RunsExplorerProps {
    loggedInUser?: string;
}

export function RunsExplorer({ loggedInUser }: RunsExplorerProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [filters, setFilters] = useState<RunsFilters>(() =>
        filtersFromParams(searchParams),
    );
    const [page, setPage] = useState(() => pageFromParams(searchParams));
    const [limit, setLimit] = useState(() => limitFromParams(searchParams));
    const [data, setData] = useState<FinishedRunsResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const filtersRef = useRef(filters);
    filtersRef.current = filters;
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const mountedRef = useRef(false);
    const fetchIdRef = useRef(0);

    // Fetch runs with the given filters + page + limit
    // Skip fetch if game is set but gameId hasn't resolved yet (waiting for categories endpoint)
    function fetchRuns(f: RunsFilters, p: number, l: number = limit) {
        if (f.game && f.gameId == null) return;

        const id = ++fetchIdRef.current;
        setIsLoading(true);

        const minTime = parseDuration(f.minTime) ?? undefined;
        const maxTime = parseDuration(f.maxTime) ?? undefined;

        searchFinishedRuns({
            gameId: f.gameId ?? undefined,
            categoryId: f.categoryId ?? undefined,
            category: f.categoryId ? undefined : f.category || undefined,
            username: f.username || undefined,
            isPb: f.isPb || undefined,
            useGameTime: f.useGameTime || undefined,
            minTime,
            maxTime,
            afterDate: f.afterDate || undefined,
            beforeDate: f.beforeDate || undefined,
            sort: f.sort,
            page: p,
            limit: l,
        })
            .then((result) => {
                if (fetchIdRef.current !== id) return;
                setData(result);
                setIsLoading(false);
            })
            .catch((error) => {
                console.error('Failed to fetch runs:', error);
                if (fetchIdRef.current === id) setIsLoading(false);
            });
    }

    // Initial fetch on mount
    useEffect(() => {
        fetchRuns(filters, page);
        mountedRef.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync URL when filters/page/limit change (skip initial mount)
    useEffect(() => {
        if (!mountedRef.current) return;
        const path = `/runs${buildSearchParams(filters, page, limit)}`;
        router.replace(path, { scroll: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, page, limit]);

    function handleFilterChange(partial: Partial<RunsFilters>) {
        const next = { ...filtersRef.current, ...partial };

        // Swap time sort field when useGameTime changes
        if ('useGameTime' in partial) {
            if (partial.useGameTime) {
                if (next.sort === 'time') next.sort = 'game_time';
                else if (next.sort === '-time') next.sort = '-game_time';
            } else {
                if (next.sort === 'game_time') next.sort = 'time';
                else if (next.sort === '-game_time') next.sort = '-time';
            }
        }

        // Reset time sort when category is cleared
        if ('category' in partial && !partial.category) {
            const s = next.sort;
            if (
                s === 'time' ||
                s === '-time' ||
                s === 'game_time' ||
                s === '-game_time'
            ) {
                next.sort = DEFAULT_FILTERS.sort;
            }
        }

        setFilters(next);
        setPage(1);

        if (hasTextFilterChange(partial)) {
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                fetchRuns(next, 1);
            }, DEBOUNCE_MS);
        } else {
            fetchRuns(next, 1);
        }
    }

    function handleClearAll() {
        clearTimeout(debounceRef.current);
        const next = { ...DEFAULT_FILTERS };
        setFilters(next);
        setPage(1);
        fetchRuns(next, 1);
    }

    function handleSortChange(sort: string) {
        const next = { ...filters, sort };
        setFilters(next);
        setPage(1);
        fetchRuns(next, 1);
    }

    function handlePageChange(newPage: number) {
        setPage(newPage);
        fetchRuns(filters, newPage);
    }

    function handleLimitChange(newLimit: number) {
        setLimit(newLimit);
        setPage(1);
        fetchRuns(filters, 1, newLimit);
    }

    const showGameHero = !!filters.gameImage && !!filters.game;

    return (
        <div className={styles.explorer}>
            {showGameHero ? (
                <div className={styles.gameHero}>
                    <img
                        src={filters.gameImage!}
                        alt={filters.game}
                        className={styles.gameHeroImage}
                    />
                    <div className={styles.gameHeroInfo}>
                        <h1>{filters.game}</h1>
                        {filters.category && (
                            <span className={styles.gameHeroCategory}>
                                {filters.category}
                            </span>
                        )}
                    </div>
                </div>
            ) : (
                <div className={styles.header}>
                    <h1>Runs Explorer</h1>
                </div>
            )}
            <FilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearAll={handleClearAll}
                isPending={isLoading}
                loggedInUser={loggedInUser}
            />
            <RunsTable
                runs={data?.items ?? null}
                isLoading={isLoading}
                sort={filters.sort}
                onSortChange={handleSortChange}
                onClearFilters={handleClearAll}
                hideGameImage={showGameHero}
                useGameTime={filters.useGameTime}
                hasCategory={!!filters.category}
            />
            {data && data.totalPages > 1 && (
                <RunsPagination
                    page={page}
                    totalPages={data.totalPages}
                    totalCount={data.totalCount}
                    itemCount={data.items.length}
                    limit={limit}
                    onPageChange={handlePageChange}
                    onLimitChange={handleLimitChange}
                />
            )}
        </div>
    );
}
