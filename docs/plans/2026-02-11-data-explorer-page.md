# Data Explorer Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a datdota-style data explorer page at `/data` that lets users build dynamic queries against the `/v1/runs` and `/v1/finished-runs` API endpoints with filters, aggregation, group-by, and sortable result tables.

**Architecture:** A single client component page under `app/(old-layout)/data/`. The page has a filter bar (game, category, username, date range, toggles), an aggregate control bar (mode, column, group-by), and a results area that renders either a data table or a single count value. All API calls go through SWR with a URL built from the current filter/aggregate state. Preset buttons provide one-click access to common queries.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Bootstrap 5, React-Bootstrap, SWR, react-datepicker, `DurationToFormatted` component for time values.

**API docs:** See `src/query/API_ENDPOINTS.md` in the backend repo for the full parameter reference.

---

### Task 1: Create page route and layout

**Files:**
- Create: `app/(old-layout)/data/page.tsx`
- Create: `app/(old-layout)/data/data-explorer.tsx`

**Step 1: Create the server page component**

```tsx
// app/(old-layout)/data/page.tsx
import { Metadata } from 'next';
import { DataExplorer } from './data-explorer';

export const metadata: Metadata = {
    title: 'Data Explorer - therun.gg',
    description: 'Explore speedrunning statistics with custom queries',
};

export default function DataExplorerPage() {
    return (
        <div>
            <h1>Data Explorer</h1>
            <p className="text-secondary">
                Build custom queries to explore speedrunning data.
            </p>
            <DataExplorer />
        </div>
    );
}
```

**Step 2: Create the client component shell**

```tsx
// app/(old-layout)/data/data-explorer.tsx
'use client';

import React, { useState } from 'react';

type DataSource = 'runs' | 'finished-runs';
type AggregateMode = 'none' | 'count' | 'sum' | 'avg';
type GroupBy = '' | 'username' | 'game' | 'category';

interface Filters {
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

const DEFAULT_FILTERS: Filters = {
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
    const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

    return (
        <div className="d-flex flex-column gap-3">
            {/* Task 2: FilterBar */}
            {/* Task 3: AggregateBar */}
            {/* Task 5: PresetButtons */}
            {/* Task 4: ResultsTable */}
        </div>
    );
}
```

**Step 3: Verify it renders**

Run: `npm run dev` and visit `/data`. Should show the heading and empty page shell.

**Step 4: Commit**

```bash
git add app/\(old-layout\)/data/
git commit -m "feat: add data explorer page shell"
```

---

### Task 2: Build the filter bar

**Files:**
- Create: `app/(old-layout)/data/filter-bar.tsx`
- Modify: `app/(old-layout)/data/data-explorer.tsx`

**Step 1: Create the FilterBar component**

