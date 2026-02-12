# Homepage Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the homepage from a runner dashboard into a viewer-first daily destination for the speedrunning community.

**Architecture:** Six incremental phases, each a separate PR. Each phase produces a shippable page — no broken intermediate states. Phases build on each other but the page works after every merge.

**Tech Stack:** Next.js 16 (App Router, `'use cache'`), React 19, TypeScript, Bootstrap (react-bootstrap), SCSS modules, WebSocket for live data, existing `apiFetch()` helper for backend API.

**Design Document:** `docs/plans/2026-02-11-homepage-redesign-design.md`

---

## Phase Overview

```
Phase 1: Data Layer           — New API functions, no UI changes
Phase 2: Layout Restructure   — Replace panel system with main+sidebar
Phase 3: Hero Upgrade         — Pulse counters, improved run context
Phase 4: Main Column          — Highlights feed, most active games
Phase 5: Sidebar              — Live races, runner spotlights, personal stats
Phase 6: Search + Polish      — Homepage search, patron badges, cleanup
```

Each phase is a PR. Each phase's page is deployable.

---

## Phase 1: Data Layer

**Goal:** Add all new data fetching functions. Pure additions — no UI changes, no breakage.

**Branch:** `feat/homepage-data-layer`

> **API Testing (2026-02-12):** All endpoints tested and verified. Response shapes documented below.

### Task 1.1: Global Stats Fetcher

**Files:**
- Modify: `src/lib/live-runs.ts`

Add a cached function to fetch global platform stats from `/v1/runs/global-stats`.

```typescript
// Verified response shape:
// { totalRunTime: number (ms), totalAttemptCount: number, totalFinishedAttemptCount: number, totalRunners: number }
interface GlobalStats {
    totalRunTime: number;        // ms — e.g. 11,940,393,472,000 (~3.8M hours)
    totalAttemptCount: number;   // e.g. 32,081,718
    totalFinishedAttemptCount: number; // e.g. 1,367,923
    totalRunners: number;        // e.g. 6,191
}

export async function getGlobalStats(): Promise<GlobalStats> {
    'use cache';
    cacheLife('minutes');
    cacheTag('global-stats');

    return apiFetch<GlobalStats>('/v1/runs/global-stats');
}
```

Add the `GlobalStats` type to `types/`.

### Task 1.2: Today's Activity Stats Fetcher

**Files:**
- Modify: `src/lib/live-runs.ts` (or create `src/lib/stats.ts` if it gets crowded)

Fetch today's run count and PB count using the finished-runs aggregate endpoint.

```typescript
export async function getTodayStats(): Promise<{ runCount: number; pbCount: number }> {
    'use cache';
    cacheLife('seconds');
    cacheTag('today-stats');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const afterDate = today.toISOString();

    // Verified: aggregate=count returns { count: number } (NOT a bare number)
    const [runData, pbData] = await Promise.all([
        apiFetch<{ count: number }>(`/v1/finished-runs?aggregate=count&after_date=${afterDate}`),
        apiFetch<{ count: number }>(`/v1/finished-runs?aggregate=count&after_date=${afterDate}&is_pb=true`),
    ]);

    return { runCount: runData.count, pbCount: pbData.count };
}
```

**Verified response:** `{ count: 313 }` for runs, `{ count: 84 }` for PBs. Also supports `before_date` for comparison (yesterday had 425 runs).

### Task 1.3: Curated PBs Fetcher

**Files:**
- Create: `src/lib/highlights.ts`

Fetch recent PBs from popular categories — the "interesting" PBs.

