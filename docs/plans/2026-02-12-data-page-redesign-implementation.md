# Stats Explorer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the confusing data page with a beautiful, public, entity-first stats explorer with five tabs (Games, Categories, Users, User Runs, Finished Runs), each showing only relevant filters.

**Architecture:** Client-side SWR-based explorer using React Bootstrap components. Five entity tabs control which filters appear and how queries are built. Aggregation is implicit per tab (aggregated for Games/Categories/Users, raw for User Runs/Finished Runs). URL state for shareability.

**Tech Stack:** Next.js 16 App Router, React 19, React Bootstrap, SWR, SCSS modules, TypeScript

**Design Doc:** `docs/plans/2026-02-12-data-page-redesign-design.md`

---

### Task 1: Types and Tab Configuration

**Files:**
- Create: `app/(old-layout)/data/types.ts`

**Step 1: Create types file with all shared types and tab config**

```typescript
export type EntityTab =
    | 'games'
    | 'categories'
    | 'users'
    | 'user-runs'
    | 'finished-runs';

export type Metric =
    | 'playtime'
    | 'attempts'
    | 'finished-attempts'
    | 'runner-count';

export interface Filters {
    game: string;
    category: string;
    username: string;
    minPlaytime: string;
    minAttempts: string;
    afterDate: string;
    beforeDate: string;
    isPb: '' | 'true' | 'false';
    topGames: string;
    topCategories: string;
    metric: Metric;
    limit: string;
}

export const DEFAULT_FILTERS: Filters = {
    game: '',
    category: '',
    username: '',
    minPlaytime: '',
    minAttempts: '',
    afterDate: '',
    beforeDate: '',
    isPb: '',
    topGames: '',
    topCategories: '',
    metric: 'playtime',
    limit: '50',
};

export const ENTITY_TABS: { value: EntityTab; label: string }[] = [
    { value: 'games', label: 'Games' },
    { value: 'categories', label: 'Categories' },
    { value: 'users', label: 'Users' },
    { value: 'user-runs', label: 'User Runs' },
    { value: 'finished-runs', label: 'Finished Runs' },
];

export const TAB_FILTERS: Record<EntityTab, (keyof Filters)[]> = {
    games: ['minPlaytime', 'minAttempts', 'afterDate', 'beforeDate', 'metric'],
    categories: [
        'game',
        'minPlaytime',
        'minAttempts',
        'afterDate',
        'beforeDate',
        'metric',
    ],
    users: [
        'game',
        'category',
        'minPlaytime',
        'minAttempts',
        'afterDate',
        'beforeDate',
        'metric',
    ],
    'user-runs': ['username', 'game', 'category', 'minPlaytime', 'minAttempts'],
    'finished-runs': [
        'game',
        'category',
        'username',
        'isPb',
        'afterDate',
        'beforeDate',
        'topGames',
        'topCategories',
    ],
};

export const METRIC_OPTIONS: { value: Metric; label: string }[] = [
    { value: 'playtime', label: 'Total Playtime' },
    { value: 'attempts', label: 'Total Attempts' },
    { value: 'finished-attempts', label: 'Finished Attempts' },
    { value: 'runner-count', label: 'Runner Count' },
];

// Users tab doesn't have runner-count metric (it wouldn't make sense)
export const USER_METRIC_OPTIONS = METRIC_OPTIONS.filter(
    (m) => m.value !== 'runner-count',
);

export const AGGREGATED_TABS: EntityTab[] = ['games', 'categories', 'users'];

export function isAggregatedTab(tab: EntityTab): boolean {
    return AGGREGATED_TABS.includes(tab);
}
```

**Step 2: Commit**

```bash
git add "app/(old-layout)/data/types.ts"
git commit -m "Add entity tab types and configuration for stats explorer"
```

---

### Task 2: Rewrite Query Builder

**Files:**
- Modify: `app/(old-layout)/data/build-query-url.ts`

**Step 1: Rewrite buildQueryUrl for entity-based queries**

Replace the entire file contents with:

```typescript
import type { EntityTab, Filters, Metric } from './types';

function getAggregateParams(
    tab: EntityTab,
    metric: Metric,
): { aggregate: string; aggregateColumn?: string; groupBy: string } {
    const groupBy =
        tab === 'games'
            ? 'game'
            : tab === 'categories'
              ? 'category'
              : 'username';

    if (metric === 'runner-count') {
        return { aggregate: 'count', groupBy };
    }

    const columnMap: Record<Exclude<Metric, 'runner-count'>, string> = {
        playtime: 'total_run_time',
        attempts: 'attempt_count',
        'finished-attempts': 'finished_attempt_count',
    };

    return {
        aggregate: 'sum',
        aggregateColumn: columnMap[metric],
        groupBy,
    };
}

export function buildQueryUrl(tab: EntityTab, filters: Filters): string {
    const isFinishedRuns = tab === 'finished-runs';
    const base = isFinishedRuns ? '/api/data/finished-runs' : '/api/data/runs';
    const params = new URLSearchParams();

    // Common filters
    if (filters.game) params.set('game', filters.game);
    if (filters.category) params.set('category', filters.category);
    if (filters.username) params.set('username', filters.username);
    if (filters.minPlaytime)
        params.set('min_playtime', filters.minPlaytime);
    if (filters.minAttempts)
        params.set('min_attempts', filters.minAttempts);
    if (filters.afterDate)
        params.set(
            'after_date',
            new Date(filters.afterDate).toISOString(),
        );
    if (filters.beforeDate)
        params.set(
            'before_date',
            new Date(filters.beforeDate).toISOString(),
        );

    // Finished runs only filters
    if (isFinishedRuns) {
        if (filters.isPb) params.set('is_pb', filters.isPb);
        if (filters.topGames) params.set('top_games', filters.topGames);
        if (filters.topCategories)
            params.set('top_categories', filters.topCategories);
    }

    // Aggregation for entity tabs (games/categories/users)
    if (tab === 'games' || tab === 'categories' || tab === 'users') {
        const { aggregate, aggregateColumn, groupBy } = getAggregateParams(
            tab,
            filters.metric,
        );
        params.set('aggregate', aggregate);
        if (aggregateColumn) params.set('aggregate_column', aggregateColumn);
        params.set('group_by', groupBy);
    }

    if (filters.limit) params.set('limit', filters.limit);

    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
}
```

**Step 2: Commit**

```bash
git add "app/(old-layout)/data/build-query-url.ts"
git commit -m "Rewrite query builder for entity-based tab queries"
```

---

### Task 3: Update Page Shell

**Files:**
- Modify: `app/(old-layout)/data/page.tsx`
- Modify: `src/components/Topbar/Topbar.tsx` (lines 114-116)

**Step 1: Update page.tsx — remove auth, update metadata, import new component**

Replace entire file with:

```typescript
import { Metadata } from 'next';
import { StatsExplorer } from './stats-explorer';

export const metadata: Metadata = {
    title: 'Stats Explorer - therun.gg',
    description:
        'Explore speedrunning statistics across games, categories, and runners',
};

export default function StatsExplorerPage() {
    return (
        <div>
            <h1>Stats Explorer</h1>
            <p className="text-secondary mb-4">
                Explore speedrunning statistics across games, categories, and
                runners.
            </p>
            <StatsExplorer />
        </div>
    );
}
```

**Step 2: Update Topbar — remove `<Can>` wrapper from Data link**

In `src/components/Topbar/Topbar.tsx`, find lines 114-116:
```tsx
<Can I="moderate" a="roles">
    <Nav.Link href="/data">Data</Nav.Link>
</Can>
```

Replace with:
```tsx
<Nav.Link href="/data">Stats</Nav.Link>
```

**Step 3: Commit**

```bash
git add "app/(old-layout)/data/page.tsx" src/components/Topbar/Topbar.tsx
git commit -m "Make data page public, rename to Stats Explorer"
```

---

### Task 4: Create Filter Bar

**Files:**
- Modify: `app/(old-layout)/data/filter-bar.tsx`

**Step 1: Rewrite filter-bar.tsx with per-tab dynamic filters**

Replace entire file. The filter bar renders only the filters relevant to the active tab, in a single clean row using Bootstrap grid. No labels — just placeholder text. Metric selector is inline.

