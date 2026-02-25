# Your Performance Panel Redesign — Design

**Date:** 2026-02-25
**Status:** Approved

## Summary

Replace the current "Your Performance" sidebar panel (which uses `UserSummary` week/month data) with a "Highlight Reel" panel powered by a new dedicated backend endpoint. The panel leads with a personalized hero highlight, shows period stats with deltas vs previous period, displays top games with cover art, and mixes recent PBs and races into a unified activity feed.

## Goals

- Make users feel proud every time they visit the homepage
- Show something different each period so users come back to check
- Use the rich data already in the database (activity_daily, finished_runs, race stats) instead of the limited UserSummary
- Match the visual quality of Community Pulse (animations, visual hierarchy, amber accents)

## New Backend Endpoint

### `GET /v1/users/{username}/dashboard?period=7d|30d|year`

Single endpoint that returns everything the panel needs.

```typescript
interface DashboardResponse {
    period: '7d' | '30d' | 'year';

    // Aggregate stats for the period
    stats: {
        playtime: number;           // ms
        totalRuns: number;
        finishedRuns: number;
        totalPbs: number;           // real PB count from activity_daily.pb_count
        pbsWithPrevious: number;    // PBs that beat a previous PB
    };

    // Same stats for the previous equivalent period (for delta %)
    previousStats: {
        playtime: number;
        totalRuns: number;
        finishedRuns: number;
        totalPbs: number;
        pbsWithPrevious: number;
    };

    // Current/longest streak
    streak: {
        current: number;            // consecutive days with activity ending today/yesterday
        longest: number;            // longest streak in this period
        longestStart: string;       // ISO date
        longestEnd: string;         // ISO date
    } | null;

    // Top games this period (from activity_daily, max 3)
    topGames: Array<{
        gameId: number;
        gameDisplay: string;
        gameImage: string | null;
        totalPlaytime: number;
        totalAttempts: number;
        totalFinishedAttempts: number;
        totalPbs: number;
    }>;

    // All-time top 3 games (from user_game_stats, by totalRunTime)
    allTimeTopGames: Array<{
        gameDisplay: string;
        gameImage: string | null;
        totalRunTime: number;
    }>;

    // Recent PBs this period (from finished_runs where isPb=true, max 5)
    recentPbs: Array<{
        game: string;
        category: string;
        gameImage: string | null;
        time: number;
        previousPb: number | null;  // for improvement delta
        endedAt: string;
    }>;

    // Recent races this period (only if user raced)
    recentRaces: Array<{
        game: string;
        category: string;
        position: number;
        ratingBefore: number;
        ratingAfter: number;
        date: number;
    }>;

    // The computed hero highlight
    highlight: {
        type: 'pb_improvement' | 'race_win' | 'race_placement' | 'streak' | 'new_pb' | 'most_played';
        game?: string;
        category?: string;
        gameImage?: string;
        value?: number;             // improvement %, position, hours, streak days
        secondaryValue?: number;    // e.g. new PB time
        label: string;              // human-readable summary
    } | null;
}
```

### Highlight Picker Priority

1. **Biggest PB improvement %** — must have previousPb, pick highest `(previousPb - time) / previousPb * 100`
2. **Race win** — position === 1
3. **Streak** — current streak >= 5 days
4. **Best race placement** — position <= 3 with positive rating change
5. **New PB** — in most-played game
6. **Most played game** — fallback, always available if any activity exists

### Data Sources (all existing)

| Data | Source table/view | Query |
|------|-------------------|-------|
| Period stats | `activity_daily` | SUM deltas WHERE user_id=X AND date BETWEEN from/to |
| Previous period stats | `activity_daily` | Same query with prior date range |
| Streak | `activity_daily` | DISTINCT dates for user, compute consecutive runs |
| Top games this period | `activity_daily` JOIN games | GROUP BY game_id, ORDER BY totalPlaytime DESC LIMIT 3 |
| All-time top games | `user_game_stats` | WHERE username=X ORDER BY total_run_time DESC LIMIT 3 |
| Recent PBs | `finished_runs` JOIN games | WHERE user_id=X AND isPb=true AND endedAt BETWEEN from/to |
| Recent races | `UserSummary.races` or race API | Existing data |
| Highlight | Computed server-side from the above | No extra queries |

