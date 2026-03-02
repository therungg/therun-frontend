# Runs Explorer Design

## Overview

A public page at `/runs` in the new-layout for browsing and filtering all finished runs from the backend's `/v1/finished-runs` endpoint. Targets Apple-quality craft — fast, dense, polished, keyboard-accessible.

## Route Structure

```
app/(new-layout)/runs/
  page.tsx              # Server component (metadata, shell)
  runs-explorer.tsx     # Client component (filters, table, pagination)
  runs-explorer.module.scss
  filter-bar.tsx        # Filter bar with chips
  filter-bar.module.scss
  runs-table.tsx        # Results table
  runs-table.module.scss
  duration-input.tsx    # Reusable h:mm:ss input
```

## Data Flow

1. Client component reads URL search params (via `nuqs` or `useSearchParams`)
2. Filter changes update URL params (shareable links, back/forward works)
3. On param change, call server action `searchFinishedRuns(params)` via `useTransition`
4. Server action builds query string, calls `apiFetch<PaginatedFinishedRuns>('/v1/finished-runs?...')`
5. Results render in table with loading state during transition

### Server Action

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
    minTime?: number;    // seconds
    maxTime?: number;    // seconds
    afterDate?: string;  // ISO
    beforeDate?: string; // ISO
    sort?: string;       // e.g. '-ended_at', 'time', '-time'
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
    params: FinishedRunsSearchParams
): Promise<PaginatedFinishedRuns> {
    const qs = new URLSearchParams();
    if (params.game) qs.set('game', params.game);
    if (params.category) qs.set('category', params.category);
    if (params.username) qs.set('username', params.username);
    if (params.isPb) qs.set('is_pb', 'true');
    if (params.minTime) qs.set('min_time', String(params.minTime));
    if (params.maxTime) qs.set('max_time', String(params.maxTime));
    if (params.afterDate) qs.set('after_date', params.afterDate);
    if (params.beforeDate) qs.set('before_date', params.beforeDate);
    if (params.sort) qs.set('sort', params.sort);
    if (params.page) qs.set('page', String(params.page));
    qs.set('limit', String(params.limit ?? 25));

    return apiFetch<PaginatedFinishedRuns>(
        `/v1/finished-runs?${qs.toString()}`
    );
}
```

## Filter Bar Design

### Layout: Horizontal Inline (Linear/Stripe pattern)

```
┌──────────────────────────────────────────────────────────────────────┐
│  🔍 Search game, runner...  │ PB Only │ Time ▾ │ Date ▾ │ Sort ▾   │
├──────────────────────────────────────────────────────────────────────┤
│  Game: Celeste  ✕  │  Category: Any%  ✕  │  Min: 1:30:00  ✕       │
└──────────────────────────────────────────────────────────────────────┘
```

**Row 1 — Filter controls:**
- Text input with search icon (placeholder: "Search game, category, or runner...")
- PB Only toggle pill (active state = filled primary)
- "Time" dropdown → opens popover with min/max duration inputs
- "Date" dropdown → opens popover with after/before date inputs
- Sort dropdown → Time (asc/desc), Date (asc/desc)

**Row 2 — Active filter chips (only shown when filters are active):**
- Each chip: `label: value ✕` in the project's badge style
- "Clear all" link at the end
- Chips animate in/out with scale + opacity (150ms)

### Interaction Model

- **Text search**: 400ms debounce, searches game + category + username simultaneously
- **Toggle (PB Only)**: Immediate, no debounce
- **Dropdowns (Time, Date)**: Popover below trigger, apply on blur/close
- **All changes**: Update URL params → trigger server action via `startTransition`

### Progressive Disclosure

Desktop: All filters visible inline.
Tablet (<768px): Search + PB toggle visible; Time/Date/Sort behind "Filters" button → bottom sheet.
Mobile (<480px): Single search input + "Filters" button → full-screen filter sheet. Applied chips in scrollable row.

## Results Table

### Columns

| Column | Align | Font | Sortable | Notes |
|--------|-------|------|----------|-------|
| Runner | Left | Regular 400 | No | Links to `/[username]`, with small avatar if available |
| Game | Left | Regular 400 | No | With 24×32 game image thumbnail (3:4 ratio) |
| Category | Left | Regular 400 | No | |
| Time | Right | Monospace 600, tabular-nums | Yes | Formatted as `h:mm:ss.ms` |
| Date | Right | Regular 400 | Yes | Relative ("2h ago") with full date on hover |
| PB | Center | — | No | Green checkmark icon if PB, empty otherwise |

### Row Design

- Height: 44px (compact, information-dense)
- Border: `1px solid rgba(var(--bs-border-color-rgb), 0.4)` bottom
- Hover: Background shifts to `var(--bs-tertiary-bg)`, subtle `translateX(2px)`
- Clickable: Entire row navigates to run detail page
- Sticky header row
- Alternating row tint on every other row: `rgba(var(--bs-secondary-bg-rgb), 0.18)`

### Loading States

**Initial load**: 10 skeleton rows matching table layout, shimmer animation.

**Filter change (transition pending)**:
- Thin loading bar at top of table (primary color, indeterminate animation)
- Existing results dim to `opacity: 0.5`
- No layout shift — keep existing rows visible

**New results arrive**: Fade in with `opacity: 0 → 1` over 150ms.

### Empty State

Centered in table area:
- Muted stopwatch icon (or timer icon from the project)
- "No runs match your filters"
- List of active filter chips
- Primary "Clear all filters" button
- Secondary text: "Try broadening your search"

## Pagination

Classic numbered pagination below the table.

```
← Prev  1  2  3  ...  47  48  Next →
```

- Show current page highlighted with primary background
- Show first, last, and ±2 pages around current
- Ellipsis for gaps
- Prev/Next buttons disabled at boundaries
- Total results count above table: "1,247 runs found"
- Page size: 25 (fixed, no selector needed initially)

## Duration Input Component

Single text input per field (not three separate h/m/s fields).

- Placeholder: `h:mm:ss`
- Accepts flexible input: `1:30`, `1:30:00`, `90:00` (parsed as mm:ss)
- Validates on blur, normalizes display to `h:mm:ss`
- Inline error below if invalid: "Enter a duration like 1:30:00"
- If min > max when both set: highlight both, show "Min must be less than max"
- Monospace font for the input value

## Styling (Design System Alignment)

### Colors
- Filter bar background: `var(--bs-secondary-bg)` with `1px solid rgba(var(--bs-primary-rgb), 0.15)` border
- Active filter chips: `rgba(96, 140, 89, 0.12)` background, `var(--bs-primary)` text (existing badge style)
- Table header: `var(--bs-secondary-bg)`, uppercase `0.72rem`, `700` weight, `0.06em` letter-spacing
- Sort indicators: `var(--bs-primary)` for active column

### Typography
- Page title: `clamp(1.4rem, 3vw, 2rem)`, `700` weight
- Result count: `0.85rem`, `var(--bs-secondary-color)`
- Table body: `0.9rem` regular, monospace for time column
- Filter labels: `0.8rem`, `600` weight

### Borders & Radius
- Filter bar panel: `border-radius: 0.75rem`
- Filter chips: `border-radius: 0.5rem`
- Dropdowns/popovers: `border-radius: 0.5rem`, `box-shadow: var(--shadow-lg)`
- Table container: `border-radius: 0.75rem` with overflow hidden

### Transitions
- Filter chip enter/exit: `150ms ease-out` (scale 0.8→1 + opacity)
- Table opacity on loading: `200ms ease-in-out`
- Row hover: `150ms ease-in-out` background + transform
- Dropdown open: `200ms ease-out` (scaleY 0→1, transform-origin top)

### Shadows
- Filter bar: `0 1px 3px rgba(0, 0, 0, 0.08)`
- Dropdown popover: `0 4px 12px rgba(0, 0, 0, 0.15)`
- Pagination active page: `0 1px 3px rgba(0, 0, 0, 0.12)`

## Keyboard Accessibility

- Tab cycles through: search input → PB toggle → Time trigger → Date trigger → Sort trigger → table rows → pagination
- Enter/Space on filter triggers opens dropdown
- Escape closes open dropdown
- Arrow keys navigate pagination
- Table rows: Enter navigates to run detail

## URL State

All filter state serialized to search params:

```
/runs?game=Celeste&category=Any%25&isPb=true&minTime=5400&sort=-time&page=2
```

Time values in seconds in URL, displayed as `h:mm:ss` in UI.
Browser back/forward navigates filter history.

## What This Design Does NOT Include (YAGNI)

- Density toggle (compact/comfortable) — start with compact only
- Column visibility customization
- Saved filter presets
- Export/download
- Aggregation views (games, categories, users) — that's the existing Stats Explorer
- Verification status filter (not in backend)
- Video availability filter