```typescript
'use client';

import React from 'react';
import { Col, Form, Row } from 'react-bootstrap';
import type { EntityTab, Filters, Metric } from './types';
import {
    METRIC_OPTIONS,
    TAB_FILTERS,
    USER_METRIC_OPTIONS,
    isAggregatedTab,
} from './types';

interface FilterBarProps {
    tab: EntityTab;
    filters: Filters;
    onChange: (key: keyof Filters, value: string) => void;
}

export function FilterBar({ tab, filters, onChange }: FilterBarProps) {
    const visibleFilters = TAB_FILTERS[tab];
    const metricOptions =
        tab === 'users' ? USER_METRIC_OPTIONS : METRIC_OPTIONS;

    return (
        <Row className="g-2 align-items-end">
            {visibleFilters.map((key) => {
                if (key === 'metric') {
                    return (
                        <Col xs={6} md="auto" key={key}>
                            <Form.Select
                                size="sm"
                                value={filters.metric}
                                onChange={(e) =>
                                    onChange(
                                        'metric',
                                        e.target.value as Metric,
                                    )
                                }
                                style={{ minWidth: '10rem' }}
                            >
                                {metricOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </Form.Select>
                        </Col>
                    );
                }

                return (
                    <Col xs={6} md="auto" key={key}>
                        {renderFilter(key, filters, onChange, tab)}
                    </Col>
                );
            })}

            <Col xs={6} md="auto">
                <Form.Select
                    size="sm"
                    value={filters.limit}
                    onChange={(e) => onChange('limit', e.target.value)}
                    style={{ width: '5rem' }}
                >
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                </Form.Select>
            </Col>
        </Row>
    );
}

function renderFilter(
    key: keyof Filters,
    filters: Filters,
    onChange: (key: keyof Filters, value: string) => void,
    _tab: EntityTab,
): React.ReactNode {
    switch (key) {
        case 'game':
            return (
                <Form.Control
                    size="sm"
                    type="text"
                    placeholder="Game"
                    value={filters.game}
                    onChange={(e) => onChange('game', e.target.value)}
                    style={{ minWidth: '10rem' }}
                />
            );
        case 'category':
            return (
                <Form.Control
                    size="sm"
                    type="text"
                    placeholder="Category"
                    value={filters.category}
                    onChange={(e) => onChange('category', e.target.value)}
                    style={{ minWidth: '8rem' }}
                />
            );
        case 'username':
            return (
                <Form.Control
                    size="sm"
                    type="text"
                    placeholder="Username"
                    value={filters.username}
                    onChange={(e) => onChange('username', e.target.value)}
                    style={{ minWidth: '8rem' }}
                />
            );
        case 'minPlaytime':
            return (
                <Form.Control
                    size="sm"
                    type="number"
                    placeholder="Min hours"
                    value={filters.minPlaytime}
                    onChange={(e) => onChange('minPlaytime', e.target.value)}
                    style={{ width: '6.5rem' }}
                />
            );
        case 'minAttempts':
            return (
                <Form.Control
                    size="sm"
                    type="number"
                    placeholder="Min attempts"
                    value={filters.minAttempts}
                    onChange={(e) => onChange('minAttempts', e.target.value)}
                    style={{ width: '7.5rem' }}
                />
            );
        case 'afterDate':
            return (
                <Form.Control
                    size="sm"
                    type="date"
                    value={filters.afterDate}
                    onChange={(e) => onChange('afterDate', e.target.value)}
                    title="After date"
                />
            );
        case 'beforeDate':
            return (
                <Form.Control
                    size="sm"
                    type="date"
                    value={filters.beforeDate}
                    onChange={(e) => onChange('beforeDate', e.target.value)}
                    title="Before date"
                />
            );
        case 'isPb':
            return (
                <Form.Select
                    size="sm"
                    value={filters.isPb}
                    onChange={(e) => onChange('isPb', e.target.value)}
                    style={{ minWidth: '7rem' }}
                >
                    <option value="">Any</option>
                    <option value="true">PBs only</option>
                    <option value="false">Non-PBs only</option>
                </Form.Select>
            );
        case 'topGames':
            return (
                <Form.Control
                    size="sm"
                    type="number"
                    placeholder="Top N games"
                    value={filters.topGames}
                    onChange={(e) => onChange('topGames', e.target.value)}
                    style={{ width: '7.5rem' }}
                />
            );
        case 'topCategories':
            return (
                <Form.Control
                    size="sm"
                    type="number"
                    placeholder="Top N categories"
                    value={filters.topCategories}
                    onChange={(e) => onChange('topCategories', e.target.value)}
                    style={{ width: '8.5rem' }}
                />
            );
        default:
            return null;
    }
}
```