```typescript
// Verified response shape per item:
interface FinishedRun {
    id: number;
    username: string;
    game: string;              // display name, e.g. "Celeste"
    category: string;          // display name, e.g. "Any%"
    time: number;              // ms
    gameTime: number | null;   // ms, nullable
    startedAt: string;         // ISO date
    endedAt: string;           // ISO date
    isPb: boolean;
    isPbGametime: boolean;
    previousPb: number | null; // ms, null if first PB ever
    previousPbGameTime: number | null;
    platform: string | null;
    emulator: boolean;
    runId: number;
    gameId: number;            // cross-ref for images via /v1/runs/games
    categoryId: number;
    personalBest: number;      // ms — the PB *before* this run (confusing name)
    sumOfBests: number;        // ms
    attemptCount: number;
    finishedAttemptCount: number;
    totalRunTime: number;      // ms — total time spent on this category
}

export async function getRecentNotablePBs(limit = 20): Promise<FinishedRun[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag('notable-pbs');

    return apiFetch<FinishedRun[]>(
        `/v1/finished-runs?top_categories=100&is_pb=true&sort=-ended_at&limit=${limit}`
    );
}
```

**Context line strategy:** Improvement delta is computable as `previousPb - time` when `previousPb !== null`. No rank data available without auth — category leaderboard endpoint (`/games/global/{game}/{category}`) requires API key. Start with improvement deltas and "first PB" detection (when `previousPb === null`).

**Game images:** Not included in this response. Need Task 1.4b (game image map) to cross-reference via `gameId`.

### Task 1.4: Most Active Games Fetcher

**Files:**
- Modify: `src/lib/highlights.ts`

```typescript
// Verified response shape — NOTE: runCount and uniqueRunners are STRINGS, not numbers
interface ActiveGame {
    game: string;          // display name
    runCount: string;      // string! e.g. "166" — must parseInt()
    uniqueRunners: string; // string! e.g. "65" — must parseInt()
}

export async function getMostActiveGames(period: 'day' | 'week' | 'month' = 'week'): Promise<ActiveGame[]> {
    'use cache';
    cacheLife('hours');
    cacheTag('active-games');

    return apiFetch<ActiveGame[]>(`/v1/runs/stats?type=most_active_games&period=${period}`);
}
```

**Verified:** Returns top 50 games. All three period values work (`day`, `week`, `month`). Week gives the best signal — 80% of entries have >1 unique runner. Some single-runner grinding entries (e.g. "OpenGOAL: Jak 1" = 1782 runs, 3 runners) — may want to sort by `uniqueRunners` in UI or filter.

**No game images in this response.** Need to cross-reference with the game image map (Task 1.4b).

### Task 1.4b: Game Image Map Fetcher

**Files:**
- Modify: `src/lib/highlights.ts`

Needed to provide game images for PB feed and active games sections.

```typescript
// Verified response shape:
interface GameWithImage {
    gameId: number;
    gameDisplay: string;
    gameImage: string;        // IGDB URL, can be empty string ""
    totalRunTime: number;
    totalAttemptCount: number;
    totalFinishedAttemptCount: number;
    uniqueRunners: number;
}

export async function getGameImageMap(): Promise<Map<string, string>> {
    'use cache';
    cacheLife('hours');
    cacheTag('game-images');

    const games = await apiFetch<GameWithImage[]>('/v1/runs/games?sort=-unique_runners&limit=200');
    const map = new Map<string, string>();
    for (const g of games) {
        if (g.gameImage && g.gameImage !== 'noimage') {
            map.set(g.gameDisplay, g.gameImage);
        }
    }
    return map;
}
```

**Verified:** Returns games with IGDB cover URLs. Some have empty string or "noimage" — filter those. This lets us show game covers in the PB feed and active games section.

### Task 1.5: Runner Spotlights Fetcher

**Files:**
- Modify: `src/lib/highlights.ts`

**IMPORTANT:** The originally-planned `/v1/runs/user-stats` endpoint only returns **all-time** data. The `period` parameter is ignored. For weekly "grinders" data, use the `finished-runs` aggregate endpoints instead.

