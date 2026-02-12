'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useCallback, useState } from 'react';
import { Button, Nav } from 'react-bootstrap';
import useSWR from 'swr';
import { fetcher } from '~src/utils/fetcher';
import { buildQueryUrl } from './build-query-url';
import { FilterBar } from './filter-bar';
import { PresetCards } from './presets';
import { ResultsTable } from './results-table';
import type { EntityTab, Filters } from './types';
import { DEFAULT_FILTERS, ENTITY_TABS } from './types';

export function StatsExplorer() {
    return (
        <Suspense>
            <StatsExplorerInner />
        </Suspense>
    );
}

function StatsExplorerInner() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [tab, setTab] = useState<EntityTab>(() => {
        const t = searchParams.get('tab');
        if (t && ENTITY_TABS.some((et) => et.value === t)) {
            return t as EntityTab;
        }
        return 'games';
    });

    const [filters, setFilters] = useState<Filters>(() => {
        const initial = { ...DEFAULT_FILTERS };
        for (const key of Object.keys(DEFAULT_FILTERS) as (keyof Filters)[]) {
            const val = searchParams.get(key);
            if (val) (initial[key] as string) = val;
        }
        return initial;
    });

    const [submittedFilters, setSubmittedFilters] = useState<{
        tab: EntityTab;
        filters: Filters;
    } | null>(() => {
        const hasParams = Array.from(searchParams.entries()).some(
            ([key, val]) =>
                (key === 'tab' && val !== 'games') ||
                (key in DEFAULT_FILTERS &&
                    val !== (DEFAULT_FILTERS as any)[key]),
        );
        return hasParams ? { tab, filters } : null;
    });

    const apiUrl = submittedFilters
        ? buildQueryUrl(submittedFilters.tab, submittedFilters.filters)
        : '';
    const { data, error, isLoading } = useSWR(apiUrl || null, fetcher);

    const updateUrl = useCallback(
        (t: EntityTab, f: Filters) => {
            const params = new URLSearchParams();
            if (t !== 'games') params.set('tab', t);
            for (const [key, value] of Object.entries(f)) {
                if (value && value !== (DEFAULT_FILTERS as any)[key]) {
                    params.set(key, value);
                }
            }
            const qs = params.toString();
            router.replace(qs ? `/data?${qs}` : '/data', { scroll: false });
        },
        [router],
    );

    const handleTabChange = (newTab: EntityTab) => {
        setTab(newTab);
        setFilters((prev) => ({
            ...DEFAULT_FILTERS,
            game: prev.game,
            category: prev.category,
            username: prev.username,
        }));
    };

    const handleFilterChange = (key: keyof Filters, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleSearch = () => {
        setSubmittedFilters({ tab, filters });
        updateUrl(tab, filters);
    };

    const handleReset = () => {
        setFilters(DEFAULT_FILTERS);
        setTab('games');
        setSubmittedFilters(null);
        router.replace('/data', { scroll: false });
    };

    const handlePreset = (presetTab: EntityTab, presetFilters: Filters) => {
        setTab(presetTab);
        setFilters(presetFilters);
        setSubmittedFilters({ tab: presetTab, filters: presetFilters });
        updateUrl(presetTab, presetFilters);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="d-flex flex-column gap-3" onKeyDown={handleKeyDown}>
            <PresetCards onApply={handlePreset} />

            <Nav
                variant="pills"
                activeKey={tab}
                onSelect={(k) => k && handleTabChange(k as EntityTab)}
                className="gap-1"
            >
                {ENTITY_TABS.map((t) => (
                    <Nav.Item key={t.value}>
                        <Nav.Link eventKey={t.value} className="py-1 px-3">
                            {t.label}
                        </Nav.Link>
                    </Nav.Item>
                ))}
            </Nav>

            <div className="bg-body-secondary rounded-3 p-3">
                <div className="d-flex flex-column gap-2">
                    <FilterBar
                        tab={tab}
                        filters={filters}
                        onChange={handleFilterChange}
                    />
                    <div className="d-flex gap-2 align-items-center mt-1">
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleSearch}
                        >
                            Search
                        </Button>
                        <button
                            type="button"
                            className="btn btn-link btn-sm text-secondary text-decoration-none p-0"
                            onClick={handleReset}
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            <ResultsTable
                data={data}
                isLoading={isLoading}
                error={error}
                tab={submittedFilters?.tab ?? tab}
                metric={submittedFilters?.filters.metric ?? filters.metric}
                apiUrl={apiUrl}
            />
        </div>
    );
}
