# Your Performance Panel Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the flat stats panel with a "Highlight Reel" powered by a dedicated backend endpoint, showing personalized hero highlights, period stats with deltas, top games with cover art, and a unified PB + race activity feed.

**Architecture:** New backend handler in `query-runs.ts` that queries `activity_daily`, `finished_runs`, `user_game_stats`, and `users` to build a single dashboard response. Frontend fetches from this endpoint via a new `src/lib/user-dashboard.ts`, renders in a rewritten `your-stats-client.tsx` with hero highlight, stat ribbon, top game card, and activity feed.

**Tech Stack:** Drizzle ORM (backend queries), Next.js 16 `'use cache'`, SCSS modules, `apiFetch` helper, existing `DurationToFormatted`/`FromNow` components.

---

## Task 1: Backend — Dashboard endpoint handler

**Files:**
- Modify: `/home/joey/therun/therun/src/query/query-runs.ts` (add route + handler)
- Modify: `/home/joey/therun/therun/src/db/schema.ts` (import only — no schema changes)

This is the core backend work. One new handler function that computes the entire dashboard response.

**Step 1: Add the route to the handler router**

In `query-runs.ts`, add a new route check **before** the existing `/v1/users/recent` check (since `/v1/users/{username}/dashboard` is more specific):

```typescript
// In the handler function, before the "/v1/users/recent" check:
if (path.match(/^\/v1\/users\/[^/]+\/dashboard/)) {
    return await handleUserDashboard(event);
}
```

**Step 2: Add the imports needed**

Add `activityDaily` and `userGameStats` to the schema imports at the top of the file:

```typescript
import {
    speedrunRuns,
    finishedRuns,
    games,
    categories,
    gameStats,
    categoryStats,
    globalStats,
    userStats,
    users,
    activityDaily,
    userGameStats,
} from "../db/schema";
```

**Step 3: Write the handleUserDashboard function**

Add this function in the endpoint handlers section of `query-runs.ts`:

```typescript
async function handleUserDashboard(
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyStructuredResultV2> {
    const path = event.path;
    const usernameMatch = path.match(/^\/v1\/users\/([^/]+)\/dashboard/);
    if (!usernameMatch) return badRequest("Missing username in path");
    const username = decodeURIComponent(usernameMatch[1]);

    const params = event.queryStringParameters || {};
    const period = (params.period || "7d") as "7d" | "30d" | "year";

    const db = await getDb();

    // Resolve user ID from username
    const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.username}) = lower(${username})`)
        .limit(1);
    if (!user) return badRequest("User not found");
    const userId = user.id;

    // Compute date ranges
    const now = new Date();
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD

    let fromDate: string;
    let prevFromDate: string;
    let prevToDate: string;

    if (period === "year") {
        fromDate = `${now.getFullYear()}-01-01`;
        prevFromDate = `${now.getFullYear() - 1}-01-01`;
        prevToDate = `${now.getFullYear() - 1}-12-31`;
    } else {
        const days = period === "30d" ? 30 : 7;
        const from = new Date(now);
        from.setDate(from.getDate() - (days - 1));
        fromDate = from.toISOString().slice(0, 10);

        const prevTo = new Date(from);
        prevTo.setDate(prevTo.getDate() - 1);
        prevToDate = prevTo.toISOString().slice(0, 10);

        const prevFrom = new Date(prevTo);
        prevFrom.setDate(prevFrom.getDate() - (days - 1));
        prevFromDate = prevFrom.toISOString().slice(0, 10);
    }

    // Run all queries in parallel
    const [
        currentStats,
        previousStats,
        topGames,
        allTimeTopGames,
        recentPbs,
        activityDates,
    ] = await Promise.all([
        // Current period aggregate stats
        db.execute(sql`
            SELECT
                COALESCE(SUM(playtime_delta), 0)::bigint AS "playtime",
                COALESCE(SUM(attempt_count_delta), 0)::bigint AS "totalRuns",
                COALESCE(SUM(finished_attempt_count_delta), 0)::bigint AS "finishedRuns",
                COALESCE(SUM(pb_count), 0)::bigint AS "totalPbs",
                COALESCE(SUM(pb_with_previous_count), 0)::bigint AS "pbsWithPrevious"
            FROM activity_daily
            WHERE user_id = ${userId}
              AND date >= ${fromDate} AND date <= ${today}
        `),
        // Previous period aggregate stats
        db.execute(sql`
            SELECT
                COALESCE(SUM(playtime_delta), 0)::bigint AS "playtime",
                COALESCE(SUM(attempt_count_delta), 0)::bigint AS "totalRuns",
                COALESCE(SUM(finished_attempt_count_delta), 0)::bigint AS "finishedRuns",
                COALESCE(SUM(pb_count), 0)::bigint AS "totalPbs",
                COALESCE(SUM(pb_with_previous_count), 0)::bigint AS "pbsWithPrevious"
            FROM activity_daily
            WHERE user_id = ${userId}
              AND date >= ${prevFromDate} AND date <= ${prevToDate}
        `),
        // Top games this period
        db.execute(sql`
            SELECT
                a.game_id AS "gameId",
                g.display AS "gameDisplay",
                g.image AS "gameImage",
                SUM(a.playtime_delta)::bigint AS "totalPlaytime",
                SUM(a.attempt_count_delta)::bigint AS "totalAttempts",
                SUM(a.finished_attempt_count_delta)::bigint AS "totalFinishedAttempts",
                SUM(a.pb_count)::bigint AS "totalPbs"
            FROM activity_daily a
            JOIN games_pg g ON g.id = a.game_id
            WHERE a.user_id = ${userId}
              AND a.date >= ${fromDate} AND a.date <= ${today}
            GROUP BY a.game_id, g.display, g.image
            ORDER BY SUM(a.playtime_delta) DESC
            LIMIT 3
        `),
        // All-time top 3 games
        db.execute(sql`
            SELECT
                game_display AS "gameDisplay",
                game_image AS "gameImage",
                total_run_time AS "totalRunTime"
            FROM user_game_stats
            WHERE username = ${username}
            ORDER BY total_run_time DESC
            LIMIT 3
        `),
        // Recent PBs this period
        db.execute(sql`
            SELECT
                g.display AS "game",
                c.display AS "category",
                g.image AS "gameImage",
                f.time,
                f."previousPb" AS "previousPb",
                f."endedAt" AS "endedAt"
            FROM finished_runs f
            JOIN games_pg g ON g.id = f."gameId"
            JOIN categories c ON c.id = f."categoryId"
            WHERE f.user_id = ${userId}
              AND f."isPb" = true
              AND f."endedAt" >= ${fromDate}::date
              AND f."endedAt" <= (${today}::date + interval '1 day')
            ORDER BY f."endedAt" DESC
            LIMIT 5
        `),
        // Activity dates for streak calculation
        db.execute(sql`
            SELECT DISTINCT date
            FROM activity_daily
            WHERE user_id = ${userId}
              AND date >= ${fromDate} AND date <= ${today}
            ORDER BY date DESC
        `),
    ]);

    // Parse results
    const stats = currentStats.rows[0] as any || {
        playtime: 0, totalRuns: 0, finishedRuns: 0, totalPbs: 0, pbsWithPrevious: 0,
    };
    const prevStats = previousStats.rows[0] as any || {
        playtime: 0, totalRuns: 0, finishedRuns: 0, totalPbs: 0, pbsWithPrevious: 0,
    };

    // Compute streak from activity dates
    const dates = (activityDates.rows as any[]).map((r) => r.date);
    const streak = computeStreak(dates, today);

    // Deduplicate all-time top games (may overlap with user_game_stats rows for same game)
    const allTimeGamesRaw = (allTimeTopGames.rows as any[]);
    const seenGames = new Set<string>();
    const dedupedAllTime = allTimeGamesRaw.filter((g) => {
        const key = g.gameDisplay;
        if (seenGames.has(key)) return false;
        seenGames.add(key);
        return true;
    }).slice(0, 3);

    // Compute highlight
    const pbsList = recentPbs.rows as any[];
    const topGamesList = topGames.rows as any[];
    const highlight = computeHighlight(pbsList, topGamesList, streak);

    return success({
        period,
        stats: {
            playtime: Number(stats.playtime),
            totalRuns: Number(stats.totalRuns),
            finishedRuns: Number(stats.finishedRuns),
            totalPbs: Number(stats.totalPbs),
            pbsWithPrevious: Number(stats.pbsWithPrevious),
        },
        previousStats: {
            playtime: Number(prevStats.playtime),
            totalRuns: Number(prevStats.totalRuns),
            finishedRuns: Number(prevStats.finishedRuns),
            totalPbs: Number(prevStats.totalPbs),
            pbsWithPrevious: Number(prevStats.pbsWithPrevious),
        },
        streak,
        topGames: topGamesList.map((g: any) => ({
            gameId: g.gameId,
            gameDisplay: g.gameDisplay,
            gameImage: g.gameImage,
            totalPlaytime: Number(g.totalPlaytime),
            totalAttempts: Number(g.totalAttempts),
            totalFinishedAttempts: Number(g.totalFinishedAttempts),
            totalPbs: Number(g.totalPbs),
        })),
        allTimeTopGames: dedupedAllTime.map((g: any) => ({
            gameDisplay: g.gameDisplay,
            gameImage: g.gameImage,
            totalRunTime: Number(g.totalRunTime),
        })),
        recentPbs: pbsList.map((pb: any) => ({
            game: pb.game,
            category: pb.category,
            gameImage: pb.gameImage,
            time: Number(pb.time),
            previousPb: pb.previousPb ? Number(pb.previousPb) : null,
            endedAt: pb.endedAt,
        })),
        recentRaces: [], // Populated from UserSummary on frontend side for now
        highlight,
    });
}