```typescript
// Option A: Weekly grinders by run time (verified)
// Response: { username: string, value: string } — value is total ms as string
interface WeeklyRunnerByTime {
    username: string;
    value: string; // total run time in ms, as string
}

// Option B: Weekly grinders by run count (verified)
// Response: { username: string, value: string } — value is count as string
interface WeeklyRunnerByCount {
    username: string;
    value: string; // run count as string
}

// Option C: Weekly grinders by PB count (verified)
// Response: { username: string, value: string }

export async function getWeeklyTopRunners(limit = 10): Promise<WeeklyRunnerByTime[]> {
    'use cache';
    cacheLife('hours');
    cacheTag('top-runners');

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    return apiFetch<WeeklyRunnerByTime[]>(
        `/v1/finished-runs?aggregate=sum&field=time&group_by=username&after_date=${weekAgo.toISOString()}&sort=-value&limit=${limit}`
    );
}

// Alternative: most runs completed this week
export async function getMostActiveRunners(limit = 10): Promise<WeeklyRunnerByCount[]> {
    'use cache';
    cacheLife('hours');
    cacheTag('active-runners');

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    return apiFetch<WeeklyRunnerByCount[]>(
        `/v1/finished-runs?aggregate=count&group_by=username&after_date=${weekAgo.toISOString()}&sort=-value&limit=${limit}`
    );
}

// Alternative: most PBs this week
export async function getMostPBsRunners(limit = 10): Promise<WeeklyRunnerByCount[]> {
    'use cache';
    cacheLife('hours');
    cacheTag('pb-runners');

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    return apiFetch<WeeklyRunnerByCount[]>(
        `/v1/finished-runs?aggregate=count&group_by=username&after_date=${weekAgo.toISOString()}&is_pb=true&sort=-value&limit=${limit}`
    );
}
```

**Verified weekly data (2026-02-12):**
- By time: Bregermann (176h), Dvb2 (98h), Jhay (34h)
- By runs: Dvb2 (2260), akirroo1 (408), AliconSR (87)
- By PBs: akirroo1 (104), AliconSR (25), PJC_ (21)

**Limitation:** These aggregate endpoints return only `username` and `value`. No avatar, no game info. To show "primary game" or avatar, need to cross-reference with user data (e.g., `/users/global/{username}` per runner or use the live data which includes `picture`).

### Task 1.6: Verify All Endpoints — DONE

All endpoints tested 2026-02-12. Summary:

| Endpoint | Status | Response Format |
|----------|--------|----------------|
| `/v1/runs/global-stats` | OK | `{ totalRunTime, totalAttemptCount, totalFinishedAttemptCount, totalRunners }` |
| `/v1/finished-runs?aggregate=count&after_date=X` | OK | `{ count: number }` |
| `/v1/finished-runs?aggregate=count&after_date=X&is_pb=true` | OK | `{ count: number }` |
| `/v1/finished-runs?top_categories=100&is_pb=true&sort=-ended_at&limit=N` | OK | `FinishedRun[]` (see Task 1.3 for full shape) |
| `/v1/runs/stats?type=most_active_games&period=week` | OK | `{ game, runCount: string, uniqueRunners: string }[]` |
| `/v1/runs/user-stats?sort=-total_run_time&limit=N` | OK | All-time only, `period` param ignored |
| `/v1/finished-runs?aggregate=sum&field=time&group_by=username&...` | OK | `{ username, value: string }[]` |
| `/v1/finished-runs?aggregate=count&group_by=username&...` | OK | `{ username, value: string }[]` |
| `/v1/finished-runs?aggregate=count&group_by=game&...` | OK | `{ game, value: string }[]` |
| `/v1/runs/games?sort=-unique_runners&limit=N` | OK | `GameWithImage[]` with IGDB cover URLs |
| `/live?minify=true` | OK | Rich live run data with images, avatars, splits |
| `/live/count/history` | OK | `{ count, timestamp }[]` per-minute sparkline |
| Race API `/active` | OK | Full race data with live participant splits |
| Race API `/stats` | OK | Global race stats |
| `/games/global/{game}/{category}` | **NEEDS AUTH** | Requires API key — can't use for rank data without it |

### Task 1.7: Typecheck

Run `npm run typecheck` to verify all new code compiles. Commit phase 1.

---

## Phase 2: Layout Restructure

**Goal:** Replace the draggable/static panel system with fixed main+sidebar. Reposition existing content — no new components yet.