```tsx
// app/(old-layout)/data/filter-bar.tsx
'use client';

import React from 'react';
import { Col, Form, Row } from 'react-bootstrap';

type DataSource = 'runs' | 'finished-runs';

interface FilterBarProps {
    filters: {
        dataSource: DataSource;
        game: string;
        category: string;
        username: string;
        afterDate: string;
        beforeDate: string;
        isPb: string;
        minAttempts: string;
        maxAttempts: string;
        topGames: string;
        topCategories: string;
    };
    onChange: (key: string, value: string) => void;
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
    return (
        <div className="bg-body-secondary rounded-3 p-3">
            <Row className="g-2 mb-2">
                <Col xs={12} md={3}>
                    <Form.Label className="small text-secondary mb-1">
                        Data Source
                    </Form.Label>
                    <Form.Select
                        size="sm"
                        value={filters.dataSource}
                        onChange={(e) => onChange('dataSource', e.target.value)}
                    >
                        <option value="runs">Runs (per category)</option>
                        <option value="finished-runs">
                            Finished Runs (individual)
                        </option>
                    </Form.Select>
                </Col>
                <Col xs={12} md={3}>
                    <Form.Label className="small text-secondary mb-1">
                        Game
                    </Form.Label>
                    <Form.Control
                        size="sm"
                        type="text"
                        placeholder="e.g. Super Mario 64"
                        value={filters.game}
                        onChange={(e) => onChange('game', e.target.value)}
                    />
                </Col>
                <Col xs={12} md={3}>
                    <Form.Label className="small text-secondary mb-1">
                        Category
                    </Form.Label>
                    <Form.Control
                        size="sm"
                        type="text"
                        placeholder="e.g. 120 Star"
                        value={filters.category}
                        onChange={(e) => onChange('category', e.target.value)}
                    />
                </Col>
                <Col xs={12} md={3}>
                    <Form.Label className="small text-secondary mb-1">
                        Username
                    </Form.Label>
                    <Form.Control
                        size="sm"
                        type="text"
                        placeholder="Exact username"
                        value={filters.username}
                        onChange={(e) => onChange('username', e.target.value)}
                    />
                </Col>
            </Row>

            <Row className="g-2 mb-2">
                <Col xs={6} md={2}>
                    <Form.Label className="small text-secondary mb-1">
                        After Date
                    </Form.Label>
                    <Form.Control
                        size="sm"
                        type="date"
                        value={filters.afterDate}
                        onChange={(e) => onChange('afterDate', e.target.value)}
                    />
                </Col>
                <Col xs={6} md={2}>
                    <Form.Label className="small text-secondary mb-1">
                        Before Date
                    </Form.Label>
                    <Form.Control
                        size="sm"
                        type="date"
                        value={filters.beforeDate}
                        onChange={(e) => onChange('beforeDate', e.target.value)}
                    />
                </Col>
                <Col xs={6} md={2}>
                    <Form.Label className="small text-secondary mb-1">
                        PBs Only
                    </Form.Label>
                    <Form.Select
                        size="sm"
                        value={filters.isPb}
                        onChange={(e) => onChange('isPb', e.target.value)}
                        disabled={filters.dataSource !== 'finished-runs'}
                    >
                        <option value="">Any</option>
                        <option value="true">PBs only</option>
                        <option value="false">Non-PBs only</option>
                    </Form.Select>
                </Col>
                <Col xs={6} md={2}>
                    <Form.Label className="small text-secondary mb-1">
                        Min Attempts
                    </Form.Label>
                    <Form.Control
                        size="sm"
                        type="number"
                        placeholder="0"
                        value={filters.minAttempts}
                        onChange={(e) => onChange('minAttempts', e.target.value)}
                    />
                </Col>
                <Col xs={6} md={2}>
                    <Form.Label className="small text-secondary mb-1">
                        Max Attempts
                    </Form.Label>
                    <Form.Control
                        size="sm"
                        type="number"
                        value={filters.maxAttempts}
                        onChange={(e) => onChange('maxAttempts', e.target.value)}
                    />
                </Col>
                <Col xs={6} md={2}>
                    {filters.dataSource === 'finished-runs' && (
                        <>
                            <Form.Label className="small text-secondary mb-1">
                                Top Games
                            </Form.Label>
                            <Form.Control
                                size="sm"
                                type="number"
                                placeholder="e.g. 100"
                                value={filters.topGames}
                                onChange={(e) =>
                                    onChange('topGames', e.target.value)
                                }
                            />
                        </>
                    )}
                </Col>
            </Row>

            {filters.dataSource === 'finished-runs' && (
                <Row className="g-2">
                    <Col xs={6} md={2}>
                        <Form.Label className="small text-secondary mb-1">
                            Top Categories
                        </Form.Label>
                        <Form.Control
                            size="sm"
                            type="number"
                            placeholder="e.g. 100"
                            value={filters.topCategories}
                            onChange={(e) =>
                                onChange('topCategories', e.target.value)
                            }
                        />
                    </Col>
                </Row>
            )}
        </div>
    );
}
```

**Step 2: Wire FilterBar into DataExplorer**

In `data-explorer.tsx`, add the FilterBar import and render it, passing `filters` and an `onChange` handler:

```tsx
const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
};
```

Render: `<FilterBar filters={filters} onChange={handleFilterChange} />`

**Step 3: Verify filters render and state updates**

Visit `/data`, change inputs, confirm no console errors.

**Step 4: Commit**

```bash
git add app/\(old-layout\)/data/
git commit -m "feat: add data explorer filter bar"
```

---

### Task 3: Build the aggregate control bar

**Files:**
- Create: `app/(old-layout)/data/aggregate-bar.tsx`
- Modify: `app/(old-layout)/data/data-explorer.tsx`

**Step 1: Create the AggregateBar component**