### Period Date Ranges

- **7d:** today minus 6 days → today. Previous: 14 days ago → 7 days ago.
- **30d:** today minus 29 days → today. Previous: 60 days ago → 30 days ago.
- **year:** Jan 1 of current year → today. Previous: same range last year.

## Panel UI Layout

### 1. Hero Highlight (top)

A visually distinct card at the top of the panel. Different visual treatment per highlight type:

- **PB Improvement:** Game art background (blurred, low opacity), bold green "↓25%" with new time underneath. Green accent border.
- **Race Win:** Gold accent, trophy icon, "1st Place" with game name and rating delta.
- **Streak:** Amber/fire accent, flame icon, "{N}-day streak" prominently.
- **Most Played:** Game art as subtle backdrop, hours played in large text.

If no activity this period, show the most recent period's highlight with a subtle "from {timeago}" label. Never show an empty panel.

### 2. Period Toggle (centered)

Three-option pill toggle: **7d** | **30d** | **Year**

Rolling windows, not calendar boundaries. Same visual style as current toggle (gradient active state).

### 3. Stat Ribbon (horizontal row)

Four stats in a single horizontal row:

| Stat | Value | Delta |
|------|-------|-------|
| Playtime | `12h 34m` | `↑18%` (green) |
| PBs | `4` | `↑2` (green) |
| Runs | `47` | `↓12%` (red/neutral) |
| Streak | `5d` | — |

Each stat: bold number on top, tiny delta below it (green up arrow, red down arrow, or dash if no previous data), label at bottom.

Deltas are calculated as `(current - previous) / previous * 100` for percentage stats, or absolute difference for counts.

### 4. Top Game Card

The #1 game this period, displayed as a compact card:

- Left: Game cover art (36×48, 3:4 ratio)
- Right: Game name (bold), category if single, period stats (playtime, attempts, PBs)
- Entire card clickable → links to game page

Below: 2 small "all-time" chips showing the user's top all-time games (game image 20×27, name, total hours). Gives stable identity alongside the dynamic period content.

### 5. Recent Activity Feed

Up to 5 items, PBs + races mixed, sorted by recency:

**PB entry:**
- Game image (15×20, 3:4), game name, category
- New time in monospace, improvement delta in green (`-2:34.56`)
- Relative timestamp
- Clickable → game/category page

**Race entry:**
- Game image, game name, category
- Placement badge (1st gold, 2nd silver, 3rd bronze, others gray)
- Rating change (`+48` green, `-12` red)
- Relative timestamp
- Clickable → race page

### 6. Logged-Out State

Keep the current search box for looking up runners. Add a teaser line above: "Sign in to track your performance" with a subtle preview of what the panel looks like.

## Visual Design Notes

- Hero highlight should use the same visual language as the race cards (background art, gradient overlay)
- Stat ribbon font: monospace for numbers, same as Community Pulse
- Delta arrows: green for positive, muted red for negative, gray dash for no change
- Animate stat values on period switch (count-up like Community Pulse)
- Game images are always 3:4 aspect ratio per CLAUDE.md

## Frontend Changes

### Files to modify
- `app/(new-layout)/frontpage/sections/your-stats-section.tsx` — New server component, fetch from dashboard endpoint
- `app/(new-layout)/frontpage/sections/your-stats-client.tsx` — Complete rewrite with new layout
- `app/(new-layout)/frontpage/sections/your-stats.module.scss` — Complete rewrite

### Files to create
- `src/lib/user-dashboard.ts` — `getUserDashboard(username, period)` fetch function

### Files unchanged
- `your-stats-search.tsx` — Logged-out search stays
- `frontpage.tsx` — Panel placement unchanged

## Backend Changes

### Files to create (in therun backend)
- `src/query/user-dashboard.ts` — Handler for `/v1/users/{username}/dashboard`
- Wire into `query-runs.ts` router

### Queries needed
All use existing tables/views. No schema changes.