function computeStreak(
    dates: string[],
    today: string,
): { current: number; longest: number; longestStart: string; longestEnd: string } | null {
    if (dates.length === 0) return null;

    // Dates are sorted DESC from query
    const sortedAsc = [...dates].sort();

    // Compute longest streak
    let longest = 1;
    let longestStart = sortedAsc[0];
    let longestEnd = sortedAsc[0];
    let currentLen = 1;
    let currentStart = sortedAsc[0];

    for (let i = 1; i < sortedAsc.length; i++) {
        const prev = new Date(sortedAsc[i - 1]);
        const curr = new Date(sortedAsc[i]);
        const diffDays = (curr.getTime() - prev.getTime()) / 86400000;

        if (diffDays === 1) {
            currentLen++;
            if (currentLen > longest) {
                longest = currentLen;
                longestStart = currentStart;
                longestEnd = sortedAsc[i];
            }
        } else {
            currentLen = 1;
            currentStart = sortedAsc[i];
        }
    }

    // Compute current streak (consecutive days ending today or yesterday)
    const todayDate = new Date(today);
    const lastDate = new Date(sortedAsc[sortedAsc.length - 1]);
    const daysSinceLast = (todayDate.getTime() - lastDate.getTime()) / 86400000;

    let current = 0;
    if (daysSinceLast <= 1) {
        current = 1;
        for (let i = sortedAsc.length - 2; i >= 0; i--) {
            const d = new Date(sortedAsc[i]);
            const next = new Date(sortedAsc[i + 1]);
            if ((next.getTime() - d.getTime()) / 86400000 === 1) {
                current++;
            } else {
                break;
            }
        }
    }

    return { current, longest, longestStart: longestStart, longestEnd: longestEnd };
}

