# Runs Explorer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a public, Apple-quality runs explorer page at `/runs` for browsing and filtering finished speedruns.

**Architecture:** Client component with URL-synced filter state, calling a server action that wraps `apiFetch` against `/v1/finished-runs`. Horizontal inline filter bar with chips, compact data table, classic pagination. All in the new-layout route group.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, SCSS Modules, `useSearchParams`/`useRouter` for URL state, `useTransition` for loading states, `react-icons` for icons.

**Design doc:** `docs/plans/2026-03-02-runs-explorer-design.md`

---

### Task 1: Server Action — `searchFinishedRuns`

**Files:**
- Create: `src/lib/finished-runs.ts`

**Step 1: Create the server action file**

```typescript
// src/lib/finished-runs.ts
'use server';

import { apiFetch } from './api-client';
import type { FinishedRunPB } from './highlights';

export interface FinishedRunsSearchParams {
    game?: string;
    category?: string;
    username?: string;
    isPb?: boolean;
    minTime?: number;
    maxTime?: number;
    afterDate?: string;
    beforeDate?: string;
    sort?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedFinishedRuns {
    items: FinishedRunPB[];
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export async function searchFinishedRuns(
    params: FinishedRunsSearchParams,
): Promise<PaginatedFinishedRuns> {
    const qs = new URLSearchParams();
    if (params.game) qs.set('game', params.game);
    if (params.category) qs.set('category', params.category);
    if (params.username) qs.set('username', params.username);
    if (params.isPb) qs.set('is_pb', 'true');
    if (params.minTime != null) qs.set('min_time', String(params.minTime));
    if (params.maxTime != null) qs.set('max_time', String(params.maxTime));
    if (params.afterDate) qs.set('after_date', params.afterDate);
    if (params.beforeDate) qs.set('before_date', params.beforeDate);
    if (params.sort) qs.set('sort', params.sort);
    if (params.page) qs.set('page', String(params.page));
    qs.set('limit', String(params.limit ?? 25));

    return apiFetch<PaginatedFinishedRuns>(
        `/v1/finished-runs?${qs.toString()}`,
    );
}
```

**Step 2: Verify it typechecks**

Run: `npx tsc --noEmit --pretty 2>&1 | grep finished-runs || echo "No errors"`

**Step 3: Commit**

```
git add src/lib/finished-runs.ts
git commit -m "feat(runs-explorer): add searchFinishedRuns server action"
```

---

### Task 2: Duration Input Utility — `parseDuration` / `formatDuration`

**Files:**
- Create: `app/(new-layout)/runs/duration-utils.ts`

These are pure functions for parsing user-entered duration strings like `1:30`, `1:30:00`, `90:00` into seconds, and formatting seconds back to `h:mm:ss`.

**Step 1: Create the utility file**

```typescript
// app/(new-layout)/runs/duration-utils.ts

/**
 * Parse a user-entered duration string into total seconds.
 * Accepts: "1:30:00" (h:mm:ss), "1:30" (m:ss or h:mm), "90:00" (m:ss), "5400" (seconds).
 * Returns null if invalid.
 */
export function parseDuration(input: string): number | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Pure number → treat as seconds
    if (/^\d+$/.test(trimmed)) {
        return parseInt(trimmed, 10);
    }

    const parts = trimmed.split(':').map((p) => parseInt(p, 10));
    if (parts.some((p) => isNaN(p) || p < 0)) return null;

    if (parts.length === 3) {
        // h:mm:ss
        const [h, m, s] = parts;
        if (m >= 60 || s >= 60) return null;
        return h * 3600 + m * 60 + s;
    }

    if (parts.length === 2) {
        const [a, b] = parts;
        if (b >= 60) return null;
        // If first part >= 60, treat as m:ss. Otherwise h:mm.
        // But for speedruns, "1:30" likely means 1m30s not 1h30m.
        // Use heuristic: if a < 10 and context is ambiguous, treat as m:ss.
        // Actually, always treat as m:ss — users enter h:mm:ss for hours.
        return a * 60 + b;
    }

    return null;
}

/**
 * Format total seconds to h:mm:ss display string.
 * Omits hours if zero: "5:30" for 330 seconds, "1:05:30" for 3930 seconds.
 */
export function formatDurationFromSeconds(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
}
```