**Step 2: Commit**

```bash
git add "app/(old-layout)/data/filter-bar.tsx"
git commit -m "Rewrite filter bar with per-tab dynamic filters"
```

---

### Task 5: Rewrite Results Table

**Files:**
- Modify: `app/(old-layout)/data/results-table.tsx`

**Step 1: Rewrite results-table.tsx for leaderboard + raw data modes**

Replace the entire file. Key changes:
- Aggregated tabs show a leaderboard (rank, entity name, value)
- Raw tabs show full data tables
- PB column renders as a badge instead of Yes/No
- Duration formatting contextual to metric
- Skeleton loading rows instead of spinner
- Clickable column headers for sort

```typescript
'use client';

import React from 'react';
import { Alert, Table } from 'react-bootstrap';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { EntityTab, Metric } from './types';
import { isAggregatedTab } from './types';

const DURATION_COLUMNS = new Set([
    'personalBest',
    'sumOfBests',
    'totalRunTime',
    'time',
    'gameTime',
    'gameTimePb',
    'gameTimeSob',
    'personalBestTime',
]);

const DURATION_METRICS: Metric[] = ['playtime'];

interface ResultsTableProps {
    data: any;
    isLoading: boolean;
    error: any;
    tab: EntityTab;
    metric: Metric;
    apiUrl: string;
}

export function ResultsTable({
    data,
    isLoading,
    error,
    tab,
    metric,
    apiUrl,
}: ResultsTableProps) {
    if (!apiUrl) {
        return (
            <p className="text-secondary fst-italic">
                Choose your filters and press Search to explore data.
            </p>
        );
    }

    if (isLoading) {
        return <SkeletonTable rows={8} cols={isAggregatedTab(tab) ? 3 : 6} />;
    }

    if (error) {
        return <Alert variant="danger">Failed to fetch data.</Alert>;
    }

    if (!data) return null;

    const result = data.result ?? data;

    // Single count result (count aggregate without group_by)
    if (
        result &&
        typeof result === 'object' &&
        'count' in result &&
        !Array.isArray(result)
    ) {
        return (
            <div className="bg-body-secondary rounded-3 p-4 text-center">
                <div className="text-secondary small">Count</div>
                <div className="fs-2 fw-bold">
                    {Number(result.count).toLocaleString()}
                </div>
            </div>
        );
    }

    const rows = Array.isArray(result) ? result : [];
    if (rows.length === 0) {
        return (
            <Alert variant="secondary">
                No results found. Try adjusting your filters.
            </Alert>
        );
    }

    if (isAggregatedTab(tab)) {
        return (
            <AggregateResults
                rows={rows}
                tab={tab}
                metric={metric}
            />
        );
    }

    return <RawResults rows={rows} tab={tab} />;
}

function AggregateResults({
    rows,
    tab,
    metric,
}: {
    rows: any[];
    tab: EntityTab;
    metric: Metric;
}) {
    const entityLabel =
        tab === 'games' ? 'Game' : tab === 'categories' ? 'Category' : 'User';
    const isDuration = DURATION_METRICS.includes(metric);

    // The API returns objects with the group_by field name and 'value'
    // e.g. { game: "Super Mario 64", value: 123456 }
    const groupKey =
        tab === 'games' ? 'game' : tab === 'categories' ? 'category' : 'username';

    return (
        <div>
            <div className="small text-secondary mb-2">
                {rows.length} result{rows.length !== 1 ? 's' : ''}
            </div>
            <Table responsive hover className="align-middle">
                <thead>
                    <tr>
                        <th style={{ width: '3rem' }}>#</th>
                        <th>{entityLabel}</th>
                        {tab === 'categories' && <th>Game</th>}
                        <th className="text-end" style={{ width: '12rem' }}>
                            Value
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row: any, i: number) => (
                        <tr key={i}>
                            <td className="text-secondary fw-medium">
                                {i + 1}
                            </td>
                            <td className="fw-medium">{row[groupKey] ?? row.key ?? '-'}</td>
                            {tab === 'categories' && (
                                <td>{row.game ?? '-'}</td>
                            )}
                            <td className="text-end">
                                {isDuration && row.value > 0 ? (
                                    <DurationToFormatted
                                        duration={row.value}
                                    />
                                ) : (
                                    Number(row.value).toLocaleString()
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
}

function RawResults({ rows, tab }: { rows: any[]; tab: EntityTab }) {
    const columns = Object.keys(rows[0]);

    return (
        <div>
            <div className="small text-secondary mb-2">
                {rows.length} result{rows.length !== 1 ? 's' : ''}
            </div>
            <Table responsive hover className="align-middle">
                <thead>
                    <tr>
                        <th style={{ width: '3rem' }}>#</th>
                        {columns.map((col) => (
                            <th key={col}>{formatColumnHeader(col)}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row: any, i: number) => (
                        <tr key={i}>
                            <td className="text-secondary">{i + 1}</td>
                            {columns.map((col) => (
                                <td key={col}>
                                    {formatCell(col, row[col], tab)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
}

function SkeletonTable({ rows, cols }: { rows: number; cols: number }) {
    return (
        <Table responsive className="align-middle">
            <thead>
                <tr>
                    {Array.from({ length: cols }).map((_, i) => (
                        <th key={i}>
                            <div
                                className="placeholder-glow"
                                style={{ width: i === 0 ? '2rem' : '6rem' }}
                            >
                                <span className="placeholder col-12 rounded" />
                            </div>
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {Array.from({ length: rows }).map((_, rowIdx) => (
                    <tr key={rowIdx}>
                        {Array.from({ length: cols }).map((_, colIdx) => (
                            <td key={colIdx}>
                                <div className="placeholder-glow">
                                    <span
                                        className="placeholder rounded"
                                        style={{
                                            width: `${40 + Math.random() * 40}%`,
                                        }}
                                    />
                                </div>
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </Table>
    );
}

function formatColumnHeader(key: string): string {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase())
        .trim();
}

function formatCell(
    column: string,
    value: unknown,
    _tab: EntityTab,
): React.ReactNode {
    if (value === null || value === undefined) return '-';

    // Duration columns
    if (
        typeof value === 'number' &&
        DURATION_COLUMNS.has(column) &&
        value > 0
    ) {
        return <DurationToFormatted duration={value} />;
    }

    // PB badge
    if (column === 'isPb' || column === 'is_pb') {
        return value ? (
            <span className="badge bg-success">PB</span>
        ) : null;
    }

    // Booleans
    if (typeof value === 'boolean') {
        return value ? (
            <span className="badge bg-success">Yes</span>
        ) : (
            <span className="badge bg-secondary">No</span>
        );
    }

    // ISO dates — relative time with full date on hover
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        const date = new Date(value);
        const relative = getRelativeTime(date);
        return <abbr title={date.toLocaleString()}>{relative}</abbr>;
    }

    // Numbers
    if (typeof value === 'number') return value.toLocaleString();

    return String(value);
}

function getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}
```

