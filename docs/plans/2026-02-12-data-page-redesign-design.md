# Data Page Redesign — Stats Explorer

## Status: Implemented

## Goal

Transform the data page from a confusing database query tool into a beautiful, intuitive public stats dashboard. Remove the auth gate. Make queries feel like answering questions, not writing SQL.

## Design Principles

- **Entity-first**: Users think in games, categories, and runners — not data sources and aggregates
- **Show only what matters**: Each view shows only its relevant filters
- **Immediate value**: Preset cards with live stats let users get answers in one click
- **Public by default**: No auth required — this is the stats hub of therun.gg

## Page Structure

**URL:** `/data`
**Title:** Stats Explorer
**Auth:** None (remove `confirmPermission` check)

```
┌──────────────────────────────────────────────────────────────┐
│  Stats Explorer                                              │
│  Explore speedrunning statistics across games, categories,   │
│  and runners.                                                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐   │
│  │ Top Games      │ │ PBs This Week  │ │ Most Dedicated │   │
│  │ by Playtime    │ │                │ │ Runners        │   │
│  │ 142,384h       │ │ 1,234 PBs      │ │ Top 50         │   │
│  └────────────────┘ └────────────────┘ └────────────────┘   │
│                                                              │
│  [ Games ] [ Categories ] [ Users ] [User Runs] [Fin. Runs] │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Min Playtime [__hrs]  Min Attempts [__]              │   │
│  │ After [____]  Before [____]   Metric [Playtime ▾]    │   │
│  │                                    Limit [50 ▾] [Go] │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  142 games                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ #  Game                  Total Playtime              │   │
│  │ 1  Super Mario 64        142,384h                    │   │
│  │ 2  Celeste               98,201h                     │   │
│  │ 3  The Legend of Zelda... 87,445h                     │   │
│  │ ...                                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Entity Tabs

Five tabs, each mapping to a natural question type. Tab selection is stored in URL as `?tab=games`.

### 1. Games

**Question:** "Which games have the most [playtime / attempts / runners]?"

**Filters:**
| Filter | Type | Notes |
|--------|------|-------|
| Min Playtime | Number (hours) | Maps to `min_playtime` API param |
| Min Attempts | Number | Maps to `min_attempts` |
| After | Date picker | Maps to `after_date` |
| Before | Date picker | Maps to `before_date` |
| Metric | Select | Total Playtime / Total Attempts / Finished Attempts / Runner Count |

**API mapping:**
- Total Playtime → `runs?aggregate=sum&group_by=game&aggregate_column=total_run_time`
- Total Attempts → `runs?aggregate=sum&group_by=game&aggregate_column=attempt_count`
- Finished Attempts → `runs?aggregate=sum&group_by=game&aggregate_column=finished_attempt_count`
- Runner Count → `runs?aggregate=count&group_by=game`

**Result columns:** #, Game, Value (formatted contextually — hours for playtime, number for counts)

### 2. Categories

**Question:** "Which categories in [game] have the most [playtime / attempts]?"

**Filters:**
| Filter | Type | Notes |
|--------|------|-------|
| Game | Text input | Maps to `game` |
| Min Playtime | Number (hours) | Maps to `min_playtime` |
| Min Attempts | Number | Maps to `min_attempts` |
| After | Date picker | Maps to `after_date` |
| Before | Date picker | Maps to `before_date` |
| Metric | Select | Total Playtime / Total Attempts / Finished Attempts / Runner Count |

**API mapping:** Same as Games but `group_by=category`.

**Result columns:** #, Game, Category, Value

### 3. Users

**Question:** "Who has the most [playtime / attempts] in [game]?"

**Filters:**
| Filter | Type | Notes |
|--------|------|-------|
| Game | Text input | Maps to `game` |
| Category | Text input | Maps to `category` |
| Min Playtime | Number (hours) | Maps to `min_playtime` |
| Min Attempts | Number | Maps to `min_attempts` |
| After | Date picker | Maps to `after_date` |
| Before | Date picker | Maps to `before_date` |
| Metric | Select | Total Playtime / Total Attempts / Finished Attempts |

**API mapping:** Same pattern but `group_by=username`.

**Result columns:** #, Username, Value

### 4. User Runs

**Question:** "What does [username] run? Show me their games and categories."

**Filters:**
| Filter | Type | Notes |
|--------|------|-------|
| Username | Text input (prominent) | Maps to `username` — primary filter |
| Game | Text input | Maps to `game` |
| Category | Text input | Maps to `category` |
| Min Playtime | Number (hours) | Maps to `min_playtime` |
| Min Attempts | Number | Maps to `min_attempts` |

**API mapping:** `runs?username=X` (no aggregate, raw rows)

**Result columns:** Game, Category, PB, Attempts, Finished Attempts, Total Playtime, Sum of Bests

### 5. Finished Runs

**Question:** "Show me individual completed runs matching these criteria."

**Filters:**
| Filter | Type | Notes |
|--------|------|-------|
| Game | Text input | Maps to `game` |
| Category | Text input | Maps to `category` |
| Username | Text input | Maps to `username` |
| PBs Only | Select | Any / PBs Only / Non-PBs Only → `is_pb` |
| After | Date picker | Maps to `after_date` |
| Before | Date picker | Maps to `before_date` |
| Top Games | Number | Maps to `top_games` |
| Top Categories | Number | Maps to `top_categories` |

**API mapping:** `finished-runs?...` (no aggregate, raw rows)

**Result columns:** Game, Category, Username, Time, Game Time, PB (badge), Date

## Preset Cards

Three curated query cards displayed prominently above the tabs. Each shows a live cached stat and auto-fills + executes a query when clicked.

| Preset | Tab | Filters | Live stat |
|--------|-----|---------|-----------|
| Top Games by Playtime | Games | metric=playtime, limit=50 | Total hours across all games |
| PBs This Week | Finished Runs | is_pb=true, after=7 days ago | Count of PBs this week |
| Most Dedicated Runners | Users | metric=playtime, limit=50 | — |

Preset cards use `'use cache'` with `cacheLife('hours')` for the live stat numbers.

## Filter Bar Design

- Single horizontal row of filters (wraps on mobile)
- Clean inputs with placeholder text — no labels above inputs
- Inputs have subtle borders, rounded corners
- Metric and Limit selectors are inline dropdowns
- Search button ("Go" or magnifying glass icon) at the end of the filter row
- Reset is a subtle text link, not a button

## Results Display

### Aggregated Tabs (Games, Categories, Users)
- Leaderboard-style table with rank column
- Column headers clickable for sort toggle (asc/desc)
- Duration values: formatted as hours with separator (e.g., "1,423h")
- Count values: thousand separators
- Result count above table ("142 games")

### Raw Tabs (User Runs, Finished Runs)
- Full data table with all columns
- Duration columns use `DurationToFormatted` component
- Dates as relative time ("2 days ago") with full datetime on hover
- PB column renders as a small badge/checkmark, not "Yes/No"
- Boolean values render as icons

### All Tabs
- Limit selector: 25 / 50 / 100 / 200
- Loading: skeleton rows (not spinner)
- Empty: contextual message per tab
- Error: inline alert

## URL State

All state in URL for shareability:
```
/data?tab=games&metric=playtime&min_playtime=10&limit=50
/data?tab=users&game=Super+Mario+64&metric=attempts
/data?tab=finished-runs&is_pb=true&after=2026-02-01
```

Auto-execute query on page load if URL has non-default params.

## Mobile Layout

- Tabs become a horizontal scroll strip
- Filter inputs stack vertically (2 per row)
- Tables become horizontally scrollable
- Preset cards become a horizontal scroll row
- Filter bar collapses behind a "Filters" toggle when results are showing

## Changes from Current Implementation

### Removed
- `confirmPermission` auth gate
- `maxAttempts` filter
- Aggregate mode dropdown (implicit per tab)
- Group By dropdown (implicit per tab)
- Column dropdown (replaced by Metric selector)
- Raw API URL display (`<code>` at bottom)
- Two grey boxes layout (filter-bar + aggregate-bar)

### Added
- Entity tabs (Games, Categories, Users, User Runs, Finished Runs)
- `min_playtime` filter (hours)
- Metric selector per aggregated tab
- Preset cards with live stats
- Skeleton loading states
- Clickable column headers for sorting
- PB badges instead of Yes/No

### Changed
- Page title: "Data Explorer" → "Stats Explorer"
- Presets: small buttons → prominent cards with live stats
- Filter layout: stacked grey boxes → single clean horizontal row
- Results: generic table → contextual leaderboard/data table
- Sort: dropdown → clickable column headers

## Technical Notes

### Component Structure
```
app/(old-layout)/data/
  page.tsx              — Server component, metadata, no auth check
  stats-explorer.tsx    — Client component, manages tab/filter/results state
  entity-tabs.tsx       — Tab bar component
  filter-bar.tsx        — Dynamic filter bar (renders different filters per tab)
  metric-selector.tsx   — Metric dropdown for aggregated tabs
  preset-cards.tsx      — Curated query cards with live stats
  results-table.tsx     — Unified results display
  build-query-url.ts    — Query URL builder (updated for new tab logic)
```

### Data Flow
1. User selects tab → filter bar updates to show relevant filters
2. User adjusts filters → local state updates
3. User clicks Go → `buildQueryUrl()` constructs API URL from tab + filters
4. SWR fetches data → results render in table
5. URL updates with all state params

### Caching
- Preset card live stats: `'use cache'` with `cacheLife('hours')`
- Query results: SWR client-side cache (same as current)