**Step 2: Verify it typechecks**

Run: `npx tsc --noEmit --pretty 2>&1 | grep duration-utils || echo "No errors"`

**Step 3: Commit**

```
git add app/\(new-layout\)/runs/duration-utils.ts
git commit -m "feat(runs-explorer): add duration parse/format utilities"
```

---

### Task 3: Page Shell — Server Component + Metadata

**Files:**
- Create: `app/(new-layout)/runs/page.tsx`

**Step 1: Create the server page component**

```typescript
// app/(new-layout)/runs/page.tsx
import { Suspense } from 'react';
import buildMetadata from '~src/utils/metadata';
import { RunsExplorer } from './runs-explorer';

export const metadata = buildMetadata({
    title: 'Runs Explorer - therun.gg',
    description:
        'Browse and filter speedrun completions across all games, categories, and runners.',
});

export default function RunsPage() {
    return (
        <Suspense>
            <RunsExplorer />
        </Suspense>
    );
}
```

Note: `RunsExplorer` is wrapped in `Suspense` because it uses `useSearchParams()` which requires a Suspense boundary.

**Step 2: Create a stub RunsExplorer so the page renders**

```typescript
// app/(new-layout)/runs/runs-explorer.tsx
'use client';

export function RunsExplorer() {
    return <div>Runs Explorer (WIP)</div>;
}
```

**Step 3: Verify the page loads**

Run: `npm run build 2>&1 | tail -20` — check that `/runs` appears in the route list without errors.

**Step 4: Commit**

```
git add app/\(new-layout\)/runs/
git commit -m "feat(runs-explorer): add page route at /runs with stub component"
```

---

### Task 4: Filter Bar Component

**Files:**
- Create: `app/(new-layout)/runs/filter-bar.tsx`
- Create: `app/(new-layout)/runs/filter-bar.module.scss`

This is the horizontal inline filter bar with: text search, PB toggle, time range popover, date range popover, and active filter chips row.

**Step 1: Create the filter bar SCSS**

Reference design tokens from `app/(new-layout)/styles/_design-tokens.scss` and mixins from `_mixins.scss`. Key styles:

```scss
// app/(new-layout)/runs/filter-bar.module.scss
@use '../../styles/design-tokens' as *;
@use '../../styles/mixins' as *;

.filterBar {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    padding: $spacing-lg;
    background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--bs-body-bg) 60%, var(--bs-secondary-bg) 40%) 0%,
        color-mix(in srgb, var(--bs-body-bg) 40%, var(--bs-secondary-bg) 60%) 100%
    );
    border: $section-border;
    border-radius: $radius-lg;
    box-shadow: $shadow-sm;
}

.controls {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    flex-wrap: wrap;
}

.searchInput {
    flex: 1;
    min-width: 200px;
    padding: $spacing-sm $spacing-md;
    padding-left: 2.25rem;
    background: var(--bs-tertiary-bg);
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.3);
    border-radius: $radius-md;
    color: var(--bs-body-color);
    font-size: 0.9rem;
    transition: border-color $transition-fast, box-shadow $transition-fast;
    outline: none;

    &::placeholder {
        color: var(--bs-secondary-color);
        opacity: 0.6;
    }

    &:focus {
        border-color: var(--bs-primary);
        box-shadow: 0 0 0 2px rgba(var(--bs-primary-rgb), 0.15);
    }
}

.searchWrapper {
    position: relative;
    flex: 1;
    min-width: 200px;

    .searchIcon {
        position: absolute;
        left: $spacing-md;
        top: 50%;
        transform: translateY(-50%);
        color: var(--bs-secondary-color);
        opacity: 0.5;
        pointer-events: none;
    }
}

.togglePill {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-sm $spacing-md;
    border-radius: 100px;
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.3);
    background: transparent;
    color: var(--bs-secondary-color);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all $transition-fast;
    white-space: nowrap;

    &:hover {
        background: rgba(var(--bs-body-color-rgb), 0.06);
    }

    &.active {
        background: var(--bs-primary);
        color: white;
        border-color: var(--bs-primary);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }
}

.filterTrigger {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-sm $spacing-md;
    border-radius: $radius-md;
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.3);
    background: transparent;
    color: var(--bs-body-color);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all $transition-fast;
    white-space: nowrap;

    &:hover {
        background: rgba(var(--bs-body-color-rgb), 0.06);
    }

    &.hasValue {
        border-color: var(--bs-primary);
        color: var(--bs-primary);
        background: rgba(var(--bs-primary-rgb), 0.08);
    }
}

// Popover dropdown
.popover {
    position: absolute;
    top: calc(100% + $spacing-xs);
    left: 0;
    z-index: 100;
    min-width: 260px;
    padding: $spacing-md;
    background: var(--bs-body-bg);
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.3);
    border-radius: $radius-md;
    box-shadow: $shadow-lg;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;

    // Animation
    animation: popoverIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes popoverIn {
    from {
        opacity: 0;
        transform: scaleY(0.95) translateY(-4px);
    }
    to {
        opacity: 1;
        transform: scaleY(1) translateY(0);
    }
}

.popoverLabel {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--bs-secondary-color);
    margin-bottom: $spacing-xs;
}

.popoverInput {
    width: 100%;
    padding: $spacing-sm $spacing-md;
    background: var(--bs-tertiary-bg);
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.3);
    border-radius: $radius-sm;
    color: var(--bs-body-color);
    font-size: 0.9rem;
    outline: none;

    &:focus {
        border-color: var(--bs-primary);
        box-shadow: 0 0 0 2px rgba(var(--bs-primary-rgb), 0.15);
    }
}

.durationInput {
    @include monospace-value;
    font-size: 0.9rem;
}

.popoverRow {
    display: flex;
    gap: $spacing-sm;
    align-items: center;
}

.popoverFieldGroup {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
}

.inputError {
    font-size: 0.75rem;
    color: var(--bs-danger);
}

// Active filter chips
.chips {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    flex-wrap: wrap;
}

.chip {
    @include status-badge;
    display: inline-flex;
    align-items: center;
    gap: $spacing-xs;
    animation: chipIn 0.15s ease-out;
    cursor: default;
}

@keyframes chipIn {
    from {
        opacity: 0;
        transform: scale(0.85);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

.chipRemove {
    cursor: pointer;
    opacity: 0.6;
    transition: opacity $transition-fast;
    display: flex;
    align-items: center;

    &:hover {
        opacity: 1;
    }
}

.clearAll {
    font-size: 0.8rem;
    color: var(--bs-secondary-color);
    cursor: pointer;
    border: none;
    background: none;
    padding: $spacing-xs $spacing-sm;
    transition: color $transition-fast;

    &:hover {
        color: var(--bs-body-color);
    }
}

// Mobile: collapse filters behind button
@media (max-width: 768px) {
    .controls {
        flex-wrap: wrap;
    }

    .searchWrapper {
        min-width: 100%;
    }

    .desktopOnly {
        display: none;
    }

    .mobileFilterBtn {
        display: flex;
    }
}

@media (min-width: 769px) {
    .mobileFilterBtn {
        display: none;
    }
}

// Filter sheet for mobile
.filterSheet {
    position: fixed;
    inset: 0;
    z-index: 1050;
    background: var(--bs-body-bg);
    padding: $spacing-lg;
    display: flex;
    flex-direction: column;
    gap: $spacing-lg;
    overflow-y: auto;
    animation: sheetIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes sheetIn {
    from {
        transform: translateY(100%);
    }
    to {
        transform: translateY(0);
    }
}

.sheetHeader {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
        font-size: 1.2rem;
        font-weight: 700;
        margin: 0;
    }
}

.sheetClose {
    background: none;
    border: none;
    color: var(--bs-body-color);
    font-size: 1.5rem;
    cursor: pointer;
    padding: $spacing-xs;
    line-height: 1;
}

.sheetField {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;

    label {
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--bs-secondary-color);
    }
}

.sheetActions {
    display: flex;
    gap: $spacing-sm;
    margin-top: auto;
    padding-top: $spacing-lg;

    button {
        flex: 1;
        padding: $spacing-sm $spacing-lg;
        border-radius: $radius-md;
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
        border: none;
    }
}

.sheetApply {
    background: var(--bs-primary);
    color: white;
}

.sheetClear {
    background: var(--bs-tertiary-bg);
    color: var(--bs-body-color);
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.3) !important;
}
```