function computeHighlight(
    pbs: any[],
    topGames: any[],
    streak: { current: number; longest: number } | null,
): { type: string; game?: string; category?: string; gameImage?: string; value?: number; secondaryValue?: number; label: string } | null {
    // Priority 1: Biggest PB improvement %
    let bestImprovement: any = null;
    let bestImprovementPct = 0;
    for (const pb of pbs) {
        if (pb.previousPb && Number(pb.previousPb) > 0) {
            const pct = ((Number(pb.previousPb) - Number(pb.time)) / Number(pb.previousPb)) * 100;
            if (pct > bestImprovementPct) {
                bestImprovementPct = pct;
                bestImprovement = pb;
            }
        }
    }
    if (bestImprovement && bestImprovementPct >= 0.5) {
        return {
            type: "pb_improvement",
            game: bestImprovement.game,
            category: bestImprovement.category,
            gameImage: bestImprovement.gameImage,
            value: Math.round(bestImprovementPct * 10) / 10,
            secondaryValue: Number(bestImprovement.time),
            label: `${(bestImprovementPct).toFixed(1)}% PB improvement`,
        };
    }

    // Priority 2: Streak >= 5 days
    if (streak && streak.current >= 5) {
        return {
            type: "streak",
            value: streak.current,
            label: `${streak.current}-day streak`,
        };
    }

    // Priority 3: Any new PB
    if (pbs.length > 0) {
        const best = pbs[0]; // most recent
        return {
            type: "new_pb",
            game: best.game,
            category: best.category,
            gameImage: best.gameImage,
            secondaryValue: Number(best.time),
            label: `New PB in ${best.game}`,
        };
    }

    // Priority 4: Most played game
    if (topGames.length > 0) {
        const top = topGames[0];
        const hours = Math.round(Number(top.totalPlaytime) / 3600000 * 10) / 10;
        return {
            type: "most_played",
            game: top.gameDisplay,
            gameImage: top.gameImage,
            value: hours,
            label: `${hours}h in ${top.gameDisplay}`,
        };
    }

    return null;
}
```

**Step 4: Test the endpoint manually**

After deploying, test with:
```
GET /v1/users/{username}/dashboard?period=7d
GET /v1/users/{username}/dashboard?period=30d
GET /v1/users/{username}/dashboard?period=year
```

**Step 5: Commit**

```bash
git add src/query/query-runs.ts
git commit -m "feat: add /v1/users/{username}/dashboard endpoint for performance panel"
```

---

## Task 2: Frontend — Dashboard data fetching function

**Files:**
- Create: `/home/joey/therun/therun-fr/src/lib/user-dashboard.ts`
- Create: `/home/joey/therun/therun-fr/src/types/dashboard.types.ts`

**Step 1: Create the TypeScript types**

```typescript
// src/types/dashboard.types.ts

export type DashboardPeriod = '7d' | '30d' | 'year';

export interface DashboardStats {
    playtime: number;
    totalRuns: number;
    finishedRuns: number;
    totalPbs: number;
    pbsWithPrevious: number;
}

export interface DashboardStreak {
    current: number;
    longest: number;
    longestStart: string;
    longestEnd: string;
}

export interface DashboardTopGame {
    gameId: number;
    gameDisplay: string;
    gameImage: string | null;
    totalPlaytime: number;
    totalAttempts: number;
    totalFinishedAttempts: number;
    totalPbs: number;
}

export interface DashboardAllTimeGame {
    gameDisplay: string;
    gameImage: string | null;
    totalRunTime: number;
}

export interface DashboardPb {
    game: string;
    category: string;
    gameImage: string | null;
    time: number;
    previousPb: number | null;
    endedAt: string;
}

export interface DashboardRace {
    game: string;
    category: string;
    position: number;
    ratingBefore: number;
    ratingAfter: number;
    date: number;
}

export interface DashboardHighlight {
    type: 'pb_improvement' | 'race_win' | 'race_placement' | 'streak' | 'new_pb' | 'most_played';
    game?: string;
    category?: string;
    gameImage?: string;
    value?: number;
    secondaryValue?: number;
    label: string;
}

export interface DashboardResponse {
    period: DashboardPeriod;
    stats: DashboardStats;
    previousStats: DashboardStats;
    streak: DashboardStreak | null;
    topGames: DashboardTopGame[];
    allTimeTopGames: DashboardAllTimeGame[];
    recentPbs: DashboardPb[];
    recentRaces: DashboardRace[];
    highlight: DashboardHighlight | null;
}
```

**Step 2: Create the data fetching function**

```typescript
// src/lib/user-dashboard.ts
'use server';

import { cacheLife, cacheTag } from 'next/cache';
import { apiFetch } from './api-client';
import type { DashboardPeriod, DashboardResponse } from '~src/types/dashboard.types';