**Branch:** `feat/homepage-layout-restructure`

**Depends on:** Phase 1

### Task 2.1: Rewrite `frontpage.tsx`

**Files:**
- Modify: `app/(new-layout)/frontpage/frontpage.tsx`

Replace the entire panel system with a fixed layout:

```tsx
export default async function FrontPage() {
    return (
        <div>
            <FrontpageHero />
            {/* Search bar will go here in Phase 6 */}
            <Row className="g-4 mt-3">
                {/* Main column */}
                <Col lg={8}>
                    <Suspense fallback={<PanelSkeleton />}>
                        <LatestPbsPanel />
                    </Suspense>
                </Col>
                {/* Sidebar */}
                <Col lg={4}>
                    <div className="d-flex flex-column gap-4">
                        <Suspense fallback={<PanelSkeleton />}>
                            <RacePanel />
                        </Suspense>
                        <Suspense fallback={<PanelSkeleton />}>
                            <StatsPanel />
                        </Suspense>
                    </div>
                </Col>
            </Row>
        </div>
    );
}
```

This moves existing panels into the new layout. No new components — just repositioning. The page still works, just looks different.

Key changes:
- Remove `getFrontpageConfig()` call
- Remove `PANEL_REGISTRY` usage
- Remove `DraggableFrontpageLayout` and `StaticFrontpageLayout`
- Remove `CurrentUserLivePanel` and `PatreonPanel` from render
- Direct imports of panel components instead of registry lookup
- No authentication check for layout (same layout for everyone)

### Task 2.2: Mobile Order

On mobile (below `lg` breakpoint), Bootstrap columns stack vertically. The order should match the design doc priority. Use Bootstrap's `order-` classes if needed to ensure:
1. Main column content (PBs) first
2. Sidebar content (races, stats) second

Since `Col lg={8}` comes first in DOM, this should work by default. Verify on narrow viewport.

### Task 2.3: Remove Panel System Files

**Files to delete:**
- `app/(new-layout)/frontpage/components/frontpage-layout.tsx`
- `app/(new-layout)/frontpage/components/frontpage-layout.module.scss`
- `app/(new-layout)/frontpage/components/static-frontpage-layout.tsx`
- `app/(new-layout)/frontpage/components/draggable-panel.tsx`
- `app/(new-layout)/frontpage/components/draggable-panel.module.scss`
- `app/(new-layout)/frontpage/components/hidden-panels-dropdown.tsx`
- `app/(new-layout)/frontpage/components/hidden-panels-dropdown.module.scss`
- `app/(new-layout)/frontpage/panels/current-user-live-panel/` (entire directory)
- `app/(new-layout)/frontpage/panels/patreon-panel/` (entire directory)
- `src/lib/frontpage-panels.ts`
- `src/lib/frontpage-panels-metadata.ts`
- `src/actions/frontpage-config.action.ts`
- `types/frontpage-config.types.ts`

Check for any other imports of these files across the codebase before deleting. Some may be referenced from the old layout or other pages.

### Task 2.4: Remove Layout Switcher

**Files:**
- Delete: `app/(new-layout)/components/layout-switcher.tsx`
- Modify: `app/(new-layout)/layout.tsx` — remove LayoutSwitcher usage

### Task 2.5: Verify and Commit

- Run `npm run typecheck`
- Run `npm run lint`
- Run `npm run build` (or at least verify no import errors)
- Verify the page renders correctly in dev
- Commit phase 2

---

## Phase 3: Hero Upgrade

**Goal:** Add pulse counters with animated numbers and sparkline to the hero. Improve run context display.

**Branch:** `feat/homepage-hero-upgrade`

**Depends on:** Phase 1 (data layer), Phase 2 (layout)

### Task 3.1: Create PulseCounters Component

**Files:**
- Create: `app/(new-layout)/frontpage/components/pulse-counters.tsx`
- Create: `app/(new-layout)/frontpage/components/pulse-counters.module.scss`

