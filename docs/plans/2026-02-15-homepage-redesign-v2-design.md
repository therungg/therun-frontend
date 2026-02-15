# Homepage Redesign v2

## Overview

Complete redesign of the new-layout front page. Fixed layout (no drag-and-drop), structured sections, equal weight for runners and spectators. Removes the panel config system.

## Page Structure

```
1. Hero             — featured live run + small Twitch + live run sidebar
2. Community Pulse  — today/week/month stats + activity chart + all-time totals
3. Trending (60%) + PB Feed (40%)
4. Races (50%) + Your Stats (50%)
5. Patreon
```

Full-width sections. Paired sections share a row with content-driven sizing. Pairs stack on mobile.

---

## Section 1: Hero (Compact)

Three columns: Featured Run (~35%) | Twitch Embed (~30%) | Live Sidebar (~35%)

**Featured Run (left):**
- Game image as subtle background
- Runner name + avatar
- Game / Category
- Live timer (WebSocket-updated)
- Current split name
- Delta from PB
- Progress bar (current split / total splits)

**Twitch Embed (center):**
- Smaller player (~30% width, down from ~40%)
- Autoplay muted
- Switches when featured runner changes

**Live Sidebar (right):**
- Next 4 live runners as compact cards
- Click to switch featured runner + Twitch embed
- Keyboard arrow navigation
- "View all live runs" link at bottom

**Data:** `getTopNLiveRuns(5)` — first is featured, rest in sidebar. WebSocket for real-time updates.

**Caching:** `cacheLife('seconds')`

---

## Section 2: Community Pulse

Full-width horizontal strip. Job: make the site feel alive at a glance.

**Period toggle:** `[Today | This Week | This Month]` — client-side switch, all data prefetched.

**Top row — period stats (dynamic):**
- Live runner count (always live, from `/live/count`)
- Runs completed in selected period
- PBs set in selected period
- Delta vs previous period ("up 8% from last week")

**Middle — activity chart:**
- Live count history, adapts to selected period (24h / 7 days / 30 days)
- Compact sparkline-style, full width
- Data: `getLiveCountHistory()` with date range params

**Bottom row — all-time totals (slow-moving):**
- Total runners, total finished runs, total run time
- From `getGlobalStats()`
- Formatted large: "2.4M runners"

**Data functions:**
- Existing: `getGlobalStats()`, `getTodayStats()`, `getLiveCountHistory()`
- New: `getPeriodStats(period: 'day' | 'week' | 'month')` — wraps `/v1/finished-runs?aggregate=count&after_date=...` for runs + PBs
- New: Same with previous period offset for delta calculation

**Caching:**
- Live count: `cacheLife('seconds')`
- Period stats: `cacheLife('minutes')`
- Global stats: `cacheLife('hours')`

---

## Section 3: Trending + PB Feed (60/40 row)

### Trending (60% left)

Three stacked sub-sections:

**Hot Games** — top 5-6 games by activity this week
- Game image + name
- Run count this week + unique runners
- Delta vs previous week ("up 24%")
- Click -> game page
- Data: `getMostActiveGames('week')` (exists) + new previous-week comparison

**Most Active Runners** — top 3 by playtime this week
- Avatar + name + total playtime
- Click -> profile
- Data: `getWeeklyTopRunners(3)` (exists)

**Most PBs Set** — top 3 by PB count this week
- Avatar + name + PB count
- Click -> profile
- Data: `getMostPBsRunners(3)` (exists)

**Caching:** `cacheLife('hours')`

### PB Feed (40% right)

Vertical scrolling feed of recent PBs.

**Each entry:**
- Runner name + small avatar
- Game + category (with game image icon)
- Final time
- Improvement delta from `previousPb` field: "(-0:38 from previous PB)"
- Relative timestamp ("2m ago")
- Click -> user's game/category page

**Data:** `getRecentNotablePBs(20)` (exists) — pulls from `finished_runs` where `is_pb=true` from top 100 categories, sorted by `ended_at DESC`.

**Caching:** `cacheLife('minutes')`

---

## Section 4: Races + Your Stats (50/50 row)

### Races (50% left)

**In Progress:**
- Game + category
- Participant progress (3/5 finished)
- Elapsed time
- Click -> race page
- Max 2-3 shown

**Upcoming:**
- Game + category
- Participant count
- Time until start
- Click -> race page to join
- Max 2-3 shown

**CTAs:** "Start a Race" button + "View all races" link.

**Data:** `getAllActiveRaces()` (exists). Filter by status.

**Caching:** `cacheLife('minutes')`

### Your Stats (50% right)

**Logged out:** Search bar to look up any user's stats. Serves spectators.

**Logged in:** `[Week | Month]` toggle (client-side, both prefetched).

- Summary: total playtime, runs completed, PBs set, finished rate
- Recent runs list from `finishedRuns` array — shows times, PB flags, deltas
- "View full stats" link to profile

**Data:** `getUserSummary(user, 'week', 0)` and `getUserSummary(user, 'month', 0)` (both exist).

**Caching:** `cacheLife('minutes')`

---

## Section 5: Patreon

Same as today. Non-hideable. Weighted random patron selection.

---

## What Gets Removed

- Drag-and-drop panel system (`DraggableFrontpageLayout`, `dnd-kit` usage)
- Frontpage config system (`frontpage-config.action.ts`, config API calls)
- Panel registry pattern (`frontpage-panels.ts`, `frontpage-panels-metadata.ts`)
- `HiddenPanelsDropdown` component
- Activity chart from hero (moves to Community Pulse)

## New Data Functions Needed

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `getPeriodStats(period)` | `/v1/finished-runs?aggregate=count&after_date=...` | Runs + PBs for day/week/month |
| `getPreviousPeriodStats(period)` | Same with offset dates | Delta comparison |
| `getMostActiveGamesPreviousWeek()` | `/v1/runs/stats?type=most_active_games&period=week` with offset | Hot games delta |

## Existing Functions Reused

- `getTopNLiveRuns(5)` — Hero
- `getGlobalStats()` — Community Pulse all-time
- `getTodayStats()` — Community Pulse today
- `getLiveCountHistory()` — Community Pulse chart
- `getMostActiveGames('week')` — Trending hot games
- `getWeeklyTopRunners(3)` — Trending active runners
- `getMostPBsRunners(3)` — Trending PB grinders
- `getRecentNotablePBs(20)` — PB Feed
- `getAllActiveRaces()` — Races
- `getUserSummary(user, type, 0)` — Your Stats
- `getGameImageMap()` — Game images throughout
