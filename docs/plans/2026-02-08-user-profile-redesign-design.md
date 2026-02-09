# User Profile Redesign

**Date:** 2026-02-08
**Status:** Design

## Overview

Complete visual and structural redesign of the user profile page at `app/(old-layout)/[username]`, adopting the new-layout design system (Panels, design tokens, sage green palette, animations). The profile becomes an identity-first showcase that makes runners proud to share and visitors want to keep coming back.

## Design Principles

1. **Identity-first** — the hero section immediately tells you who this runner is
2. **Everything stays** — all existing data and functionality is preserved, just elevated
3. **New design system** — Panels, design tokens, SCSS modules, sage green palette
4. **Nothing hidden unnecessarily** — each tab is rich and well-organized
5. **Live presence** — when a runner is live, the profile reflects it prominently

## Architecture: Keep in `(old-layout)`

The profile stays in `app/(old-layout)/[username]` but adopts the new-layout design tokens and components. We import design tokens, Panel, Card, and Badge components from the new-layout.

---

## Section 1: Hero — Runner Identity Card

A full-width hero section at the top of every profile view (above tabs).

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────┐                                                       │
│  │avatar│  Username [LIVE badge if live]         Total  Total   │
│  │ 96px │  they/them · 🇺🇸 · EST               Games   PBs    │
│  └──────┘  Bio text here                        Hours  Comp%   │
│            [twitch] [youtube] [twitter] [bsky]   Races          │
│                                           [edit btn if owner]   │
└─────────────────────────────────────────────────────────────────┘
```

### Components

- **Avatar**: 96px circular image from Twitch profile picture
- **Username**: Bold heading, patreon name styling if applicable
- **Live badge**: Ping animation + "LIVE" text, links to `/live/{username}`. Only shown when user has active run via WebSocket.
- **Metadata line**: Pronouns badge, country flag, timezone — inline, subtle
- **Bio**: Max 100 chars, displayed as body text
- **Social links**: Icon buttons with hover lift effect (Twitch, YouTube, Twitter/X, Bluesky)
- **Stats strip**: 5 key metrics in a horizontal row on the right side:
  - Total Games (unique game count)
  - Total Categories (run count)
  - Total Hours Played
  - Completion %
  - Total Races
  - Uses monospace tabular-nums for numbers
- **Edit button**: Subtle icon top-right, opens modal (not inline editing). RBAC-controlled.

### Styling

- Background: New-layout gradient (subtle sage green tint fading to body color)
- Uses `_design-tokens.scss` spacing, shadows, transitions
- Responsive: stacks vertically on mobile (avatar + name above, stats below)

---

## Section 2: Tab Navigation

Redesigned tabs below the hero. Not Bootstrap default tabs.

### Tabs

1. **Overview** (default) — Game portfolio, highlighted runs, stats
2. **Activity** — Heatmaps, charts, session history (merges old Activity + Sessions tabs)
3. **Races** — Race stats and history (moved from separate page `/{username}/races`)
4. **Stream** — Twitch embed (conditional: only if user has Twitch channel)

### Styling

- Pill-shaped or underline-style tabs
- Active tab: sage green primary color with indicator
- Hover: subtle lift/color change
- Uses design tokens for spacing and transitions
- Game time toggle (IGT/RTA switch) positioned to the right of the tabs
- Game filter dropdown positioned next to game time toggle

---

## Section 3: Overview Tab

The default view. Two-column layout (main + sidebar on xl, single column on smaller).

### 3a. Live Run Banner (Conditional)

When the user is currently running, a prominent banner at the top of the overview.

- Uses the `CurrentUserLivePanel` design language: pulse-glow border, gradient background
- Shows: game image, game/category, live timer, current split, PB, delta, progress bar
- Links to `/live/{username}`
- Disappears when run ends (WebSocket-driven)

### 3b. Main Content: Game Panels (Left Column, xl=8)

Each game becomes a **Panel** (bookmark-folder style):

- Panel tab: game name + game image thumbnail
- Panel content: clean table of categories
  - Columns: Category name (link), PB, Attempts, Time Played, PB Date
  - Highlighted runs: star icon, subtle visual elevation
  - VOD indicator: play button icon on runs with video
  - RBAC controls: edit/delete/highlight buttons (owner/admin only)
- Game filter: horizontal filter bar above the panels (or dropdown if 2+ games)
- Games sorted with highlighted runs first (existing behavior)

### 3c. Sidebar (Right Column, xl=4)

Stacked Panels:

1. **Quick Stats Panel**
   - Total Games, Total Categories, Total Time Played, Total Attempts, Total Completed, Completion %, Last Active
   - Uses compact card layout with monospace numbers

2. **Weekly/Monthly Summary Panel** (from frontpage stats panel)
   - Period selector (this week / this month)
   - Completion rate ring (circular progress)
   - Hours played, finished runs, started runs
   - Recent finished runs as compact cards

3. **Race Stats Panel** (if user has race data)
   - Total Races, Finished Races, Finish %, Total Race Time
   - Link to Races tab for full details

4. **Highlighted Run Panel** (if user has a highlighted run with VOD)
   - Run title with star icon
   - PB display
   - Embedded VOD player

---

## Section 4: Activity Tab

Consolidates current Activity and Sessions tabs.

### 4a. Summary Cards Row

3-4 compact stat cards in a horizontal row:
- Total playtime this year
- Most active day of the week
- Most active hour
- Longest streak / longest session

### 4b. Activity Heatmap Panel

- Calendar heatmap in a Panel (bookmark-folder style)
- Year selector in Panel header
- Color scale using sage green palette (light → deep green)
- Total playtime display

### 4c. Playtime Charts Panel

- Two charts side-by-side in one Panel:
  - Playtime by day of week (bar chart)
  - Playtime by hour of day (bar chart)
- Sage green color palette for chart bars
- Tooltips on hover

### 4d. Recent Sessions Panel

- Table of last 10 sessions (from current Sessions tab)
- Columns: Run, Started, Ended, Duration, Started Runs, Finished Runs, Finish Times
- Wrapped in Panel
- Respects game time toggle

---

## Section 5: Races Tab

Content from `/{username}/races` brought into a profile tab.

### 5a. Race Stats Summary

Row of stat cards: Total Races, Finish %, Total Race Time, Best Placement

### 5b. Race History Panel

- Panel with table of race participations
- Columns: Game/Category, Date, Position, Rating Change, Time
- Rating changes: green for increase, red for decrease
- Paginated or "load more"

### 5c. Stats by Game

- Collapsible Panels per game showing category-level race stats
- Reuses `UserRaceStatsByGame` component with new styling

---

## Section 6: Stream Tab (Conditional)

- Only rendered as a tab if user has Twitch channel
- Twitch embed wrapped in Panel
- Full-width, responsive height
- Muted by default, includes chat

---

## Migration Notes

### Components to Create
- `ProfileHero` — hero identity card
- `ProfileTabs` — styled tab navigation
- `OverviewTab` — overview content
- `ActivityTab` — merged activity + sessions
- `RacesTab` — inline race stats
- `StreamTab` — twitch embed
- `LiveRunBanner` — conditional live run display
- `GamePanel` — game-as-Panel component
- `QuickStatsPanel` — sidebar stats
- `SummaryPanel` — weekly/monthly summary
- `ProfileEditModal` — modal-based profile editing

### Components to Reuse (from new-layout)
- `Panel` component
- `Card` / `CardWithImage` components
- `Badge` component
- `PingAnimation` component
- Design tokens (`_design-tokens.scss`, `_mixins.scss`)

### Components to Retire
- `Userform` inline editing (replaced by modal)
- Bootstrap default tab styling
- `SessionOverview` as separate tab (merged into Activity)

### Data Fetching
- No changes to data fetching — same server-side data, same API calls
- Race data fetching moves from races page into main profile page
- WebSocket live run updates unchanged

### RBAC
- All existing RBAC controls preserved
- Edit profile → opens modal instead of inline form
- Run management (edit/delete/highlight) → same behavior, new styling