Client component that displays animated counters:
- Runners live now (from live count history — latest value)
- PBs set today (from `getTodayStats()`)
- Runs completed today (from `getTodayStats()`)

Use `CountUp` animation or a simple CSS transition for the numbers ticking up. Keep it lightweight — a small `useEffect` with `requestAnimationFrame` to animate from 0 to value on mount is sufficient. No heavy animation library needed.

Include the small sparkline of live runner count history. The existing `LiveCountChart` component can be reused but needs to be made much smaller — a tiny inline chart, not a full panel.

### Task 3.2: Modify FrontpageHero to Fetch New Data

**Files:**
- Modify: `app/(new-layout)/frontpage/components/frontpage-hero.tsx`

Add `getTodayStats()` and `getGlobalStats()` to the `Promise.all` in `FrontpageHero`. Pass results to `HeroContent`.

```typescript
export const FrontpageHero = async () => {
    const [liveRuns, countHistory, todayStats, globalStats] = await Promise.all([
        getTopNLiveRuns(5),
        getLiveCountHistory(),
        getTodayStats(),
        getGlobalStats(),
    ]);

    return (
        <HeroContent
            liveRuns={liveRuns}
            countHistory={countHistory}
            todayStats={todayStats}
            globalStats={globalStats}
        />
    );
};
```

### Task 3.3: Restructure HeroContent Layout

**Files:**
- Modify: `app/(new-layout)/frontpage/components/hero-content.tsx`
- Modify: `app/(new-layout)/frontpage/components/hero-content.module.scss`

Current layout: Activity Chart (3 cols) | Stream (5 cols) | Run Stats (4 cols)

New layout: Stream (6-7 cols) | Run Context + Pulse Counters (5-6 cols)

Remove the activity chart as a full panel — it becomes a sparkline inside PulseCounters. The stream gets more space. The right side stacks: run context on top, pulse counters on bottom.

### Task 3.4: Improve Run Context Display

**Files:**
- Modify: `app/(new-layout)/frontpage/components/hero-content.tsx`

The existing `HeroRunStats` component has the right data but can be improved:
- Add split progress indicator: "Split 12/24" (use `run.currentSplitIndex` and `run.splits.length`)
- Add best possible time: `run.bestPossible`
- Add current prediction: `run.currentPrediction`
- Add "Streaming" badge if `run.currentlyStreaming`
- Consider showing viewer context if available

### Task 3.5: Runner Switcher Tabs

**Files:**
- Modify: `app/(new-layout)/frontpage/components/hero-content.tsx`

Currently: just a "Watch next run" button that cycles through runs.

New: Show all 5 runs as clickable tabs/thumbnails below or beside the stream. Active run highlighted. The existing arrow-key shortcut and "Watch next run" button stay, but now users can also click directly on any run.

Each tab: runner name + game name (compact). Active tab visually distinct.

### Task 3.6: Verify and Commit

- `npm run typecheck && npm run lint`
- Verify hero renders with pulse counters in dev
- Test run switching still works
- Verify mobile layout stacks correctly
- Commit phase 3

---

## Phase 4: Main Column Content

**Goal:** Replace the basic latest-PBs panel with the curated highlights feed and add the most active games section.

**Branch:** `feat/homepage-main-column`

**Depends on:** Phase 1 (data layer), Phase 2 (layout)

### Task 4.1: Create HighlightsFeed Component

**Files:**
- Create: `app/(new-layout)/frontpage/components/highlights-feed.tsx`
- Create: `app/(new-layout)/frontpage/components/highlights-feed.module.scss`

Server component that fetches and displays curated PBs.

```typescript
export async function HighlightsFeed() {
    const pbs = await getRecentNotablePBs(20);
    // Also fetch game data and user data for display
    return <HighlightsFeedView pbs={pbs} />;
}
```

