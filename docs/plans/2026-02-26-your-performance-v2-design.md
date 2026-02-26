# Your Performance Panel — v2 Redesign

**Date:** 2026-02-26
**Status:** Approved

## Problem

The current panel is a stats dump, not an engagement tool. It shows numbers but tells no story. There's no emotional hook, no progression narrative, no reason to come back daily. Key issues:

- No clear focal point — everything has equal visual weight
- Streak buried in a 4-cell ribbon instead of being a retention hook
- "Fun Fact" label undermines the highlight card
- Recent activity (the freshest content) is dead last
- All-Time Favorites as horizontal chips is static and space-inefficient
- No forward-looking content (milestones, goals)
- Missing deltas on playtime and runs

## Design

### Layout

Panel stays in lg=4 sidebar (~350px). Content order, top to bottom:

### 1. Streak Bar

Full-width element, always first. Shows three streak values:

- **Current streak** — large, left-aligned with flame icon. The "come back today" hook.
- **Period best** — smaller inline: "best this period: Xd"
- **All-time record** — smaller inline: "record: Xd"

States:
- **Normal:** `🔥 5 days — best this period: 8d · record: 12d`
- **Near record:** "2 days to beat your record" replaces plain record text (uses `streakMilestone` API field)
- **New record:** Gold accent treatment, "New Record!" label
- **Zero (with activity):** "No streak — run today to start one"
- **Zero (no activity):** Hidden or minimal

### 2. Highlight Carousel

2-3 highlights from API array, auto-rotates every 6 seconds. Dot indicators for manual navigation. Smooth crossfade transition.

Contextual tags replace "Fun Fact":

| Highlight types | Tag |
|---|---|
| `new_pb`, `pb_improvement`, `pb_spree`, `pb_machine` | Personal Best |
| `streak`, `longest_streak` | On Fire |
| `race_win`, `race_placement` | Race Result |
| `consistency`, `grinder`, `busiest_game` | Dedication |
| `comeback`, `playtime_surge` | Comeback |
| `completion_rate`, `runs_per_pb`, `alltime_finish_rate` | Efficiency |
| `total_playtime`, `alltime_playtime`, `alltime_runs`, `alltime_games` | Milestone |

Existing accent colors (Green, Amber, Gold, Blue, Primary) and card visual structure kept.

### 3. Period Toggle

7d / 30d / Year. Unchanged from current implementation.

### 4. Core Stats Ribbon

3-cell ribbon (down from 4 — streak extracted):

| Cell | Value | Subtitle |
|---|---|---|
| Playtime | `DurationToFormatted human` | vs previous period delta % |
| PBs | count | vs previous period delta % |
| Runs | finishedRuns count | vs previous period delta % |

All cells get green ↑ / red ↓ / neutral dash delta badges. "of X total" sub-labels removed (global context moves to footer).

### 5. Recent Activity

Last 5 PBs + races merged, sorted by date. Promoted from last position to here.

Changes from current:
- Race items get game images (currently missing)
- Race items become `<Link>` elements (currently `<div>`)
- Slightly larger images: 20×27px (up from 15×20)

### 6. Top Game Card

Period's #1 game. Unchanged — image, name, playtime, attempts, PBs. Clickable link.

### 7. All-Time Favorites

Redesigned from horizontal chips to compact ranked vertical list:

```
1. [img] Super Mario 64      234h
2. [img] Celeste              89h
3. [img] Hollow Knight        42h
```

Each row is a link. Game images 20×27px. Max 3 games.

### 8. Global Stats Footer

Single muted line at bottom of panel:

```
14 games · 28 categories · 4,231 runs
```

Replaces the second stat ribbon (Games/Categories). Same data, fraction of the space.

## API Changes

### Modified fields on `DashboardResponse`:

- `highlight: DashboardHighlight | null` → `highlights: DashboardHighlight[]` (2-3 items)
- Keep `highlight` as deprecated alias for backwards compat if needed

### New fields:

```typescript
interface DashboardStreakMilestone {
    type: 'near_record' | 'new_record' | 'at_risk';
    daysToRecord?: number;  // for near_record
    message: string;        // pre-formatted: "2 days to beat your record"
}
```

Add `streakMilestone: DashboardStreakMilestone | null` to `DashboardResponse`.

## What's Removed

- "Fun Fact" generic label
- 4th stat cell (streak) from ribbon — extracted to dedicated bar
- Second stat ribbon (Games/Categories) — replaced by footer line
- "of X total" sub-labels on stat cells
- Horizontal chip layout for all-time favorites