**Step 2: Create the filter bar component**

Build `filter-bar.tsx` as a `'use client'` component that:
- Receives current filter values and an `onFilterChange(filters)` callback as props
- Renders the search input (with `FiSearch` icon from `react-icons/fi`)
- Renders PB Only toggle pill
- Renders "Time" and "Date" filter trigger buttons that toggle popover visibility via local state
- Each popover contains the relevant inputs (duration inputs for time, `<input type="date">` for dates)
- Popovers close on outside click (use a `useEffect` with `mousedown` listener)
- Escape key closes any open popover
- Renders active filter chips row when any filter is set
- "Clear all" button resets all filters

Props interface:
```typescript
export interface RunsFilters {
    search: string;      // combined game/category/username search
    game: string;
    category: string;
    username: string;
    isPb: boolean;
    minTime: string;     // raw user input, e.g. "1:30:00"
    maxTime: string;
    afterDate: string;   // YYYY-MM-DD
    beforeDate: string;
    sort: string;        // e.g. '-ended_at'
}

interface FilterBarProps {
    filters: RunsFilters;
    onFilterChange: (filters: Partial<RunsFilters>) => void;
    onClearAll: () => void;
    resultCount?: number;
}
```

Note on search: The backend has separate `game`, `category`, `username` params. The single search input should pass the value to all three simultaneously (the backend will OR-match). Alternatively, break search into separate fields in the popovers if the backend doesn't support a combined search. Check how the backend handles it — if it requires separate fields, add Game, Category, Username as separate text inputs in the filter bar instead of a single search box.

**Step 3: Verify it typechecks**

Run: `npm run typecheck`

**Step 4: Commit**

```
git add app/\(new-layout\)/runs/filter-bar.tsx app/\(new-layout\)/runs/filter-bar.module.scss
git commit -m "feat(runs-explorer): add filter bar component with chips and popovers"
```

---

### Task 5: Runs Table Component

**Files:**
- Create: `app/(new-layout)/runs/runs-table.tsx`
- Create: `app/(new-layout)/runs/runs-table.module.scss`

**Step 1: Create the table SCSS**