Each PB card:
- Game image (left, use `getGameImageMap()` to look up by `game` display name — reuse `CardWithImage` pattern)
- Runner name (link to profile)
- Game + category
- Time (formatted with `DurationToFormatted`)
- Relative timestamp ("12 min ago" — use existing date utilities)
- **Context line** (verified available data):
  - When `previousPb !== null`: show "Improved by Xs" (compute `previousPb - time`, format as duration)
  - When `previousPb === null`: show "First recorded time" or "New PB"
  - Rank data NOT available (category leaderboard endpoint needs auth) — skip "New #3 all-time" for now
  - Can also show attempt context: "after N attempts" using `attemptCount`

Wrap in the existing `Panel` component (`app/(new-layout)/components/panel.component.tsx`) with title "Recent Highlights" or "Notable PBs".

### Task 4.2: Create MostActiveGames Component

**Files:**
- Create: `app/(new-layout)/frontpage/components/most-active-games.tsx`
- Create: `app/(new-layout)/frontpage/components/most-active-games.module.scss`

Server component.

```typescript
export async function MostActiveGames() {
    const games = await getMostActiveGames('week');
    return <MostActiveGamesView games={games} />;
}
```

Compact cards or rows. Each game:
- Game image (use `getGameImageMap()` to look up by `game` display name)
- Game name (link to game page)
- Runner count this week (`parseInt(game.uniqueRunners)` — values are strings)
- Run count this week (`parseInt(game.runCount)` — values are strings)
- Consider filtering to games with >1 unique runner to avoid single-grinder noise

Wrap in `Panel` component with title "Trending This Week" and "View All" link to `/games`.

### Task 4.3: Wire into frontpage.tsx

**Files:**
- Modify: `app/(new-layout)/frontpage/frontpage.tsx`

Replace `LatestPbsPanel` in the main column with:

```tsx
<Col lg={8}>
    <div className="d-flex flex-column gap-4">
        <Suspense fallback={<PanelSkeleton />}>
            <HighlightsFeed />
        </Suspense>
        <Suspense fallback={<PanelSkeleton />}>
            <MostActiveGames />
        </Suspense>
    </div>
</Col>
```

### Task 4.4: Delete Old Latest PBs Panel

**Files to delete (if no longer used anywhere):**
- `app/(new-layout)/frontpage/panels/latest-pbs-panel/` (entire directory)

Check for imports first.

### Task 4.5: Verify and Commit

- `npm run typecheck && npm run lint`
- Verify both sections render with real data
- Check mobile layout
- Commit phase 4

---

## Phase 5: Sidebar Content

**Goal:** Rework races for sidebar, add runner spotlights, add compact personal stats.

**Branch:** `feat/homepage-sidebar`

**Depends on:** Phase 1 (data layer), Phase 2 (layout)

### Task 5.1: Rework Race Panel for Sidebar

**Files:**
- Modify: `app/(new-layout)/frontpage/panels/race-panel/race-panel.tsx`
- Modify: `app/(new-layout)/frontpage/panels/race-panel/race-panel.module.scss`

The race panel exists but needs to be adapted for a narrower sidebar:
- Make it more compact
- Add mini-leaderboard for in-progress races: top 3 runners with current split and delta
- **Verified:** `getAllActiveRaces()` returns full participant data with `liveData` including `currentSplitIndex`, `totalSplits`, `delta`, `currentTime`, `currentPrediction`, `streaming` — everything needed for mini-leaderboards
- Each race also has `displayGame`, `displayCategory`, `gameImage`, `status` ("progress"/"starting"/etc.), `participantCount`, `startTime`
- Upcoming races: show "Starting in X min" with participant count
- Link to `/races`

The existing `race-panel.tsx` and `race-card.tsx` are a starting point. Refine for sidebar width.

### Task 5.2: Create RunnerSpotlights Component

**Files:**
- Create: `app/(new-layout)/frontpage/components/runner-spotlights.tsx`
- Create: `app/(new-layout)/frontpage/components/runner-spotlights.module.scss`

Server component. Uses the weekly aggregate endpoints from Task 1.5 (NOT the all-time `user-stats` endpoint).

```typescript
export async function RunnerSpotlights() {
    const [byTime, byPBs] = await Promise.all([
        getWeeklyTopRunners(5),
        getMostPBsRunners(5),
    ]);
    return <RunnerSpotlightsView topByTime={byTime} topByPBs={byPBs} />;
}
```