```tsx
// app/(old-layout)/data/aggregate-bar.tsx
'use client';

import React from 'react';
import { Col, Form, Row } from 'react-bootstrap';

type DataSource = 'runs' | 'finished-runs';
type AggregateMode = 'none' | 'count' | 'sum' | 'avg';

const RUNS_AGG_COLUMNS = [
    { value: 'total_run_time', label: 'Total Run Time' },
    { value: 'attempt_count', label: 'Attempt Count' },
    { value: 'finished_attempt_count', label: 'Finished Attempts' },
    { value: 'personal_best', label: 'Personal Best' },
    { value: 'sum_of_bests', label: 'Sum of Bests' },
];

const FINISHED_RUNS_AGG_COLUMNS = [
    { value: 'time', label: 'Time' },
    { value: 'game_time', label: 'Game Time' },
];

interface AggregateBarProps {
    dataSource: DataSource;
    aggregate: AggregateMode;
    aggregateColumn: string;
    groupBy: string;
    limit: string;
    onChange: (key: string, value: string) => void;
}

export function AggregateBar({
    dataSource,
    aggregate,
    aggregateColumn,
    groupBy,
    limit,
    onChange,
}: AggregateBarProps) {
    const aggColumns =
        dataSource === 'runs' ? RUNS_AGG_COLUMNS : FINISHED_RUNS_AGG_COLUMNS;
    const needsColumn = aggregate === 'sum' || aggregate === 'avg';

    return (
        <div className="bg-body-secondary rounded-3 p-3">
            <Row className="g-2 align-items-end">
                <Col xs={6} md={2}>
                    <Form.Label className="small text-secondary mb-1">
                        Aggregate
                    </Form.Label>
                    <Form.Select
                        size="sm"
                        value={aggregate}
                        onChange={(e) => onChange('aggregate', e.target.value)}
                    >
                        <option value="none">None (raw rows)</option>
                        <option value="count">Count</option>
                        <option value="sum">Sum</option>
                        <option value="avg">Average</option>
                    </Form.Select>
                </Col>

                {aggregate !== 'none' && (
                    <Col xs={6} md={2}>
                        <Form.Label className="small text-secondary mb-1">
                            Group By
                        </Form.Label>
                        <Form.Select
                            size="sm"
                            value={groupBy}
                            onChange={(e) =>
                                onChange('groupBy', e.target.value)
                            }
                        >
                            <option value="">
                                None{aggregate !== 'count' ? ' (required)' : ''}
                            </option>
                            <option value="username">Username</option>
                            <option value="game">Game</option>
                            <option value="category">Category</option>
                        </Form.Select>
                    </Col>
                )}

                {needsColumn && (
                    <Col xs={6} md={3}>
                        <Form.Label className="small text-secondary mb-1">
                            Column
                        </Form.Label>
                        <Form.Select
                            size="sm"
                            value={
                                aggregateColumn || aggColumns[0]?.value || ''
                            }
                            onChange={(e) =>
                                onChange('aggregateColumn', e.target.value)
                            }
                        >
                            {aggColumns.map((col) => (
                                <option key={col.value} value={col.value}>
                                    {col.label}
                                </option>
                            ))}
                        </Form.Select>
                    </Col>
                )}

                <Col xs={6} md={2}>
                    <Form.Label className="small text-secondary mb-1">
                        Limit
                    </Form.Label>
                    <Form.Select
                        size="sm"
                        value={limit}
                        onChange={(e) => onChange('limit', e.target.value)}
                    >
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="200">200</option>
                    </Form.Select>
                </Col>
            </Row>
        </div>
    );
}
```

**Step 2: Wire AggregateBar into DataExplorer**

Import and render `<AggregateBar>` below `<FilterBar>`, passing the relevant filter fields and `handleFilterChange`.

**Step 3: Commit**

```bash
git add app/\(old-layout\)/data/
git commit -m "feat: add data explorer aggregate controls"
```

---

### Task 4: Build URL builder, data fetching, and results table

**Files:**
- Create: `app/(old-layout)/data/build-query-url.ts`
- Create: `app/(old-layout)/data/results-table.tsx`
- Modify: `app/(old-layout)/data/data-explorer.tsx`

**Step 1: Create the URL builder**

This function takes the filter state and returns the API URL path with query params. It decides between `/v1/runs` and `/v1/finished-runs` based on `dataSource`.