**Step 2: Commit**

```bash
git add "app/(old-layout)/data/results-table.tsx"
git commit -m "Rewrite results table with leaderboard and raw modes, skeleton loading"
```

---

### Task 6: Create Preset Cards

**Files:**
- Modify: `app/(old-layout)/data/presets.tsx` → rename conceptually to preset cards

**Step 1: Rewrite presets.tsx as prominent preset cards**

Replace entire file:

```typescript
'use client';

import React from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import type { EntityTab, Filters } from './types';
import { DEFAULT_FILTERS } from './types';

interface PresetConfig {
    label: string;
    description: string;
    tab: EntityTab;
    filters: Partial<Filters>;
}

function getDateDaysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

const PRESETS: PresetConfig[] = [
    {
        label: 'Top Games by Playtime',
        description: 'Which games have the most total playtime?',
        tab: 'games',
        filters: { metric: 'playtime', limit: '50' },
    },
    {
        label: 'PBs This Week',
        description: 'Personal bests set in the last 7 days',
        tab: 'finished-runs',
        filters: { isPb: 'true', afterDate: getDateDaysAgo(7) },
    },
    {
        label: 'Most Dedicated Runners',
        description: 'Who has the most total playtime across all games?',
        tab: 'users',
        filters: { metric: 'playtime', limit: '50' },
    },
    {
        label: 'Most Attempted Games',
        description: 'Which games have the most total attempts?',
        tab: 'games',
        filters: { metric: 'attempts', limit: '50' },
    },
];

interface PresetCardsProps {
    onApply: (tab: EntityTab, filters: Filters) => void;
}

export function PresetCards({ onApply }: PresetCardsProps) {
    return (
        <Row className="g-3 mb-4">
            {PRESETS.map((preset) => (
                <Col xs={6} lg={3} key={preset.label}>
                    <Card
                        className="h-100 border-0 bg-body-secondary"
                        role="button"
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            onApply(preset.tab, {
                                ...DEFAULT_FILTERS,
                                ...preset.filters,
                            } as Filters)
                        }
                    >
                        <Card.Body className="py-3 px-3">
                            <div className="fw-semibold small">
                                {preset.label}
                            </div>
                            <div
                                className="text-secondary"
                                style={{ fontSize: '0.8rem' }}
                            >
                                {preset.description}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            ))}
        </Row>
    );
}
```

