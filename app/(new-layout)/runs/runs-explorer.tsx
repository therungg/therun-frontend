'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
    type FinishedRunsResult,
    searchFinishedRuns,
} from '~src/lib/finished-runs';
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
        category: params.get('category') ?? '',
        username: params.get('username') ?? '',
        isPb: params.get('isPb') === 'true',
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

function buildSearchParams(filters: RunsFilters, page: number): string {
    const params = new URLSearchParams();

    if (filters.game) params.set('game', filters.game);
    if (filters.category) params.set('category', filters.category);
    if (filters.username) params.set('username', filters.username);
    if (filters.isPb) params.set('isPb', 'true');
    if (filters.minTime) params.set('minTime', filters.minTime);
    if (filters.maxTime) params.set('maxTime', filters.maxTime);
    if (filters.afterDate) params.set('afterDate', filters.afterDate);
    if (filters.beforeDate) params.set('beforeDate', filters.beforeDate);
    if (filters.sort && filters.sort !== DEFAULT_FILTERS.sort) {
        params.set('sort', filters.sort);
    }
    if (page > 1) params.set('page', String(page));

    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

function hasTextFilterChange(partial: Partial<RunsFilters>): boolean {
    return Object.keys(partial).some((key) =>
        TEXT_FILTER_KEYS.includes(key as keyof RunsFilters),
    );
}

export function RunsExplorer() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [filters, setFilters] = useState<RunsFilters>(() =>
        filtersFromParams(searchParams),
    );
    const [page, setPage] = useState(() => pageFromParams(searchParams));
    const [data, setData] = useState<FinishedRunsResult | null>(null);

    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const mountedRef = useRef(false);

    // Fetch runs with the given filters + page
    function fetchRuns(f: RunsFilters, p: number) {
        startTransition(async () => {
            try {
                const minTime = parseDuration(f.minTime) ?? undefined;
                const maxTime = parseDuration(f.maxTime) ?? undefined;

                const result = await searchFinishedRuns({
                    game: f.game || undefined,
                    category: f.category || undefined,
                    username: f.username || undefined,
                    isPb: f.isPb || undefined,
                    minTime,
                    maxTime,
                    afterDate: f.afterDate || undefined,
                    beforeDate: f.beforeDate || undefined,
                    sort: f.sort,
                    page: p,
                });
                setData(result);
            } catch (error) {
                console.error('Failed to fetch runs:', error);
            }
        });
    }

    // Initial fetch on mount
    useEffect(() => {
        fetchRuns(filters, page);
        mountedRef.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync URL when filters/page change (skip initial mount)
    useEffect(() => {
        if (!mountedRef.current) return;
        const path = `/runs${buildSearchParams(filters, page)}`;
        router.replace(path, { scroll: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, page]);

    function handleFilterChange(partial: Partial<RunsFilters>) {
        const next = { ...filters, ...partial };
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

    return (
        <div className={styles.explorer}>
            <div className={styles.header}>
                <h1>Runs Explorer</h1>
            </div>
            <FilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearAll={handleClearAll}
                isPending={isPending}
            />
            <RunsTable
                runs={data?.items ?? null}
                isLoading={isPending}
                sort={filters.sort}
                onSortChange={handleSortChange}
                onClearFilters={handleClearAll}
            />
            {data && (page > 1 || data.hasMore) && (
                <RunsPagination
                    page={page}
                    hasMore={data.hasMore}
                    onPageChange={handlePageChange}
                />
            )}
        </div>
    );
}
