# Homepage Redesign v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current drag-and-drop panel-based front page with a fixed-layout, section-based home page that showcases live runs, community pulse stats, trending games/runners, a PB feed, races, and user stats.

**Architecture:** The page becomes a single server component (`frontpage.tsx`) that renders 5 fixed sections top-to-bottom. Each section is its own server component wrapped in Suspense. No panel config, no drag-and-drop. Paired sections (Trending+PBFeed, Races+YourStats) share rows using Bootstrap grid. All data fetching uses existing `'use cache'` functions from `src/lib/highlights.ts`, `src/lib/live-runs.ts`, `src/lib/races.ts`, `src/lib/summary.ts`, plus 2 new functions for period stats.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Bootstrap grid, Nivo charts, react-use-websocket, SCSS modules

**Design doc:** `docs/plans/2026-02-15-homepage-redesign-v2-design.md`

---

## Task 1: New data-fetching functions for period stats

**Files:**
- Modify: `src/lib/highlights.ts`

**Step 1: Add `getPeriodStats` function**

Add after the existing `getTodayStats` function in `src/lib/highlights.ts`:

```typescript
export interface PeriodStats {
    runCount: number;
    pbCount: number;
}

export async function getPeriodStats(
    period: 'day' | 'week' | 'month',
): Promise<PeriodStats> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`period-stats-${period}`);

    const afterDate = getPeriodStartDate(period).toISOString();

    const [runData, pbData] = await Promise.all([
        apiFetch<{ count: number }>(
            `/v1/finished-runs?aggregate=count&after_date=${afterDate}`,
        ),
        apiFetch<{ count: number }>(
            `/v1/finished-runs?aggregate=count&after_date=${afterDate}&is_pb=true`,
        ),
    ]);

    return { runCount: runData.count, pbCount: pbData.count };
}

export async function getPreviousPeriodStats(
    period: 'day' | 'week' | 'month',
): Promise<PeriodStats> {
    'use cache';
    cacheLife('hours');
    cacheTag(`prev-period-stats-${period}`);

    const currentStart = getPeriodStartDate(period);
    const previousStart = getPeriodStartDate(period, 1);

    const afterDate = previousStart.toISOString();
    const beforeDate = currentStart.toISOString();

    const [runData, pbData] = await Promise.all([
        apiFetch<{ count: number }>(
            `/v1/finished-runs?aggregate=count&after_date=${afterDate}&before_date=${beforeDate}`,
        ),
        apiFetch<{ count: number }>(
            `/v1/finished-runs?aggregate=count&after_date=${afterDate}&before_date=${beforeDate}&is_pb=true`,
        ),
    ]);

    return { runCount: runData.count, pbCount: pbData.count };
}

function getPeriodStartDate(period: 'day' | 'week' | 'month', offset = 0): Date {
    const date = new Date();
    if (period === 'day') {
        date.setDate(date.getDate() - offset);
        date.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
        date.setDate(date.getDate() - 7 * (1 + offset));
        date.setHours(0, 0, 0, 0);
    } else {
        date.setMonth(date.getMonth() - offset, 1);
        date.setHours(0, 0, 0, 0);
    }
    return date;
}
```

**Step 2: Add `getMostActiveGamesPreviousWeek` function**

Add after `getMostActiveGames` in `src/lib/highlights.ts`:

```typescript
export async function getMostActiveGamesPreviousWeek(): Promise<ActiveGame[]> {
    'use cache';
    cacheLife('hours');
    cacheTag('active-games-prev');

    return apiFetch<ActiveGame[]>(
        '/v1/runs/stats?type=most_active_games&period=previous_week',
    );
}
```

Note: If the backend doesn't support `previous_week` as a period, we'll need to check and potentially use date-range filtering instead. Verify the backend endpoint supports this parameter before implementing.

**Step 3: Verify the build compiles**

Run: `npm run typecheck`
Expected: No new type errors from the added functions.

**Step 4: Commit**

```
feat: add period stats and previous-week data functions
```

---

## Task 2: Rewrite the main frontpage orchestrator

**Files:**
- Rewrite: `app/(new-layout)/frontpage/frontpage.tsx`

Replace the entire file. The new orchestrator renders fixed sections — no panel config, no drag-and-drop, no session-dependent layout branching for panels.

**Step 1: Write the new `frontpage.tsx`**