```scss
// app/(new-layout)/runs/runs-table.module.scss
@use '../../styles/design-tokens' as *;
@use '../../styles/mixins' as *;

.tableWrapper {
    position: relative;
    border: $section-border;
    border-radius: $radius-lg;
    overflow: hidden;
    background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--bs-body-bg) 60%, var(--bs-secondary-bg) 40%) 0%,
        color-mix(in srgb, var(--bs-body-bg) 40%, var(--bs-secondary-bg) 60%) 100%
    );

    &.loading {
        .tableBody {
            opacity: 0.5;
            transition: opacity 0.2s ease-in-out;
            pointer-events: none;
        }
    }
}

// Thin loading bar at top
.loadingBar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--bs-primary);
    z-index: 10;
    animation: loadingPulse 1.5s ease-in-out infinite;
}

@keyframes loadingPulse {
    0% { transform: translateX(-100%); }
    50% { transform: translateX(0%); }
    100% { transform: translateX(100%); }
}

.table {
    width: 100%;
    border-collapse: collapse;
}

.thead {
    position: sticky;
    top: 0;
    z-index: 5;
    background: var(--bs-secondary-bg);
}

.th {
    padding: $spacing-sm $spacing-md;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--bs-secondary-color);
    border-bottom: 1px solid rgba(var(--bs-border-color-rgb), 0.4);
    white-space: nowrap;
    user-select: none;
}

.thSortable {
    cursor: pointer;
    transition: color $transition-fast;

    &:hover {
        color: var(--bs-body-color);
    }

    &.thSortActive {
        color: var(--bs-primary);
    }
}

.sortIcon {
    display: inline-block;
    margin-left: $spacing-xs;
    font-size: 0.65rem;
    opacity: 0.5;

    .thSortActive & {
        opacity: 1;
    }
}

.thRight {
    text-align: right;
}

.thCenter {
    text-align: center;
}

.row {
    transition: all $transition-fast;
    cursor: pointer;

    &:nth-child(even) {
        background: rgba(var(--bs-secondary-bg-rgb), 0.18);
    }

    &:hover {
        background: var(--bs-tertiary-bg);
        transform: translateX(2px);
    }
}

.td {
    padding: $spacing-sm $spacing-md;
    font-size: 0.9rem;
    border-bottom: 1px solid rgba(var(--bs-border-color-rgb), 0.2);
    vertical-align: middle;
    height: 44px;
}

.tdRight {
    text-align: right;
}

.tdCenter {
    text-align: center;
}

.timeCell {
    @include monospace-value;
    font-size: 0.9rem;
    text-align: right;
}

.runner {
    font-weight: 500;
    color: var(--bs-primary);
    text-decoration: none;

    &:hover {
        text-decoration: underline;
    }
}

.gameCell {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
}

.gameImage {
    width: 24px;
    height: 32px;
    border-radius: 3px;
    object-fit: cover;
    flex-shrink: 0;
}

.pbBadge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--bs-success);
    font-size: 0.85rem;
}

.dateCell {
    font-size: 0.85rem;
    color: var(--bs-secondary-color);
    text-align: right;
    white-space: nowrap;
}

// Result count + sort header
.tableHeader {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-sm $spacing-md;
}

.resultCount {
    font-size: 0.85rem;
    color: var(--bs-secondary-color);
}

// Skeleton loading
.skeleton {
    height: 44px;
    display: flex;
    align-items: center;
    padding: $spacing-sm $spacing-md;
    gap: $spacing-md;
    border-bottom: 1px solid rgba(var(--bs-border-color-rgb), 0.2);
}

.skeletonBar {
    height: 14px;
    border-radius: 4px;
    background: rgba(var(--bs-secondary-bg-rgb), 0.6);
    animation: shimmer 1.5s ease-in-out infinite;
    background-size: 200% 100%;
    background-image: linear-gradient(
        90deg,
        rgba(var(--bs-secondary-bg-rgb), 0.6) 25%,
        rgba(var(--bs-secondary-bg-rgb), 0.3) 50%,
        rgba(var(--bs-secondary-bg-rgb), 0.6) 75%
    );
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

// Empty state
.emptyState {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: $spacing-3xl $spacing-lg;
    gap: $spacing-md;
    text-align: center;
}

.emptyIcon {
    font-size: 2.5rem;
    color: var(--bs-secondary-color);
    opacity: 0.4;
}

.emptyTitle {
    font-size: 1rem;
    font-weight: 600;
    color: var(--bs-body-color);
}

.emptySubtitle {
    font-size: 0.85rem;
    color: var(--bs-secondary-color);
}

.emptyClearBtn {
    margin-top: $spacing-sm;
    padding: $spacing-sm $spacing-lg;
    background: var(--bs-primary);
    color: white;
    border: none;
    border-radius: $radius-md;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
        opacity: 0.9;
        transform: translateY(-1px);
    }
}

// Responsive: card layout on mobile
@media (max-width: 768px) {
    .table, .thead, .tableBody {
        display: block;
    }

    .thead {
        display: none;
    }

    .row {
        display: flex;
        flex-direction: column;
        padding: $spacing-md;
        gap: $spacing-xs;
        border-bottom: 1px solid rgba(var(--bs-border-color-rgb), 0.3);

        &:hover {
            transform: none;
        }
    }

    .td {
        border-bottom: none;
        padding: 0;
        height: auto;
    }

    .mobileHeader {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .mobileGameLine {
        font-size: 0.8rem;
        color: var(--bs-secondary-color);
    }

    .mobileTimeLine {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
}

@media (min-width: 769px) {
    .mobileHeader,
    .mobileGameLine,
    .mobileTimeLine {
        display: contents; // Falls back to table cell behavior
    }
}
```