**Data limitation:** The aggregate endpoints only return `{ username, value }`. No avatar, no primary game. Options:
- Fetch `/users/global/{username}` for each runner (5 parallel requests) — gives full profile data
- Check if live data (`/live?minify=true`) includes any of these runners — has `picture` (avatar) and `game`
- Keep it simple: show username + hours/PBs, link to profile, skip avatar for now

Compact cards in sidebar width:
- Runner name (link to profile)
- Hours this week / PBs this week (from aggregate value, parse with `parseInt()`)
- Consider two mini-sections: "Most Dedicated" (by time) and "Most PBs" (by count)
- Patron badge if applicable (prepare for Phase 6)

Wrap in `Panel` with title "Dedicated Runners" or "Top Grinders".

### Task 5.3: Create CompactPersonalStats Component

**Files:**
- Create: `app/(new-layout)/frontpage/components/compact-personal-stats.tsx`
- Create: `app/(new-layout)/frontpage/components/compact-personal-stats.module.scss`

Mixed server/client component. Only renders for logged-in users.

```typescript
export async function CompactPersonalStats() {
    const session = await getSession();
    if (!session?.username) return null;

    const summary = await getUserSummary(session.username, 'week', 0);
    return <CompactPersonalStatsView summary={summary} username={session.username} />;
}
```

Shows:
- Runs this week
- Last PB (date + game)
- "View your profile →" link to `/{username}`

Small, sidebar-width card. Not the full chart/graph experience.

### Task 5.4: Wire Sidebar in frontpage.tsx

**Files:**
- Modify: `app/(new-layout)/frontpage/frontpage.tsx`

```tsx
<Col lg={4}>
    <div className="d-flex flex-column gap-4">
        <Suspense fallback={<PanelSkeleton />}>
            <RacePanel />
        </Suspense>
        <Suspense fallback={<PanelSkeleton />}>
            <RunnerSpotlights />
        </Suspense>
        <Suspense fallback={<PanelSkeleton />}>
            <CompactPersonalStats />
        </Suspense>
    </div>
</Col>
```

### Task 5.5: Delete Old Stats Panel

**Files to consider deleting:**
- `app/(new-layout)/frontpage/panels/stats-panel/` (entire directory)

Only delete if the full stats panel is fully replaced by `CompactPersonalStats`. If we want to keep the full stats experience somewhere (like a `/dashboard` page), we could move it rather than delete it. Decision: check with user.

### Task 5.6: Mobile Ordering

On mobile, sidebar content stacks below main content. But per the design doc, live races should appear ABOVE the highlights feed on mobile because they're time-sensitive.

Use Bootstrap `order-` classes:
```tsx
<Col lg={4} className="order-first order-lg-last">
    {/* Races only — shown first on mobile */}
    <Suspense fallback={<PanelSkeleton />}>
        <RacePanel />
    </Suspense>
</Col>
<Col lg={8}>
    {/* Main content */}
</Col>
<Col lg={4} className="order-last">
    {/* Rest of sidebar — shown after main on mobile */}
    <RunnerSpotlights />
    <CompactPersonalStats />
</Col>
```

This may require splitting the sidebar into two `Col` elements — one for races (promoted on mobile) and one for the rest. Think through the cleanest approach.

### Task 5.7: Verify and Commit

- `npm run typecheck && npm run lint`
- Verify all three sidebar sections render
- Test mobile ordering — races should appear before PB feed
- Commit phase 5

---

## Phase 6: Search + Polish

**Goal:** Add homepage search bar, patron badges on usernames, remove remaining old code.

**Branch:** `feat/homepage-search-polish`

**Depends on:** All previous phases

### Task 6.1: Homepage Search Bar

**Files:**
- Create: `app/(new-layout)/frontpage/components/homepage-search.tsx`
- Create: `app/(new-layout)/frontpage/components/homepage-search.module.scss`