```ts
// app/(old-layout)/data/build-query-url.ts

interface QueryFilters {
    dataSource: string;
    game: string;
    category: string;
    username: string;
    afterDate: string;
    beforeDate: string;
    isPb: string;
    minAttempts: string;
    maxAttempts: string;
    topGames: string;
    topCategories: string;
    aggregate: string;
    aggregateColumn: string;
    groupBy: string;
    limit: string;
    sort: string;
}

export function buildQueryUrl(filters: QueryFilters): string {
    const base =
        filters.dataSource === 'finished-runs'
            ? '/v1/finished-runs'
            : '/v1/runs';
    const params = new URLSearchParams();

    if (filters.game) params.set('game', filters.game);
    if (filters.category) params.set('category', filters.category);
    if (filters.username) params.set('username', filters.username);
    if (filters.afterDate)
        params.set('after_date', new Date(filters.afterDate).toISOString());
    if (filters.beforeDate)
        params.set('before_date', new Date(filters.beforeDate).toISOString());
    if (filters.minAttempts) params.set('min_attempts', filters.minAttempts);
    if (filters.maxAttempts) params.set('max_attempts', filters.maxAttempts);

    // finished-runs only params
    if (filters.dataSource === 'finished-runs') {
        if (filters.isPb) params.set('is_pb', filters.isPb);
        if (filters.topGames) params.set('top_games', filters.topGames);
        if (filters.topCategories)
            params.set('top_categories', filters.topCategories);
    }

    // aggregate params
    if (filters.aggregate && filters.aggregate !== 'none') {
        params.set('aggregate', filters.aggregate);
        if (filters.groupBy) params.set('group_by', filters.groupBy);
        if (
            (filters.aggregate === 'sum' || filters.aggregate === 'avg') &&
            filters.aggregateColumn
        ) {
            params.set('aggregate_column', filters.aggregateColumn);
        }
    }

    if (filters.limit) params.set('limit', filters.limit);
    if (filters.sort) params.set('sort', filters.sort);

    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
}
```

**Step 2: Create the ResultsTable component**

```tsx
// app/(old-layout)/data/results-table.tsx
'use client';

import React from 'react';
import { Alert, Spinner, Table } from 'react-bootstrap';
import { DurationToFormatted } from '~src/components/util/datetime';

// Columns where the value represents milliseconds
const DURATION_COLUMNS = new Set([
    'personalBest',
    'sumOfBests',
    'totalRunTime',
    'time',
    'gameTime',
    'gameTimePb',
    'gameTimeSob',
    'personalBestTime',
    'value', // may be duration in aggregate mode, handled contextually
]);

// Columns that are always durations when they appear as aggregate value
const DURATION_AGG_COLUMNS = new Set([
    'total_run_time',
    'personal_best',
    'sum_of_bests',
    'time',
    'game_time',
]);

interface ResultsTableProps {
    data: any;
    isLoading: boolean;
    error: any;
    isAggregate: boolean;
    aggregateColumn: string;
    apiUrl: string;
}

export function ResultsTable({
    data,
    isLoading,
    error,
    isAggregate,
    aggregateColumn,
    apiUrl,
}: ResultsTableProps) {
    if (isLoading) {
        return (
            <div className="text-center py-4">
                <Spinner animation="border" size="sm" /> Loading...
            </div>
        );
    }

    if (error) {
        return <Alert variant="danger">Error: {error.message}</Alert>;
    }

    if (!data) {
        return (
            <p className="text-secondary">
                Adjust filters and click Search to query data.
            </p>
        );
    }

    const result = data.result ?? data;

    // Single count result (no group_by)
    if (result && typeof result === 'object' && 'count' in result && !Array.isArray(result)) {
        return (
            <div className="bg-body-secondary rounded-3 p-4 text-center">
                <div className="text-secondary small">Count</div>
                <div className="fs-2 fw-bold">
                    {Number(result.count).toLocaleString()}
                </div>
            </div>
        );
    }

    // Array results
    const rows = Array.isArray(result) ? result : [];
    if (rows.length === 0) {
        return <Alert variant="info">No results found.</Alert>;
    }

    const columns = Object.keys(rows[0]);
    const isValueDuration =
        isAggregate && DURATION_AGG_COLUMNS.has(aggregateColumn);

    return (
        <div>
            <div className="small text-secondary mb-2">
                {rows.length} result{rows.length !== 1 ? 's' : ''}
            </div>
            <Table responsive hover bordered striped className="rounded-3">
                <thead>
                    <tr>
                        <th style={{ width: '2rem' }}>#</th>
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
                                    {formatCell(
                                        col,
                                        row[col],
                                        col === 'value' && isValueDuration,
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
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
    forceAsDuration: boolean,
): React.ReactNode {
    if (value === null || value === undefined) return '-';

    if (
        typeof value === 'number' &&
        (DURATION_COLUMNS.has(column) || forceAsDuration) &&
        value > 0
    ) {
        return <DurationToFormatted duration={value} />;
    }

    if (typeof value === 'boolean') return value ? 'Yes' : 'No';

    if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value))) {
        return new Date(value as string).toLocaleString();
    }

    if (typeof value === 'number') return value.toLocaleString();

    return String(value);
}
```