**Step 2: Create the table component**

Build `runs-table.tsx` as a `'use client'` component that:
- Receives `runs: FinishedRunPB[]`, `isLoading: boolean`, `totalItems: number`, `sort: string`, `onSortChange(sort: string)`, `onClearFilters()`
- Renders loading bar when `isLoading`
- Renders skeleton rows when `runs` is null/undefined (initial load)
- Renders empty state when `runs` is empty array and not loading
- Renders the data table with all columns
- Time column uses `DurationToFormatted` from `~src/components/util/datetime` (existing component)
- Date column uses `timeAgo` or similar relative time formatting
- PB column shows a green `FiCheck` icon from `react-icons/fi`
- Game column shows game image (use IGDB image URL pattern from project) + game name
- Sortable column headers toggle between `'-time'`/`'time'` and `'-ended_at'`/`'ended_at'`
- Clicking a row navigates to the user's run page

For relative date formatting: use `Intl.RelativeTimeFormat` or a simple helper function — don't add a dependency. Example:

```typescript
function timeAgo(dateString: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    const intervals = [
        { label: 'y', seconds: 31536000 },
        { label: 'mo', seconds: 2592000 },
        { label: 'd', seconds: 86400 },
        { label: 'h', seconds: 3600 },
        { label: 'm', seconds: 60 },
    ];
    for (const { label, seconds: s } of intervals) {
        const count = Math.floor(seconds / s);
        if (count >= 1) return `${count}${label} ago`;
    }
    return 'just now';
}
```

**Step 3: Verify it typechecks**

Run: `npm run typecheck`

**Step 4: Commit**

```
git add app/\(new-layout\)/runs/runs-table.tsx app/\(new-layout\)/runs/runs-table.module.scss
git commit -m "feat(runs-explorer): add runs table component with sorting and loading states"
```

---

### Task 6: Pagination Component

**Files:**
- Create: `app/(new-layout)/runs/runs-pagination.tsx`
- Create: `app/(new-layout)/runs/runs-pagination.module.scss`

Build a self-contained pagination component (not using the existing `PaginationContext` system, which is array-based). This one is URL-driven.

**Step 1: Create the pagination SCSS**

```scss
// app/(new-layout)/runs/runs-pagination.module.scss
@use '../../styles/design-tokens' as *;

.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-lg 0;
}

.pageBtn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 36px;
    padding: 0 $spacing-sm;
    border-radius: $radius-md;
    border: 1px solid transparent;
    background: transparent;
    color: var(--bs-body-color);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover:not(:disabled) {
        background: rgba(var(--bs-body-color-rgb), 0.06);
    }

    &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    &.active {
        background: var(--bs-primary);
        color: white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
        font-weight: 600;
    }
}

.ellipsis {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 36px;
    color: var(--bs-secondary-color);
    font-size: 0.85rem;
    user-select: none;
}

// Hide page numbers on very small screens, keep prev/next
@media (max-width: 480px) {
    .pageBtn:not(.navBtn) {
        display: none;
    }

    .ellipsis {
        display: none;
    }
}
```

**Step 2: Create the pagination component**

Props:
```typescript
interface RunsPaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}
```

Renders: `← Prev | 1 | 2 | ... | 47 | 48 | Next →`

Logic for page number display:
- Always show first and last page
- Show ±1 pages around current
- Ellipsis for gaps > 1
- Prev/Next buttons, disabled at boundaries

**Step 3: Verify it typechecks**

Run: `npm run typecheck`

**Step 4: Commit**

```
git add app/\(new-layout\)/runs/runs-pagination.tsx app/\(new-layout\)/runs/runs-pagination.module.scss
git commit -m "feat(runs-explorer): add pagination component"
```

---

### Task 7: Wire It All Together — RunsExplorer

**Files:**
- Modify: `app/(new-layout)/runs/runs-explorer.tsx`
- Create: `app/(new-layout)/runs/runs-explorer.module.scss`

This is the orchestrator component that connects filter bar, table, and pagination.

**Step 1: Create the orchestrator SCSS**