export async function getUserDashboard(
    username: string,
    period: DashboardPeriod = '7d',
): Promise<DashboardResponse | null> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`user-dashboard-${username}`);

    try {
        return await apiFetch<DashboardResponse>(
            `/v1/users/${encodeURIComponent(username)}/dashboard?period=${period}`,
        );
    } catch {
        return null;
    }
}
```

**Step 3: Commit**

```bash
git add src/types/dashboard.types.ts src/lib/user-dashboard.ts
git commit -m "feat: add dashboard types and data fetching for performance panel"
```

---

## Task 3: Frontend — Rewrite server component (your-stats-section.tsx)

**Files:**
- Modify: `/home/joey/therun/therun-fr/app/(new-layout)/frontpage/sections/your-stats-section.tsx`

Replace the current implementation that fetches `getUserSummary` with one that fetches all three period dashboards upfront, plus injects race data from `UserSummary`.

**Step 1: Rewrite the server component**

```typescript
// your-stats-section.tsx
import { Panel } from '~app/(new-layout)/components/panel.component';
import { getSession } from '~src/actions/session.action';
import { getUserDashboard } from '~src/lib/user-dashboard';
import { getUserSummary } from '~src/lib/summary';
import { YourStatsClient } from './your-stats-client';
import { YourStatsSearch } from './your-stats-search';
import type { DashboardResponse, DashboardRace } from '~src/types/dashboard.types';

export const YourStatsSection = async () => {
    const session = await getSession();

    if (!session?.user) {
        return (
            <Panel
                panelId="your-stats"
                subtitle="Summary"
                title="Runner Stats"
                className="p-4"
            >
                <p className="text-secondary mb-3">
                    Look up any runner&apos;s weekly stats
                </p>
                <YourStatsSearch />
            </Panel>
        );
    }

    const user = session.user;

    // Fetch all three periods + weekly summary (for race data) in parallel
    const [dashboard7d, dashboard30d, dashboardYear, weekSummary] =
        await Promise.all([
            getUserDashboard(user, '7d'),
            getUserDashboard(user, '30d'),
            getUserDashboard(user, 'year'),
            getUserSummary(user, 'week', 0),
        ]);

    // Inject race data from UserSummary into dashboard responses
    const raceData: DashboardRace[] = (weekSummary?.races ?? []).map((r) => ({
        game: r.game,
        category: r.category,
        position: r.position,
        ratingBefore: r.ratingPrevious,
        ratingAfter: r.ratingNew,
        date: r.date,
    }));

    const dashboards: Record<string, DashboardResponse | null> = {
        '7d': dashboard7d ? { ...dashboard7d, recentRaces: raceData } : null,
        '30d': dashboard30d,
        year: dashboardYear,
    };

    return (
        <Panel
            panelId="your-stats"
            subtitle="Summary"
            title="Your Performance"
            className="p-0 overflow-hidden"
            link={{ url: `/${user}`, text: 'View Full Stats' }}
        >
            <YourStatsClient dashboards={dashboards} username={user} />
        </Panel>
    );
};
```

**Step 2: Commit**

```bash
git add app/\(new-layout\)/frontpage/sections/your-stats-section.tsx
git commit -m "feat: rewrite your-stats server component to use dashboard endpoint"
```

---

## Task 4: Frontend — Rewrite client component (your-stats-client.tsx)

**Files:**
- Modify: `/home/joey/therun/therun-fr/app/(new-layout)/frontpage/sections/your-stats-client.tsx`

This is the largest task. Complete rewrite of the client component with: hero highlight, period toggle, stat ribbon with deltas, top game card, all-time favorites, and recent activity feed.

**Step 1: Write the full client component**

Replace the entire file. The component should include:

1. **State:** `selectedPeriod` ('7d' | '30d' | 'year'), default '7d'
2. **Hero Highlight:** Top card with visual treatment based on `highlight.type`
3. **Period Toggle:** Three-option pill toggle
4. **Stat Ribbon:** Horizontal 4-stat bar with delta indicators
5. **Top Game Card:** #1 game this period with cover art
6. **All-Time Chips:** 2-3 small chips for all-time top games
7. **Recent Activity Feed:** Mixed PBs + races sorted by date

Key implementation notes:
- Use `DurationToFormatted` for time display (already imported in current file)
- Use `FromNow` for relative timestamps
- Use `Image` from next/image for game art (3:4 ratio: 36×48, 15×20 etc.)
- Game images with value `'noimage'` or empty string should show placeholder
- Delta calculation: `(current - previous) / previous * 100`, show `↑`/`↓` with percentage
- For streak display in stat ribbon, no delta — just the number
- Animate stat values on period switch using the same `useCountUp` pattern from `community-pulse-client.tsx`

The component interface:
```typescript
interface YourStatsClientProps {
    dashboards: Record<string, DashboardResponse | null>;
    username: string;
}
```

When the selected dashboard is null (no data), fall back to showing the most recent non-null dashboard with a "from last period" label, or show an empty state encouraging the user to start running.

**Step 2: Commit**

```bash
git add app/\(new-layout\)/frontpage/sections/your-stats-client.tsx
git commit -m "feat: rewrite your-stats client with highlight reel layout"
```

---

## Task 5: Frontend — Rewrite SCSS module (your-stats.module.scss)

**Files:**
- Modify: `/home/joey/therun/therun-fr/app/(new-layout)/frontpage/sections/your-stats.module.scss`

Complete rewrite matching the new component structure. Key sections:

1. **Hero highlight card** — gradient overlay on game art background, different accent colors per type:
   - `pb_improvement`: green accent (`#66bb6a`)
   - `race_win`: gold accent (`#f59e0b`)
   - `streak`: amber accent (`#f59e0b`)
   - `new_pb`: green accent
   - `most_played`: primary color accent