**Step 3: Wire data fetching and results into DataExplorer**

In `data-explorer.tsx`:

1. Import `useSWR` from `swr`, `fetcher` from `~src/utils/fetcher`, `buildQueryUrl`, `ResultsTable`, and `Button` from `react-bootstrap`.
2. Add a `submittedFilters` state (initially `null`) and a Search button.
3. Use `useSWR` keyed on the built URL (only when `submittedFilters` is set).
4. Render `<ResultsTable>` with the SWR data.

```tsx
const [submittedFilters, setSubmittedFilters] = useState<Filters | null>(null);

const apiUrl = submittedFilters ? buildQueryUrl(submittedFilters) : null;
const fullUrl = apiUrl
    ? `${process.env.NEXT_PUBLIC_DATA_URL}${apiUrl}`
    : null;
const { data, error, isLoading } = useSWR(fullUrl, fetcher);

const handleSearch = () => {
    setSubmittedFilters({ ...filters });
};
```

Add a Search button between AggregateBar and ResultsTable:

```tsx
<div className="d-flex gap-2">
    <Button variant="primary" onClick={handleSearch}>
        Search
    </Button>
    <Button
        variant="outline-secondary"
        onClick={() => {
            setFilters(DEFAULT_FILTERS);
            setSubmittedFilters(null);
        }}
    >
        Reset
    </Button>
    {apiUrl && (
        <code className="d-flex align-items-center small text-secondary">
            {apiUrl}
        </code>
    )}
</div>
```

**Step 4: Verify end-to-end**

Visit `/data`, set game to "Super Mario 64", set aggregate to "sum", group_by to "username", click Search. Should display results from the API.

**Step 5: Commit**

```bash
git add app/\(old-layout\)/data/
git commit -m "feat: add data explorer URL builder, results table, and SWR fetching"
```

---

### Task 5: Add preset query buttons

**Files:**
- Create: `app/(old-layout)/data/presets.tsx`
- Modify: `app/(old-layout)/data/data-explorer.tsx`

**Step 1: Create the Presets component**

```tsx
// app/(old-layout)/data/presets.tsx
'use client';

import React from 'react';
import { Button } from 'react-bootstrap';

interface Preset {
    label: string;
    description: string;
    filters: Record<string, string>;
}

const PRESETS: Preset[] = [
    {
        label: 'Most Playtime by User',
        description: 'Users with the most total playtime (filter by game)',
        filters: {
            dataSource: 'runs',
            aggregate: 'sum',
            groupBy: 'username',
            aggregateColumn: 'total_run_time',
            limit: '50',
        },
    },
    {
        label: 'Most Attempts by User',
        description: 'Users with the most attempts (filter by game)',
        filters: {
            dataSource: 'runs',
            aggregate: 'sum',
            groupBy: 'username',
            aggregateColumn: 'attempt_count',
            limit: '50',
        },
    },
    {
        label: 'PB Count This Week',
        description: 'Number of PBs set in the last 7 days per game',
        filters: {
            dataSource: 'finished-runs',
            isPb: 'true',
            afterDate: getDateDaysAgo(7),
            aggregate: 'count',
            groupBy: 'game',
            limit: '50',
        },
    },
    {
        label: 'Recent PBs in Top 100 Categories',
        description: 'Latest PBs from the most popular categories',
        filters: {
            dataSource: 'finished-runs',
            isPb: 'true',
            topCategories: '100',
            aggregate: 'none',
            limit: '50',
        },
    },
    {
        label: 'Finished Runs Per User',
        description: 'Who has the most finished runs (filter by game)',
        filters: {
            dataSource: 'finished-runs',
            aggregate: 'count',
            groupBy: 'username',
            limit: '50',
        },
    },
    {
        label: 'Avg Finish Time Per User',
        description: 'Average finish time by user (filter by game)',
        filters: {
            dataSource: 'finished-runs',
            aggregate: 'avg',
            groupBy: 'username',
            aggregateColumn: 'time',
            limit: '50',
        },
    },
];

function getDateDaysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

interface PresetsProps {
    onApply: (filters: Record<string, string>) => void;
}

export function Presets({ onApply }: PresetsProps) {
    return (
        <div className="d-flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
                <Button
                    key={preset.label}
                    variant="outline-primary"
                    size="sm"
                    title={preset.description}
                    onClick={() => onApply(preset.filters)}
                >
                    {preset.label}
                </Button>
            ))}
        </div>
    );
}
```

