# Homepage Redesign — "The Front Page of Speedrunning"

## Status: Design

## Goal

Transform the homepage from a personal runner dashboard into a viewer-first daily destination for the speedrunning community. Runners and viewers alike should want to visit every day.

## Design Principles

- **Viewer-first**: Optimize for people discovering and following speedruns, not just active runners
- **Daily hook**: Content changes every day — live activity, recent records, trending games
- **One designed experience**: No customization/drag-drop. Everyone sees the same optimized layout
- **Show scale**: Impress visitors with how alive and active speedrunning is
- **People over data**: Humanize the content — runners, not just times

## Page Structure

```
+------------------------------------------------------------------+
|                        TOPBAR (existing)                         |
+------------------------------------------------------------------+
|                                                                  |
|  HERO — "The Pulse" (full-width)                                 |
|  +---------------------------+  +-----------------------------+  |
|  |                           |  | Run Context                 |  |
|  |    Twitch Embed           |  |  Runner name + avatar       |  |
|  |    (top importance run)   |  |  Game / Category            |  |
|  |                           |  |  Live timer, split 12/24    |  |
|  |                           |  |  PB, delta, prediction      |  |
|  |                           |  |  Best possible time         |  |
|  +---------------------------+  +-----------------------------+  |
|  | Runner Switcher: [Run1] [Run2] [Run3] [Run4] [Run5]  →    |  |
|  +---------------------------+  +-----------------------------+  |
|                                 | Pulse Counters              |  |
|                                 |  847 runners live            |  |
|                                 |  143 PBs today               |  |
|                                 |  12,459 runs today           |  |
|                                 |  [sparkline]                 |  |
|                                 +-----------------------------+  |
|                                                                  |
+------------------------------------------------------------------+
|                                                                  |
|  SEARCH BAR (full-width, centered)                               |
|  [ Search for a game, runner, or category...              🔍 ]  |
|                                                                  |
+------------------------------------------------------------------+
|                                                                  |
|  MAIN COLUMN (8/12)              |  SIDEBAR (4/12)              |
|                                  |                              |
|  Recent Notable PBs              |  Live Races                  |
|  +----------------------------+  |  +--------------------------+|
|  | 🏆 Game Image              |  |  | Race: SM64 16 Star      ||
|  | Runner - Game - Category   |  |  | In Progress - 4 runners ||
|  | Time — "New #3 all-time"   |  |  | 1. Runner1 - Split 8    ||
|  | 12 min ago                 |  |  | 2. Runner2 - Split 7    ||
|  +----------------------------+  |  | 3. Runner3 - Split 7    ||
|  | ...more PBs...             |  |  +--------------------------+|
|  +----------------------------+  |  | Upcoming: OoT Any% Race ||
|                                  |  | Starting in 20 min      ||
|  Most Active Games (This Week)   |  | 6 participants joined   ||
|  +----------------------------+  |  +--------------------------+|
|  | Game Image | Game Name     |  |                              |
|  | 234 runners | 1,892 runs  |  |  Runner Spotlights           |
|  +----------------------------+  |  +--------------------------+|
|  | Game Image | Game Name     |  |  | Runner + avatar          ||
|  | 189 runners | 1,456 runs  |  |  | Primary game             ||
|  +----------------------------+  |  | 42h this week, 890 runs ||
|  | ...more games...           |  |  +--------------------------+|
|                                  |  | ...more runners...       ||
|                                  |  +--------------------------+|
|                                  |                              |
|                                  |  Personal Stats (auth only)  |
|                                  |  +--------------------------+|
|                                  |  | Your week: 12 runs       ||
|                                  |  | Last PB: 2 days ago      ||
|                                  |  | → View full dashboard    ||
|                                  |  +--------------------------+|
|                                  |                              |
+------------------------------------------------------------------+
```

## Section Details

### 1. Hero — "The Pulse"

Full-width section at the top of the page. Two primary zones.

**Left: Featured Stream**
- Twitch embed showing the highest-importance live run
- Runner carousel below/beside: top 5 live runs by importance, clickable thumbnails or name tabs
- "Watch next run" button with right-arrow keyboard shortcut (existing behavior)
- TV-style channel surfing between the top runs