```scss
// app/(new-layout)/runs/runs-explorer.module.scss
@use '../../styles/design-tokens' as *;

.explorer {
    display: flex;
    flex-direction: column;
    gap: $spacing-lg;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;

    h1 {
        font-size: clamp(1.4rem, 3vw, 2rem);
        font-weight: 700;
        margin: 0;
    }
}

.resultSummary {
    font-size: 0.85rem;
    color: var(--bs-secondary-color);
}
```

**Step 2: Implement RunsExplorer**

The component should:

1. **Read URL search params** via `useSearchParams()` to initialize filter state
2. **Maintain local filter state** derived from URL params
3. **Use `useTransition`** for the loading state when fetching
4. **On filter change:**
   - Update URL via `router.replace()` with new search params (no full navigation)
   - Call `searchFinishedRuns(params)` inside `startTransition`
   - Store results in state
5. **On page change:** Same pattern, update `page` param
6. **On sort change:** Same pattern, update `sort` param, reset to page 1
7. **On initial render:** Fetch with current URL params (or defaults: `sort=-ended_at`, `page=1`)

Key implementation pattern (following `trending-section-client.tsx`):

```typescript
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { searchFinishedRuns, type PaginatedFinishedRuns, type FinishedRunsSearchParams } from '~src/lib/finished-runs';
import { parseDuration } from './duration-utils';
import { FilterBar, type RunsFilters } from './filter-bar';
import { RunsTable } from './runs-table';
import { RunsPagination } from './runs-pagination';
import styles from './runs-explorer.module.scss';

const DEFAULT_FILTERS: RunsFilters = {
    search: '',
    game: '',
    category: '',
    username: '',
    isPb: false,
    minTime: '',
    maxTime: '',
    afterDate: '',
    beforeDate: '',
    sort: '-ended_at',
};

function filtersFromSearchParams(params: URLSearchParams): RunsFilters {
    return {
        search: params.get('search') ?? '',
        game: params.get('game') ?? '',
        category: params.get('category') ?? '',
        username: params.get('username') ?? '',
        isPb: params.get('isPb') === 'true',
        minTime: params.get('minTime') ?? '',
        maxTime: params.get('maxTime') ?? '',
        afterDate: params.get('afterDate') ?? '',
        beforeDate: params.get('beforeDate') ?? '',
        sort: params.get('sort') ?? '-ended_at',
    };
}

function filtersToSearchParams(filters: RunsFilters, page: number): URLSearchParams {
    const params = new URLSearchParams();
    if (filters.game) params.set('game', filters.game);
    if (filters.category) params.set('category', filters.category);
    if (filters.username) params.set('username', filters.username);
    if (filters.isPb) params.set('isPb', 'true');
    if (filters.minTime) params.set('minTime', filters.minTime);
    if (filters.maxTime) params.set('maxTime', filters.maxTime);
    if (filters.afterDate) params.set('afterDate', filters.afterDate);
    if (filters.beforeDate) params.set('beforeDate', filters.beforeDate);
    if (filters.sort && filters.sort !== '-ended_at') params.set('sort', filters.sort);
    if (page > 1) params.set('page', String(page));
    return params;
}

function filtersToApiParams(filters: RunsFilters, page: number): FinishedRunsSearchParams {
    return {
        game: filters.game || undefined,
        category: filters.category || undefined,
        username: filters.username || undefined,
        isPb: filters.isPb || undefined,
        minTime: filters.minTime ? parseDuration(filters.minTime) ?? undefined : undefined,
        maxTime: filters.maxTime ? parseDuration(filters.maxTime) ?? undefined : undefined,
        afterDate: filters.afterDate ? new Date(filters.afterDate).toISOString() : undefined,
        beforeDate: filters.beforeDate ? new Date(filters.beforeDate).toISOString() : undefined,
        sort: filters.sort,
        page,
        limit: 25,
    };
}
```

**Step 3: Handle the unified search input**

If the backend requires separate `game`/`category`/`username` params and doesn't support a single search param, the search input should send the same value to all three. Inside `filtersToApiParams`, when `filters.search` is set:

```typescript
const searchTerm = filters.search || undefined;
return {
    game: filters.game || searchTerm,
    category: filters.category || searchTerm,
    username: filters.username || searchTerm,
    // ...
};
```