**Step 2: Wire Presets into DataExplorer**

Add a handler that merges preset filters with defaults and auto-submits:

```tsx
const handlePreset = (presetFilters: Record<string, string>) => {
    const newFilters = { ...DEFAULT_FILTERS, ...presetFilters };
    setFilters(newFilters as Filters);
    setSubmittedFilters(newFilters as Filters);
};
```

Render `<Presets onApply={handlePreset} />` between the aggregate bar and the search button.

**Step 3: Verify presets work**

Click "Most Playtime by User" — should auto-fill filters and trigger search.

**Step 4: Commit**

```bash
git add app/\(old-layout\)/data/
git commit -m "feat: add data explorer preset queries"
```

---

### Task 6: Add debounced auto-search and URL state sharing

**Files:**
- Modify: `app/(old-layout)/data/data-explorer.tsx`

**Step 1: Add debounced auto-submit**

Replace manual search button approach with debounced auto-search. Use `useDebounceValue` from `usehooks-ts` on `filters`:

```tsx
import { useDebounceValue } from 'usehooks-ts';

// Inside DataExplorer:
const [debouncedFilters] = useDebounceValue(filters, 500);

const apiUrl = buildQueryUrl(debouncedFilters);
const fullUrl = `${process.env.NEXT_PUBLIC_DATA_URL}${apiUrl}`;
const { data, error, isLoading } = useSWR(fullUrl, fetcher);
```

Keep the Search button for immediate searches (bypasses debounce by copying filters to a `submittedFilters` ref). Keep the Reset button.

**Step 2: Sync filter state to URL search params**

Use `useSearchParams` and `useRouter` from `next/navigation` to read initial state from URL and write back on changes. This allows sharing query URLs.

```tsx
import { useSearchParams, useRouter } from 'next/navigation';

// On mount, read search params to initialize filters:
const searchParams = useSearchParams();
const [filters, setFilters] = useState<Filters>(() => {
    const initial = { ...DEFAULT_FILTERS };
    for (const key of Object.keys(DEFAULT_FILTERS)) {
        const val = searchParams.get(key);
        if (val) (initial as any)[key] = val;
    }
    return initial;
});

// On filter change, update URL:
useEffect(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(debouncedFilters)) {
        if (value && value !== (DEFAULT_FILTERS as any)[key]) {
            params.set(key, value);
        }
    }
    const qs = params.toString();
    router.replace(qs ? `/data?${qs}` : '/data', { scroll: false });
}, [debouncedFilters]);
```

**Step 3: Verify URL sync**

Set some filters, confirm URL updates. Copy URL, open in new tab, confirm filters are restored.

**Step 4: Commit**

```bash
git add app/\(old-layout\)/data/
git commit -m "feat: add debounced auto-search and URL state persistence"
```

---

### Task 7: Add navigation link

**Files:**
- Modify: whichever file contains the main navigation/header links (find with `grep -r "games.*href" src/components/` looking for nav links)

**Step 1: Find the nav component**

Search for the navigation component that contains links to `/games`, `/live`, etc.

**Step 2: Add a "Data" link**

Add a link to `/data` alongside the existing navigation items (likely near "Games" or "Live").

**Step 3: Commit**

```bash
git add <nav-file>
git commit -m "feat: add Data Explorer to navigation"
```

---

### Summary of files created/modified

| Action | File |
|--------|------|
| Create | `app/(old-layout)/data/page.tsx` |
| Create | `app/(old-layout)/data/data-explorer.tsx` |
| Create | `app/(old-layout)/data/filter-bar.tsx` |
| Create | `app/(old-layout)/data/aggregate-bar.tsx` |
| Create | `app/(old-layout)/data/build-query-url.ts` |
| Create | `app/(old-layout)/data/results-table.tsx` |
| Create | `app/(old-layout)/data/presets.tsx` |
| Modify | Navigation component (add `/data` link) |