**Right: Run Context + Pulse**

*Run Context (upper right):*
- Runner name + avatar + patron badge (if applicable)
- Game / Category
- Live timer component
- Current split name + progress indicator (e.g., "Split 12/24")
- PB time, delta to PB (color-coded green/red), best possible time
- Current prediction
- "Streaming" indicator with viewer count if available

*Pulse Counters (lower right):*
- Animated counters that tick up:
  - Runners live right now
  - PBs set today
  - Runs completed today
- Small sparkline showing live runner count over the last few hours
- Numbers should feel alive — animating on update

**Data Sources:**
- `getTopNLiveRuns(5)` — top 5 by importance
- `/v1/runs/global-stats` — total platform stats
- `/v1/finished-runs?aggregate=count&after_date={today}` — today's run count
- `/v1/finished-runs?aggregate=count&after_date={today}&is_pb=true` — today's PB count
- Live count history API (`/live/count/history`) — sparkline data
- WebSocket (`wss://ws.therun.gg`) — real-time run updates

### 2. Search Bar

Full-width, centered between hero and main content. Prominent but compact.

- Placeholder: "Search for a game, runner, or category..."
- Uses existing Algolia search integration
- Instant results as you type — games, runners, categories
- Dropdown results panel with game images and runner avatars

**Data Sources:**
- Algolia search (existing integration)

### 3. Main Column — Highlights Feed

The wider column (~8/12 on desktop). Curated, editorial content.

#### Recent Notable PBs

The centerpiece of the main column. A feed of personal bests filtered to be interesting — from popular categories with real competition.

Each PB card:
- Game image (left side)
- Runner name (with patron badge if applicable)
- Game name + category
- Time achieved
- Relative timestamp ("12 min ago")
- **Context line** that makes it meaningful: "New #3 all-time", "First sub-2:00:00", "Improved by 45s", rank in category

Filtering strategy: Use `top_categories` parameter to limit PBs to categories with actual competition. A PB in a category with 500 runners is news; a PB in a category with 1 runner is not.

**Data Sources:**
- `/v1/finished-runs?top_categories=100&is_pb=true&sort=-ended_at&limit=20` — recent PBs from top 100 categories
- `/v1/runs/stats?type=recent_pbs&period=day` — alternative/supplement
- Game data (images, display names) — existing game data fetching
- User data (avatars, patron status) — existing user data fetching

#### Most Active Games (This Week)

Below the PB feed. Discovery-oriented — "what games are people running right now?"

Compact cards or rows:
- Game image + game name
- Runner count this week
- Run count this week
- Trend indicator if data supports it (up/down vs last period)

**Data Sources:**
- `/v1/runs/stats?type=most_active_games&period=week`
- `/v1/runs/games?sort=-unique_runners&limit=10` — alternative

### 4. Sidebar — Live Pulse

Narrower column (~4/12 on desktop). Glanceable, frequently-updating content.

#### Live Races

Top of sidebar. Races are prominently featured.

*Active races:*
- Game + category
- Race status badge (starting / in progress / finishing)
- Participant count
- If in progress: mini-leaderboard showing top 3 runners with current split progress and delta to each other
- Time elapsed
- Link to full race view

*Upcoming races:*
- Game + category
- "Starting in X min"
- Participants joined count
- Gives viewers a reason to come back soon

**Data Sources:**
- `getAllActiveRaces()` — active races
- `getPaginatedFinishedRaces(1, 4)` — recent finished (for when no active races)

#### Runner Spotlights

"These people grind." Most dedicated runners this week/month.

Compact cards:
- Runner name + avatar + patron badge
- Primary game they're running
- Hours this week / attempts this week
- Link to profile

**Data Sources:**
- `/v1/runs/user-stats?sort=-total_run_time&limit=5` — by playtime
- `/v1/finished-runs?aggregate=count&group_by=username&after_date={this_week}&sort=-value&limit=5` — by runs completed this week