```typescript
import { Suspense } from 'react';
import { FrontpageHero } from './components/frontpage-hero';
import { CommunityPulse } from './sections/community-pulse';
import { TrendingAndPbFeed } from './sections/trending-and-pb-feed';
import { RacesAndYourStats } from './sections/races-and-your-stats';
import { PatreonSection } from './sections/patreon-section';
import { SectionSkeleton } from './components/section-skeleton';

export default async function FrontPage() {
    return (
        <div className="d-flex flex-column gap-4">
            <Suspense fallback={<SectionSkeleton height={340} />}>
                <FrontpageHero />
            </Suspense>
            <Suspense fallback={<SectionSkeleton height={250} />}>
                <CommunityPulse />
            </Suspense>
            <Suspense fallback={<SectionSkeleton height={500} />}>
                <TrendingAndPbFeed />
            </Suspense>
            <Suspense fallback={<SectionSkeleton height={400} />}>
                <RacesAndYourStats />
            </Suspense>
            <Suspense fallback={<SectionSkeleton height={150} />}>
                <PatreonSection />
            </Suspense>
        </div>
    );
}
```

**Step 2: Create `SectionSkeleton` component**

Create `app/(new-layout)/frontpage/components/section-skeleton.tsx`:

```typescript
export const SectionSkeleton = ({ height = 300 }: { height?: number }) => {
    return (
        <div
            className="rounded-4 placeholder-glow"
            style={{
                height: `${height}px`,
                backgroundColor: 'var(--bs-secondary-bg)',
            }}
        >
            <div className="p-4">
                <span className="placeholder col-3 mb-3" />
                <span className="placeholder col-8" />
                <span className="placeholder col-6" />
            </div>
        </div>
    );
};
```

