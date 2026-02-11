'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useState } from 'react';
import { Button } from 'react-bootstrap';
import useSWR from 'swr';
import { fetcher } from '~src/utils/fetcher';
import { AggregateBar } from './aggregate-bar';
import { buildQueryUrl } from './build-query-url';
import { FilterBar } from './filter-bar';
import { Presets } from './presets';
import { ResultsTable } from './results-table';

export type DataSource = 'runs' | 'finished-runs';
export type AggregateMode = 'none' | 'count' | 'sum' | 'avg';
export type GroupBy = '' | 'username' | 'game' | 'category';

export interface Filters {
    dataSource: DataSource;
    game: string;
    category: string;
    username: string;
    afterDate: string;
    beforeDate: string;
    isPb: '' | 'true' | 'false';
    minAttempts: string;
    maxAttempts: string;
    topGames: string;
    topCategories: string;
    aggregate: AggregateMode;
    aggregateColumn: string;
    groupBy: GroupBy;
    limit: string;
    sort: string;
}

export const DEFAULT_FILTERS: Filters = {
    dataSource: 'runs',
    game: '',
    category: '',
    username: '',
    afterDate: '',
    beforeDate: '',
    isPb: '',
    minAttempts: '',
    maxAttempts: '',
    topGames: '',
    topCategories: '',
    aggregate: 'none',
    aggregateColumn: '',
    groupBy: '',
    limit: '50',
    sort: '',
};

export function DataExplorer() {
    return (
        <Suspense>
            <DataExplorerInner />
        </Suspense>
    );
}

function DataExplorerInner() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [filters, setFilters] = useState<Filters>(() => {
        const initial = { ...DEFAULT_FILTERS };
        for (const key of Object.keys(DEFAULT_FILTERS) as (keyof Filters)[]) {
            const val = searchParams.get(key);
            if (val) (initial[key] as string) = val;
        }
        return initial;
    });

    // Auto-submit if URL had params
    const [submittedFilters, setSubmittedFilters] = useState<Filters | null>(
        () => {
            const hasParams = Array.from(searchParams.entries()).some(
                ([key, val]) =>
                    key in DEFAULT_FILTERS &&
                    val !== (DEFAULT_FILTERS as any)[key],
            );
            return hasParams ? filters : null;
        },
    );

    const apiUrl = submittedFilters ? buildQueryUrl(submittedFilters) : '';
    const { data, error, isLoading } = useSWR(apiUrl || null, fetcher);

    const updateUrl = (f: Filters) => {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(f)) {
            if (value && value !== (DEFAULT_FILTERS as any)[key]) {
                params.set(key, value);
            }
        }
        const qs = params.toString();
        router.replace(qs ? `/data?${qs}` : '/data', { scroll: false });
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleSearch = () => {
        setSubmittedFilters({ ...filters });
        updateUrl(filters);
    };

    const handleReset = () => {
        setFilters(DEFAULT_FILTERS);
        setSubmittedFilters(null);
        router.replace('/data', { scroll: false });
    };

    const handlePreset = (presetFilters: Record<string, string>) => {
        const newFilters = { ...DEFAULT_FILTERS, ...presetFilters } as Filters;
        setFilters(newFilters);
        setSubmittedFilters(newFilters);
        updateUrl(newFilters);
    };

    const isAggregate =
        submittedFilters?.aggregate !== undefined &&
        submittedFilters?.aggregate !== 'none';

    return (
        <div className="d-flex flex-column gap-3">
            <FilterBar filters={filters} onChange={handleFilterChange} />
            <AggregateBar
                dataSource={filters.dataSource}
                aggregate={filters.aggregate}
                aggregateColumn={filters.aggregateColumn}
                groupBy={filters.groupBy}
                limit={filters.limit}
                onChange={handleFilterChange}
            />
            <Presets onApply={handlePreset} />
            <div className="d-flex gap-2 align-items-center">
                <Button variant="primary" onClick={handleSearch}>
                    Search
                </Button>
                <Button variant="outline-secondary" onClick={handleReset}>
                    Reset
                </Button>
                {apiUrl && (
                    <code className="small text-secondary text-truncate">
                        {apiUrl}
                    </code>
                )}
            </div>
            <ResultsTable
                data={data}
                isLoading={isLoading}
                error={error}
                isAggregate={isAggregate}
                aggregateColumn={submittedFilters?.aggregateColumn || ''}
                apiUrl={apiUrl}
            />
        </div>
    );
}