#### Personal Stats (Logged-in Only)

Bottom of sidebar. Compact snapshot.

- Runs this week/month
- Last PB date and game
- Quick comparison to last period
- "View full dashboard →" link to profile

**Data Sources:**
- Existing `getUserSummary()` function
- User's recent PB data

### 5. Patron Integration

No dedicated panel. Instead, patron badges appear organically on usernames throughout the page:
- In the PB feed: patron runners have a badge next to their name
- In runner spotlights: patron badge visible
- In the hero run context: patron badge if featured runner is a patron
- Badge styling based on tier (existing patron tier colors/icons)

## Removed from Current Homepage

| Feature | Reason |
|---------|--------|
| Drag/drop panel customization (dnd-kit) | One designed experience for everyone |
| Panel config saving/loading | No customization needed |
| Current User Live panel | Runner knows they're live; viewer-first page |
| Dedicated Patreon panel | Replaced by organic patron badges |
| Hidden panels dropdown | No panel hiding |
| Layout switcher (old vs new) | Single layout going forward |
| Two-column panel system | Replaced by main + sidebar layout |
| Activity line chart as hero element | Replaced by pulse counters + small sparkline |

## Mobile Layout

Everything stacks vertically in priority order:

1. Hero stream (full width, 16:9 aspect ratio)
2. Run context (runner info, splits, delta, PB)
3. Pulse counters (compact horizontal row)
4. Runner switcher (horizontal scroll)
5. Search bar
6. Live races (time-sensitive, promoted above feed)
7. Recent notable PBs
8. Most active games
9. Runner spotlights
10. Personal stats (logged-in only)

Sidebar content slots between search and the main feed on mobile, prioritizing live/time-sensitive content.

## Technical Notes

### Caching Strategy
- Hero live data: real-time via WebSocket, no cache
- Pulse counters: `'use cache'` with `cacheLife('seconds')` — frequent updates
- Recent PBs feed: `'use cache'` with `cacheLife('minutes')`
- Most active games: `'use cache'` with `cacheLife('hours')` — changes slowly
- Runner spotlights: `'use cache'` with `cacheLife('hours')`
- Personal stats: `'use cache'` with `cacheLife('minutes')`, tagged per user
- Race data: `'use cache'` with `cacheLife('seconds')` — races are live

### New API Calls Needed
- `/v1/runs/global-stats` — not currently called from frontend
- `/v1/finished-runs?aggregate=count&after_date=X` — today's counts
- `/v1/finished-runs?top_categories=100&is_pb=true` — curated PBs
- `/v1/runs/stats?type=most_active_games&period=week` — trending games
- `/v1/runs/user-stats?sort=-total_run_time&limit=5` — runner spotlights
- `/v1/finished-runs?aggregate=count&group_by=username&after_date=X` — runner activity

### Components to Build
- `PulseCounters` — animated global stat counters
- `RunnerSwitcher` — TV-style carousel for top 5 runs
- `HighlightsFeed` — curated PB feed with context lines
- `ActiveGames` — trending games section
- `RunnerSpotlights` — dedicated runners section
- `LiveRacesSidebar` — compact race display with mini-leaderboards
- `CompactPersonalStats` — logged-in user snapshot
- `HomepageSearch` — Algolia search bar for homepage
- `PatronBadge` — reusable inline badge for patron usernames

### Components to Reuse
- `TwitchPlayer` — existing stream embed
- `LiveSplitTimerComponent` — existing live timer
- `HeroRunStats` — existing run context (refine, don't rebuild)
- Algolia search logic — existing search integration
- WebSocket hooks — existing real-time infrastructure
- Race card components — existing race display

### Components to Remove
- `FrontpageLayout` (draggable layout)
- `StaticFrontpageLayout`
- `DraggablePanel`
- `HiddenPanelsDropdown`
- `CurrentUserLivePanel`
- `PatreonPanel` (dedicated panel)
- Panel config action (`frontpage-config.action.ts`)
- Panel registry (`frontpage-panels.ts`, `frontpage-panels-metadata.ts`)
- `FrontpageConfig` types