Reuse existing search infrastructure. The app has:
- `src/components/search/global-search.component.tsx` — full search with results panel
- `src/components/search/search-input.component.tsx` — input component
- `src/components/search/use-fuzzy-search.tsx` — fuzzy search hook via `/api/search`

Create a homepage-specific wrapper that:
- Centers the search bar, full width with max-width constraint
- Uses the existing `useFuzzySearch` hook or `GlobalSearch` component
- Shows results in a dropdown panel
- Placeholder: "Search for a game, runner, or category..."

Wire into `frontpage.tsx` between hero and main content:

```tsx
<FrontpageHero />
<div className="my-4">
    <HomepageSearch />
</div>
<Row className="g-4">
    ...
</Row>
```

### Task 6.2: Patron Badge Component

**Files:**
- Create: `src/components/patreon/patron-badge.tsx`

A small inline badge component for use next to usernames:
- Uses existing patron data/styles from `src/components/patreon/patreon-styles.ts`
- Small, inline — a colored dot, icon, or text badge indicating patron tier
- Designed to sit next to a username in any context (feed items, spotlights, hero)

```tsx
export function PatronBadge({ tier }: { tier: number }) {
    // Render small badge based on tier
}
```

### Task 6.3: Integrate Patron Badges

**Files to modify:**
- `app/(new-layout)/frontpage/components/highlights-feed.tsx` — badge next to runner names
- `app/(new-layout)/frontpage/components/runner-spotlights.tsx` — badge next to runner names
- `app/(new-layout)/frontpage/components/hero-content.tsx` — badge next to featured runner name

This requires knowing which users are patrons. Options:
- Fetch patron list server-side and cross-reference
- Include patron status in the API response (check if user data includes patron info)
- Use the existing `usePatreons()` SWR hook in client components

Choose the approach that minimizes API calls. If user data from the endpoints already includes patron info, use that. Otherwise, fetch the patron list once and cross-reference.

### Task 6.4: Final Cleanup

**Files to delete (verify no remaining imports first):**
- `app/(new-layout)/frontpage/panels/live-count-panel/` — if sparkline is now inline in pulse counters
- `app/(new-layout)/frontpage/panels/live-runs-panel/` — if not used elsewhere
- Any remaining unused panel files
- Any unused types from `types/frontpage-config.types.ts` (should already be deleted in Phase 2)

**Check for dead imports:**
```bash
npm run typecheck
npm run lint
```

### Task 6.5: Full Verification

- `rm -rf .next && npm run build` — clean build
- `npm run typecheck && npm run lint`
- Manual verification:
  - Hero: stream plays, run context shows, pulse counters animate, runner switching works
  - Search: type a game name, see results, click through
  - Main column: PB feed shows curated entries, active games section populated
  - Sidebar: races show with live data, runner spotlights populated, personal stats show for logged-in user
  - Mobile: correct stacking order, races above feed
  - Unauthenticated: everything works except personal stats (hidden)
  - Patron badges appear on patron usernames

### Task 6.6: Commit and PR

Commit phase 6. Create PR targeting main.

---

## Phase Dependencies

```
Phase 1 (Data Layer)
  ├── Phase 2 (Layout) ─── depends on Phase 1
  │     ├── Phase 3 (Hero) ─── depends on Phase 1 + 2
  │     ├── Phase 4 (Main Column) ─── depends on Phase 1 + 2
  │     └── Phase 5 (Sidebar) ─── depends on Phase 1 + 2
  └── Phase 6 (Search + Polish) ─── depends on all above
```

Phases 3, 4, and 5 can be developed in parallel after Phase 2 is merged. Phase 6 is the final polish pass.

## Execution Strategy

Each phase is one PR. Merge sequentially. The page works after every merge:
- After Phase 1: no visible change (data functions only)
- After Phase 2: new layout with existing content repositioned
- After Phase 3: impressive hero with pulse counters
- After Phase 4: curated highlights feed in main column
- After Phase 5: full sidebar with races, spotlights, personal stats
- After Phase 6: search bar, patron badges, fully polished