If this doesn't work well with the backend (AND vs OR semantics), fall back to three separate text inputs in the filter bar instead of a unified search. Test the backend behavior and adapt.

**Step 4: Verify the full page works**

Run: `npm run dev` and navigate to `/runs`. Verify:
- Page loads without errors
- Default sort shows most recent runs
- Filters update URL and trigger new data fetch
- Loading state shows dimmed table + loading bar
- Pagination works
- Empty state renders when no results

**Step 5: Commit**

```
git add app/\(new-layout\)/runs/runs-explorer.tsx app/\(new-layout\)/runs/runs-explorer.module.scss
git commit -m "feat(runs-explorer): wire filter bar, table, and pagination together"
```

---

### Task 8: Polish — Responsive, Keyboard, Edge Cases

**Files:**
- Modify: `app/(new-layout)/runs/filter-bar.tsx` (mobile sheet)
- Modify: `app/(new-layout)/runs/runs-table.tsx` (mobile card layout)
- Modify: various SCSS files

**Step 1: Mobile filter sheet**

Add the mobile filter sheet to `filter-bar.tsx`:
- On screens < 769px, hide the desktop filter triggers (Time, Date) and show a "Filters" button
- Clicking "Filters" opens a full-screen sheet with all filter fields stacked vertically
- Sheet has "Apply" and "Clear" buttons at the bottom
- Sheet closes on apply or close button

**Step 2: Mobile table → card layout**

On screens < 769px, the table should render as stacked cards:
- Each card shows: Runner name + PB badge (top row), Game • Category (subtitle), Time + Date (bottom row)
- Use the responsive SCSS from the table module (already scaffolded in Task 5)

**Step 3: Keyboard accessibility**

- Ensure all filter triggers have proper `role="button"`, `tabIndex={0}`, and `onKeyDown` handlers for Enter/Space
- Popover close on Escape
- Focus trap in mobile filter sheet

**Step 4: Edge cases**

- Handle backend errors gracefully (show error message in table area, not crash)
- Handle very long game/category names with `text-overflow: ellipsis`
- Handle zero total pages (empty state, no pagination)

**Step 5: Verify everything**

Run: `npm run typecheck && npm run lint`

**Step 6: Commit**

```
git add -A app/\(new-layout\)/runs/
git commit -m "feat(runs-explorer): polish responsive layout, keyboard nav, edge cases"
```

---

### Task 9: Visual Craft Pass

**Files:**
- Modify: All SCSS files in `app/(new-layout)/runs/`

**Step 1: Review against design system**

Open the page in the browser and compare against:
- `app/(new-layout)/styles/_design-tokens.scss` — verify all spacing, radius, shadows match
- `app/(new-layout)/styles/_mixins.scss` — verify interactive states use the right mixins
- Other sections in `app/(new-layout)/frontpage/` — verify visual consistency

**Step 2: Micro-interaction polish**

- Verify filter chip enter/exit animation is smooth (150ms, scale 0.85→1 + opacity)
- Verify popover open animation (200ms, scaleY + opacity)
- Verify table loading bar animation
- Verify row hover is subtle and consistent
- Verify sort column header highlight transitions smoothly

**Step 3: Dark mode**

Test in both light and dark mode:
- Verify all backgrounds, borders, and text colors adapt correctly
- Verify shadows increase in dark mode
- Verify contrast ratios are sufficient

**Step 4: Commit if there were changes**

```
git add -A app/\(new-layout\)/runs/
git commit -m "style(runs-explorer): visual craft pass — polish animations, dark mode, spacing"
```

---

### Task 10: Typecheck, Lint, Build Verify

**Step 1: Run typecheck**

```
npm run typecheck
```

Fix any errors.

**Step 2: Run lint**

```
npm run lint
```

Fix any warnings/errors.

**Step 3: Run build**

```
rm -rf .next && npm run build
```

Verify `/runs` appears in route list without errors.

**Step 4: Commit any fixes**

```
git add -A
git commit -m "chore(runs-explorer): fix typecheck and lint issues"
```