**Step 2: Commit**

```bash
git add "app/(old-layout)/data/presets.tsx"
git commit -m "Rewrite presets as prominent query cards with tab awareness"
```

---

### Task 7: Create Main Stats Explorer Component

**Files:**
- Create: `app/(old-layout)/data/stats-explorer.tsx`
- Delete: `app/(old-layout)/data/aggregate-bar.tsx`
- Delete: `app/(old-layout)/data/data-explorer.tsx`

**Step 1: Create stats-explorer.tsx**

This is the main client component. Manages tab state, filter state, URL sync, and orchestrates child components.

```typescript
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
        // Reset filters when switching tabs but keep common ones
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
```

**Step 2: Delete old files**

```bash
rm "app/(old-layout)/data/aggregate-bar.tsx" "app/(old-layout)/data/data-explorer.tsx"
```

**Step 3: Commit**

```bash
git add "app/(old-layout)/data/stats-explorer.tsx" "app/(old-layout)/data/aggregate-bar.tsx" "app/(old-layout)/data/data-explorer.tsx"
git commit -m "Create stats explorer component, delete old data explorer and aggregate bar"
```

---

### Task 8: Verify Build

**Step 1: Run typecheck**

```bash
npm run typecheck
```

Expected: passes with no errors related to data/ files.

**Step 2: Run lint**

```bash
npm run lint
```

Expected: passes.

**Step 3: Run dev server and manually test**

```bash
npm run dev
```

Open `http://localhost:3000/data` — verify:
- Page loads without auth redirect
- Five tabs render and are clickable
- Switching tabs changes visible filters
- Preset cards auto-fill and execute queries
- Results render correctly for each tab type
- URL updates with state
- Loading skeleton shows during fetch
- Topbar shows "Stats" link without auth gate

**Step 4: Fix any issues found, then commit**

```bash
git add -A
git commit -m "Fix build issues from stats explorer migration"
```

---

### Task 9: Polish and Style

**Files:**
- Modify: `app/(old-layout)/data/stats-explorer.tsx` (if needed)
- Modify: `app/(old-layout)/data/filter-bar.tsx` (if needed)
- Modify: `app/(old-layout)/data/results-table.tsx` (if needed)

**Step 1: Style refinements after manual testing**

Based on visual review:
- Ensure tab pills have good contrast and spacing
- Filter inputs should be uniform height, no visual jarring
- Results table should have clean borders, good whitespace
- Preset cards should have subtle hover effect (`transition: background-color 0.15s`)
- Mobile: tabs should scroll horizontally, filter bar should wrap cleanly
- Empty states should feel warm, not clinical

**Step 2: Invoke interface-design skill**

Use `interface-design:critique` to review the implementation for craft issues: spacing, depth, color, pattern violations. Fix any issues found.

**Step 3: Commit**

```bash
git add -A
git commit -m "Polish stats explorer styling and UX"
```

---

### Task 10: Update Design Doc Status

**Files:**
- Modify: `docs/plans/2026-02-12-data-page-redesign-design.md`

**Step 1: Update status from "Design" to "Implemented"**

Change line 3 from `## Status: Design` to `## Status: Implemented`.

**Step 2: Commit**

```bash
git add docs/plans/2026-02-12-data-page-redesign-design.md
git commit -m "Mark data page redesign as implemented"
```