2. **Period toggle** — keep existing style (it's good), just add the third button
3. **Stat ribbon** — horizontal flex, 4 equal cells with dividers
4. **Top game card** — flex row with game art left, stats right
5. **All-time chips** — small inline-flex badges
6. **Activity feed** — compact list items, PB and race variants
7. **Delta indicators** — `.deltaUp` (green), `.deltaDown` (muted red), `.deltaNeutral` (gray)

Visual reference: match the quality of `community-pulse.module.scss` — use the same `$mono` font variable, similar cell/divider pattern, same hover transitions.

Keep the existing search-related styles (`.searchContainer`, `.searchInput`, etc.) intact — they're used by the logged-out state.

**Step 1: Write the full SCSS module**

Key style tokens to match:
- `$mono: 'SF Mono', 'Monaco', 'Cascadia Code', 'Courier New', monospace`
- `$green: #66bb6a` for PB improvements
- `$amber: #f59e0b` for streaks/race wins
- Font sizes: stat values `1.4rem`, labels `0.7rem`, delta `0.65rem`
- Border radius: cards `0.5rem`, chips `50rem`
- Transitions: `all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`

**Step 2: Commit**

```bash
git add app/\(new-layout\)/frontpage/sections/your-stats.module.scss
git commit -m "style: rewrite your-stats SCSS for highlight reel layout"
```

---

## Task 6: Integration testing and polish

**Files:**
- All files from tasks 2-5

**Step 1: Run typecheck**

```bash
npm run typecheck
```

Fix any type errors.

**Step 2: Run lint**

```bash
npm run lint
```

Fix any lint errors.

**Step 3: Run dev server and test visually**

```bash
npm run dev
```

Test all three states:
1. Logged-in with activity data — verify all sections render
2. Logged-in with no activity this period — verify fallback behavior
3. Logged-out — verify search box still works

Test period switching (7d → 30d → Year) and verify data changes.

**Step 4: Run build**

```bash
rm -rf .next && npm run build
```

Verify no build errors.

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration fixes for your-performance panel"
```

---

## Task Dependencies

```
Task 1 (Backend endpoint) ← no dependencies, can start first
Task 2 (Types + fetch)    ← no dependencies, can parallel with Task 1
Task 3 (Server component) ← depends on Task 2
Task 4 (Client component) ← depends on Task 2
Task 5 (SCSS)             ← depends on Task 4 (needs to know class names)
Task 6 (Integration)      ← depends on all above
```

Tasks 1 and 2 can run in parallel.
Tasks 3 and 4 can run in parallel (both depend only on Task 2).
Task 5 depends on Task 4.
Task 6 is last.

---

## Notes for implementation

- The backend endpoint is in a separate repo (`/home/joey/therun/therun/`). Changes there need to be deployed before the frontend can call them. During development, the frontend can be tested with mock data or against the dev API.
- The `user_game_stats` materialized view uses `username` (text) not `user_id` (int). The all-time top games query must use `username`, not `userId`.
- Game images from IGDB are always 3:4 portrait. Use dimensions like 36×48, 15×20, 24×32 etc.
- The `cacheLife('minutes')` on the dashboard fetch means the panel won't update instantly when a user gets a new PB. This is acceptable — the panel is a summary, not real-time.
- Race data from `UserSummary` is only available for the current week. For 30d and year views, the `recentRaces` array will be empty unless the race API provides historical data.