**Step 3: Verify the build compiles (will fail — sections don't exist yet)**

This is expected. The sections will be created in subsequent tasks.

**Step 4: Commit**

```
refactor: rewrite frontpage orchestrator with fixed section layout
```

---

## Task 3: Rewrite the Hero section

**Files:**
- Modify: `app/(new-layout)/frontpage/components/frontpage-hero.tsx`
- Rewrite: `app/(new-layout)/frontpage/components/hero-content.tsx`
- Modify: `app/(new-layout)/frontpage/components/hero-content.module.scss`

The hero changes from 3 columns (activity chart | Twitch | run stats) to 3 columns (featured run stats | Twitch | live sidebar with 4 runners). The activity chart moves to Community Pulse.

**Step 1: Update `frontpage-hero.tsx`**

Remove the `getLiveCountHistory` call — it moves to Community Pulse. The hero only needs live runs now.

```typescript
import { getTopNLiveRuns } from '~src/lib/live-runs';
import { HeroContent } from './hero-content';

export const FrontpageHero = async () => {
    const liveRuns = await getTopNLiveRuns(5);
    return <HeroContent liveRuns={liveRuns} />;
};
```

**Step 2: Rewrite `hero-content.tsx`**

The new layout:
- Left (~35%): Featured run stats (game image background, runner name, game/category, live timer, current split, delta, progress bar)
- Center (~30%): Twitch embed (smaller)
- Right (~35%): List of next 4 runners as compact cards, click to switch

Key changes:
- Remove `countHistory` prop and `LiveCountChart` import
- Left column changes from activity chart to featured run details
- Right column changes from single-run stats display to a list of 4 clickable runner cards
- "Watch next run" button removed — clicking sidebar runners switches the featured run
- Keep WebSocket integration for real-time updates
- Keep keyboard arrow navigation

The left column should show:
- Runner avatar + name (large)
- "is running" label
- Game image + game name + category
- `LiveSplitTimerComponent` (large)
- PB, Current Split, +/- PB row (same as current right column stats)

The right column sidebar should show compact cards:
- Each card: runner name, game, delta, small progress indicator
- Active card highlighted
- Click handler switches `showedRunIndex`
- "View all live" link at bottom

Use the existing `LiveSplitTimerComponent`, `DurationToFormatted`, `DifferenceFromOne` components. Reuse existing SCSS module classes where possible, add new ones for sidebar cards.

**Step 3: Update SCSS module**

Add styles for the live sidebar cards (`.sidebarCard`, `.sidebarCardActive`, `.sidebarList`, `.viewAllLink`). Keep existing `.hero`, `.panel`, `.streamPanel`, `.liveIndicator`, `.userHeader`, `.userImageWrapper`, `.userImage`, `.gameInfo`, `.gameImageWrapper`, `.gameImage` classes — modify as needed for the new left column layout.

**Step 4: Verify the hero renders**

Run: `npm run dev` and check `/frontpage`
Expected: Hero shows featured runner on left, Twitch in center, 4 runners in sidebar on right.

**Step 5: Commit**

```
refactor: redesign hero with featured run and live sidebar
```

---

## Task 4: Community Pulse section

**Files:**
- Create: `app/(new-layout)/frontpage/sections/community-pulse.tsx`
- Create: `app/(new-layout)/frontpage/sections/community-pulse-client.tsx`
- Move: activity chart from hero to this section

This is a full-width section with:
- Period toggle (Today | This Week | This Month) — client-side
- Top row: live count, runs completed, PBs set (adapts to period)
- Delta vs previous period
- Activity chart (moved from hero, adapts to period)
- Bottom row: all-time totals

**Step 1: Create the server component `community-pulse.tsx`**

```typescript
import { cacheLife } from 'next/cache';
import {
    getGlobalStats,
    getPeriodStats,
    getPreviousPeriodStats,
} from '~src/lib/highlights';
import { CommunityPulseClient } from './community-pulse-client';

async function getLiveCountHistory() {
    'use cache';
    cacheLife('minutes');

    const res = await fetch('https://api.therun.gg/live/count/history');
    if (!res.ok) return [];
    const data = await res.json();
    return data.result ?? [];
}

async function getLiveCount(): Promise<number> {
    'use cache';
    cacheLife('seconds');

    const res = await fetch('https://api.therun.gg/live/count');
    if (!res.ok) return 0;
    const data = await res.json();
    return data.result ?? 0;
}

export const CommunityPulse = async () => {
    const [
        globalStats,
        dayStats,
        weekStats,
        monthStats,
        prevDayStats,
        prevWeekStats,
        prevMonthStats,
        countHistory,
        liveCount,
    ] = await Promise.all([
        getGlobalStats(),
        getPeriodStats('day'),
        getPeriodStats('week'),
        getPeriodStats('month'),
        getPreviousPeriodStats('day'),
        getPreviousPeriodStats('week'),
        getPreviousPeriodStats('month'),
        getLiveCountHistory(),
        getLiveCount(),
    ]);

    return (
        <CommunityPulseClient
            globalStats={globalStats}
            periodStats={{ day: dayStats, week: weekStats, month: monthStats }}
            prevPeriodStats={{
                day: prevDayStats,
                week: prevWeekStats,
                month: prevMonthStats,
            }}
            countHistory={countHistory}
            liveCount={liveCount}
        />
    );
};
```

**Step 2: Create the client component `community-pulse-client.tsx`**

```typescript
'use client';

// Client component that handles the period toggle (Today/Week/Month)
// All data is pre-fetched on server and passed as props
// Toggle switches which periodStats/prevPeriodStats to display

// Props:
// - globalStats: GlobalStats (all-time totals)
// - periodStats: { day, week, month } — each PeriodStats
// - prevPeriodStats: { day, week, month } — each PeriodStats (for delta)
// - countHistory: LiveCountDataPoint[]
// - liveCount: number

// State: selectedPeriod: 'day' | 'week' | 'month' (default: 'day')

// Layout:
// - Period toggle buttons (top right)
// - Stats row: [Live: {liveCount} runners] [Runs: {periodStats[period].runCount}] [PBs: {periodStats[period].pbCount}]
// - Delta text: calculate % change from prevPeriodStats
// - Activity chart: LiveCountChart component (full width, compact)
// - All-time row: [Total runners] [Total runs] [Total run time]

// Format large numbers: use Intl.NumberFormat with notation: 'compact'
// Format run time: convert ms to hours, display as "X.XM hours"
```

This component is a `'use client'` component. It receives all 3 periods of data as props and uses `useState` for the selected period. No network requests on toggle.

Use the existing `LiveCountChart` from `app/(new-layout)/frontpage/panels/live-count-panel/live-count-chart.tsx`. Import it directly (it's already a client component).

**Step 3: Style the section**

Create `app/(new-layout)/frontpage/sections/community-pulse.module.scss` with styles for:
- `.pulseContainer` — full-width, rounded, background
- `.toggleGroup` — button group for period selection
- `.toggleButton`, `.toggleButtonActive` — period toggle buttons
- `.statsRow` — flexbox row for the 3 stat cards
- `.statCard` — individual stat with large number + label
- `.deltaText` — small text showing % change, green for up, red for down
- `.allTimeRow` — bottom row with smaller all-time numbers

**Step 4: Verify the section renders**

Run: `npm run dev`
Expected: Community Pulse shows below hero with toggle, stats, chart, and all-time totals.

**Step 5: Commit**

```
feat: add community pulse section with period toggle
```

---

## Task 5: Trending section (left side of row 3)

**Files:**
- Create: `app/(new-layout)/frontpage/sections/trending-and-pb-feed.tsx`
- Create: `app/(new-layout)/frontpage/sections/trending-section.tsx`

**Step 1: Create the row wrapper `trending-and-pb-feed.tsx`**

```typescript
import { Suspense } from 'react';
import { Col, Row } from 'react-bootstrap';
import { SectionSkeleton } from '../components/section-skeleton';
import { PbFeedSection } from './pb-feed-section';
import { TrendingSection } from './trending-section';

export const TrendingAndPbFeed = () => {
    return (
        <Row className="g-4">
            <Col lg={7} xs={12}>
                <Suspense fallback={<SectionSkeleton height={500} />}>
                    <TrendingSection />
                </Suspense>
            </Col>
            <Col lg={5} xs={12}>
                <Suspense fallback={<SectionSkeleton height={500} />}>
                    <PbFeedSection />
                </Suspense>
            </Col>
        </Row>
    );
};
```

**Step 2: Create `trending-section.tsx`**

Server component. Fetches:
- `getMostActiveGames('week')` — top games
- `getGameImageMap()` — game images
- `getWeeklyTopRunners(3)` — most active by playtime
- `getMostPBsRunners(3)` — most PBs set

Renders 3 stacked sub-sections inside a `Panel`:

**Hot Games** (top 5-6):
- Each row: rank number, game image (small), game name, run count badge, unique runners count
- Link to game page (`/{game}`)
- Note: The week-over-week delta requires `getMostActiveGamesPreviousWeek()`. If the backend doesn't support `previous_week`, skip the delta for now and add a TODO.

**Most Active Runners** (top 3):
- Each row: avatar (from user page, or placeholder), username, total playtime formatted
- Link to user profile (`/{username}`)
- Playtime from `WeeklyRunner.value` (this is total ms of finished runs)

**Most PBs Set** (top 3):
- Each row: avatar, username, PB count
- Link to user profile

Use the existing `Panel` component as the outer wrapper. Use `DurationToFormatted` for playtime formatting. Use `UserLink` for user links.

**Step 3: Commit**

```
feat: add trending section with hot games and active runners
```

---

## Task 6: PB Feed section (right side of row 3)

**Files:**
- Create: `app/(new-layout)/frontpage/sections/pb-feed-section.tsx`
- Create: `app/(new-layout)/frontpage/sections/pb-feed-client.tsx`

**Step 1: Create server component `pb-feed-section.tsx`**

```typescript
import { getGameImageMap, getRecentNotablePBs } from '~src/lib/highlights';
import { PbFeedClient } from './pb-feed-client';

export const PbFeedSection = async () => {
    const [pbs, gameImages] = await Promise.all([
        getRecentNotablePBs(20),
        getGameImageMap(),
    ]);

    return <PbFeedClient pbs={pbs} gameImages={gameImages} />;
};
```

**Step 2: Create client component `pb-feed-client.tsx`**

`'use client'` component displaying a vertical feed of PB cards.

Each PB entry (from `FinishedRunPB`):
- Small game image icon (from `gameImages[pb.game]`)
- Runner username (link to profile)
- Game + category text
- Time displayed with `DurationToFormatted`
- **Improvement delta**: if `pb.previousPb` exists, show `(-{previousPb - time})` formatted as duration, colored green. This is the key hook — "how much did they improve?"
- Relative timestamp using `FromNow` component with `pb.endedAt`
- Click entire card → link to `/{username}/{game}/{category}` (or construct URL)

The feed should be a scrollable container with `max-height` matching the trending section height, `overflow-y: auto`, with custom scrollbar styling.

Use existing components: `DurationToFormatted`, `DifferenceFromOne` or custom delta display, `FromNow`, `UserLink`.

**Step 3: Style the feed**

Create `app/(new-layout)/frontpage/sections/pb-feed.module.scss`:
- `.feedContainer` — max-height, overflow-y auto, custom scrollbar
- `.feedItem` — individual PB entry with hover effect
- `.improvementDelta` — green text for time improvement
- `.feedGameIcon` — small game image

**Step 4: Commit**

```
feat: add PB feed section with improvement deltas
```

---

## Task 7: Races section (left side of row 4)

**Files:**
- Create: `app/(new-layout)/frontpage/sections/races-and-your-stats.tsx`
- Create: `app/(new-layout)/frontpage/sections/races-section.tsx`

**Step 1: Create the row wrapper `races-and-your-stats.tsx`**

```typescript
import { Suspense } from 'react';
import { Col, Row } from 'react-bootstrap';
import { SectionSkeleton } from '../components/section-skeleton';
import { RacesSection } from './races-section';
import { YourStatsSection } from './your-stats-section';

export const RacesAndYourStats = () => {
    return (
        <Row className="g-4">
            <Col lg={6} xs={12}>
                <Suspense fallback={<SectionSkeleton height={400} />}>
                    <RacesSection />
                </Suspense>
            </Col>
            <Col lg={6} xs={12}>
                <Suspense fallback={<SectionSkeleton height={400} />}>
                    <YourStatsSection />
                </Suspense>
            </Col>
        </Row>
    );
};
```

**Step 2: Create `races-section.tsx`**

This is largely a simplification of the existing `race-panel.tsx`. Server component.

Fetch: `getAllActiveRaces()` and `getPaginatedFinishedRaces(1, 4)` (same as current).

Filter into `progressRaces` (status !== 'pending') and `pendingRaces` (status === 'pending', participantCount > 0).

Render inside a `Panel` with title "Races", subtitle "Race against friends":
- **In Progress** sub-section with badge count — show max 3 using existing `RaceCard` component
- **Upcoming** sub-section with badge count — show max 3 using `RaceCard`
- If not enough in-progress/upcoming, show some finished races
- "Start a Race" button (if logged in) + "View all races" link

Reuse the existing `RaceCard` component from `app/(new-layout)/frontpage/panels/race-panel/race-card.tsx` — it already handles all race states.

**Step 3: Commit**

```
feat: add races section
```

---

## Task 8: Your Stats section (right side of row 4)

**Files:**
- Create: `app/(new-layout)/frontpage/sections/your-stats-section.tsx`
- Create: `app/(new-layout)/frontpage/sections/your-stats-client.tsx`

**Step 1: Create server component `your-stats-section.tsx`**

```typescript
import { Panel } from '~app/(new-layout)/components/panel.component';
import { getSession } from '~src/actions/session.action';
import { getGameGlobal } from '~src/components/game/get-game';
import { getUserSummary } from '~src/lib/summary';
import { YourStatsClient } from './your-stats-client';
import { YourStatsSearch } from './your-stats-search';

export const YourStatsSection = async () => {
    const session = await getSession();

    if (!session?.user) {
        return (
            <Panel subtitle="Summary" title="Runner Stats" className="p-4">
                <YourStatsSearch />
            </Panel>
        );
    }

    const user = session.user;
    const [weekStats, monthStats] = await Promise.all([
        getUserSummary(user, 'week', 0),
        getUserSummary(user, 'month', 0),
    ]);

    // Pre-fetch game data for finished runs
    const allGames = new Set([
        ...(weekStats?.finishedRuns ?? []).map((r) => r.game),
        ...(monthStats?.finishedRuns ?? []).map((r) => r.game),
    ]);
    const gameDataArray = await Promise.all(
        [...allGames].map((game) => getGameGlobal(game)),
    );
    const gameDataMap = Object.fromEntries(
        [...allGames].map((game, i) => [game, gameDataArray[i]]),
    );

    return (
        <Panel
            subtitle="Summary"
            title="Your Performance"
            className="p-4"
            link={{ url: `/${user}`, text: 'View Full Stats' }}
        >
            <YourStatsClient
                weekStats={weekStats}
                monthStats={monthStats}
                gameDataMap={gameDataMap}
            />
        </Panel>
    );
};
```

**Step 2: Create client component `your-stats-client.tsx`**

`'use client'` component with Week/Month toggle.

State: `selectedPeriod: 'week' | 'month'` (default: 'week')

Displays for the selected period:
- Summary stats row: Total Playtime, Runs Completed, PBs Set (count finishedRuns where `time` is defined — those are PBs), Finished Rate (totalFinishedRuns / totalRuns)
- Recent runs list from `stats.finishedRuns` — show up to 5-6 most recent:
  - Game name (with small game image from gameDataMap)
  - Category
  - Time formatted with `DurationToFormatted`
  - If it's a PB (has `time` field), show a "PB!" badge

Format playtime using `DurationToFormatted` (it's in ms).

**Step 3: Create `your-stats-search.tsx`**

For logged-out users. A search input that lets you look up any user's stats. Can reuse patterns from the existing `StatsSearch` component in `app/(new-layout)/frontpage/panels/stats-panel/stats-search.tsx`.

**Step 4: Commit**

```
feat: add your stats section with week/month toggle
```

---

## Task 9: Patreon section

**Files:**
- Create: `app/(new-layout)/frontpage/sections/patreon-section.tsx`

**Step 1: Create `patreon-section.tsx`**

This is essentially the existing `patreon-panel.tsx` re-exported as a section. Import and render the existing `PatreonPanel` component directly:

```typescript
import PatreonPanel from '../panels/patreon-panel/patreon-panel';

export const PatreonSection = () => {
    return <PatreonPanel />;
};
```

The existing PatreonPanel already handles fetching, weighted selection, and rendering. No changes needed to its internals.

**Step 2: Commit**

```
feat: add patreon section wrapper
```

---

## Task 10: Clean up removed code

**Files:**
- Delete or deprecate: `app/(new-layout)/frontpage/components/frontpage-layout.tsx` (drag-and-drop)
- Delete or deprecate: `app/(new-layout)/frontpage/components/static-frontpage-layout.tsx`
- Delete or deprecate: `app/(new-layout)/frontpage/components/draggable-panel.tsx`
- Delete or deprecate: `app/(new-layout)/frontpage/components/hidden-panels-dropdown.tsx`
- Modify: `src/lib/frontpage-panels.ts` — remove panel registry, config merge logic
- Modify: `src/lib/frontpage-panels-metadata.ts` — remove or simplify
- Modify: `types/frontpage-config.types.ts` — remove if no longer used anywhere else
- Modify: `src/actions/frontpage-config.action.ts` — remove if no longer used anywhere else

**Step 1: Check for other usages of removed code**

Before deleting, grep for imports of:
- `FrontpageLayout` / `DraggableFrontpageLayout`
- `StaticFrontpageLayout`
- `DraggablePanel`
- `HiddenPanelsDropdown`
- `PANEL_REGISTRY`
- `mergeConfigWithDefaults`
- `getFrontpageConfig`
- `updateFrontpageConfig`
- `PanelId`, `PanelConfig`, `PanelConfigItem`

Only delete files/exports that are no longer imported anywhere.

**Step 2: Remove unused panel components if appropriate**

The old panel components (`stats-panel`, `current-user-live-panel`, `latest-pbs-panel`) are being replaced by new section components. Once all sections are working, these old panels can be removed. However, some sub-components may still be reused (e.g., `RaceCard`, `LiveCountChart`, `StatsSearch`). Be careful to only delete truly unused files.

**Step 3: Remove dnd-kit related SCSS**

Clean up `frontpage-layout.module.scss`, `draggable-panel.module.scss`, `hidden-panels-dropdown.module.scss` if the corresponding components are deleted.

**Step 4: Commit**

```
refactor: remove drag-and-drop panel system and unused components
```

---

## Task 11: Verify full page and fix issues

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: No type errors.

**Step 2: Run linter**

Run: `npm run lint`
Expected: No lint errors (or only pre-existing ones).

**Step 3: Run dev server and test**

Run: `npm run dev`

Test manually:
- `/frontpage` loads without errors
- Hero shows featured runner, Twitch embed, sidebar with 4 runners
- Clicking sidebar runners switches featured run
- Community Pulse shows stats with working period toggle
- Trending shows hot games and active runners
- PB Feed shows recent PBs with improvement deltas
- Races shows in-progress and upcoming races
- Your Stats shows weekly/monthly performance (logged in) or search (logged out)
- Patreon section renders
- Page is responsive on mobile (sections stack vertically)

**Step 4: Clear build cache and test production build**

Run: `rm -rf .next && npm run build`
Expected: Build succeeds.

**Step 5: Commit any fixes**

```
fix: resolve issues found during integration testing
```

---

## Task 12: Final cleanup

**Step 1: Update `app/(new-layout)/frontpage/TODO.md`**

Remove completed items, add any new TODOs discovered during implementation.

**Step 2: Remove build cache**

Run: `rm -rf .next`

**Step 3: Verify all changes are committed**

Run: `git status`
Expected: Clean working tree.

**Step 4: Push changes**

Push all commits to remote.
