# Trending Games Panel Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current Trending section with a two-zone "Trending Games" panel — "Hot Right Now" (interactive, period-based) and "All-Time" (static) — focused on game/category data, and remove top games from Community Pulse.

**Architecture:** Server component fetches default 7-day activity + all-time games, passes to client component. Client handles period switching via SWR (fetching `/games/activity` directly from the backend). Two visual zones: interactive hot games at top, static all-time at bottom. Each hot game shows inline top categories.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, SWR, SCSS Modules, react-icons, next/image.

**Design doc:** `docs/plans/2026-02-23-trending-games-redesign-design.md`

**Important context:**
- Backend API: `process.env.NEXT_PUBLIC_DATA_URL` — all API calls return `{ result: T }` wrapper
- `apiFetch()` in `src/lib/api-client.ts` unwraps `.result` automatically (server-side only)
- Client-side SWR uses `fetcher` from `src/utils/fetcher.ts` which returns raw JSON — you must access `.result` from the response
- Game page links use `safeEncodeURI` from `src/utils/uri.ts`: `/${safeEncodeURI(game.gameDisplay)}`
- Panel component at `app/(new-layout)/components/panel.component.tsx` takes `title`, `subtitle`, optional `icon` and `link`
- SCSS uses Bootstrap CSS variables (`--bs-body-color`, `--bs-border-color`, `--bs-secondary-color`, `--bs-secondary-bg`)
- Monospace font: `'SF Mono', 'Monaco', 'Cascadia Code', 'Courier New', monospace`
- Amber accent color: `#f59e0b`
- Biome formatting: 4-space indent, single quotes, trailing commas, semicolons
- Unused variables must be prefixed with `_`

---

### Task 1: Add types and data fetching functions to highlights.ts

**Files:**
- Modify: `src/lib/highlights.ts`

**Step 1: Add the GameActivity and CategoryActivity types**

After the existing `WeeklyRunner` interface (line 76), add:

```typescript
export interface GameActivity {
    gameId: number;
    gameDisplay: string;
    gameImage: string;
    totalPlaytime: number;
    totalAttempts: number;
    totalFinishedAttempts: number;
    totalPbs: number;
    totalPbsWithPrevious: number;
    uniquePlayers: number;
}

export interface CategoryActivity extends GameActivity {
    categoryId: number;
    categoryDisplay: string;
}
```

**Step 2: Add the getGameActivity function**

After the existing `getTopCategoriesForGame` function (line 159), add:

```typescript
export async function getGameActivity(
    from: string,
    to: string,
    limit = 6,
    minPlayers = 2,
): Promise<GameActivity[]> {
    'use cache';
    cacheLife('hours');
    cacheTag(`game-activity-${from}-${to}`);

    return apiFetch<GameActivity[]>(
        `/games/activity?from=${from}&to=${to}&type=games&minPlayers=${minPlayers}&limit=${limit}`,
    );
}
```

**Step 3: Add the getCategoryActivityForGame function**

Immediately after `getGameActivity`:

```typescript
export async function getCategoryActivityForGame(
    gameId: number,
    from: string,
    to: string,
    limit = 2,
): Promise<CategoryActivity[]> {
    'use cache';
    cacheLife('hours');
    cacheTag(`category-activity-${gameId}-${from}-${to}`);

    return apiFetch<CategoryActivity[]>(
        `/games/activity?from=${from}&to=${to}&type=categories&gameId=${gameId}&limit=${limit}`,
    );
}
```

**Step 4: Verify types compile**

Run: `npm run typecheck`
Expected: No new errors related to highlights.ts

**Step 5: Commit**

```bash
git add src/lib/highlights.ts
git commit -m "feat: add GameActivity types and fetching functions for trending panel"
```

---

### Task 2: Remove top games from Community Pulse

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/community-pulse.tsx`
- Modify: `app/(new-layout)/frontpage/sections/community-pulse-client.tsx`
- Modify: `app/(new-layout)/frontpage/sections/community-pulse.module.scss`

**Step 1: Update the server component**

In `community-pulse.tsx`:
- Remove `getTopGames` from the import on line 2
- Remove `getTopGames(3)` from the `Promise.all` on line 6 (change the destructured array to only 3 items)
- Remove `topGames={topGames}` from the `CommunityPulseClient` props

The file should become:

```tsx
import { Panel } from '~app/(new-layout)/components/panel.component';
import { getGlobalStats, getLiveCount } from '~src/lib/highlights';
import { CommunityPulseClient } from './community-pulse-client';

export const CommunityPulse = async () => {
    const [globalStats, globalStats24hAgo, liveCount] = await Promise.all([
        getGlobalStats(),
        getGlobalStats('24h'),
        getLiveCount(),
    ]);

    const last24h = {
        pbs: globalStats.totalPbs - globalStats24hAgo.totalPbs,
        runs:
            globalStats.totalFinishedAttemptCount -
            globalStats24hAgo.totalFinishedAttemptCount,
        attempts:
            globalStats.totalAttemptCount - globalStats24hAgo.totalAttemptCount,
        playtimeMs: globalStats.totalRunTime - globalStats24hAgo.totalRunTime,
    };

    return (
        <Panel
            title="Community Pulse"
            subtitle="Last 24 Hours"
            className="p-0 overflow-hidden"
        >
            <CommunityPulseClient
                last24h={last24h}
                allTime={globalStats}
                liveCount={liveCount}
            />
        </Panel>
    );
};
```

**Step 2: Update the client component**

In `community-pulse-client.tsx`:
- Remove the `GameWithImage` import from line 4 (keep the others: `GlobalStats`, `getGlobalStats`, `getLiveCount`)
- Remove `topGames` from the props type (line 93-98) and the destructuring
- Remove the entire Top Games section: lines 256-293 (the `topGamesHeader` div and the `topGamesRow` div with its game cards)
- Remove the unused icon imports `FaClock`, `FaBolt`, `FaFlagCheckered` only if they're no longer used anywhere in the file. Check carefully — `FaClock`, `FaBolt`, `FaFlagCheckered` are used in both the ticker and the footer, so keep them.

The props should become:

```tsx
export const CommunityPulseClient = ({
    last24h: initialLast24h,
    allTime: initialAllTime,
    liveCount: initialLiveCount,
}: {
    last24h: Last24h;
    allTime: GlobalStats;
    liveCount: number;
}) => {
```

Remove lines 256-293 (the Top Games section):
```tsx
            <div className={styles.topGamesHeader}>Top Games</div>
            <div className={styles.topGamesRow}>
                ...entire topGamesRow block...
            </div>
```

**Step 3: Remove top games styles from SCSS**

In `community-pulse.module.scss`, remove the following sections (lines 195-275):
- `.topGamesHeader` (lines 197-208)
- `.topGamesRow` (lines 210-215)
- `.gameCard` (lines 217-234)
- `.gameImage` (lines 236-243) — note: this conflicts with trending's `.gameImage`, it's scoped to this module so safe to remove
- `.gameInfo` (lines 245-250)
- `.gameName` (lines 252-259)
- `.gameStats` (lines 261-265)
- `.gameStat` (lines 267-274)

**Step 4: Verify types compile**

Run: `npm run typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add app/\(new-layout\)/frontpage/sections/community-pulse.tsx app/\(new-layout\)/frontpage/sections/community-pulse-client.tsx app/\(new-layout\)/frontpage/sections/community-pulse.module.scss
git commit -m "refactor: remove top games from community pulse"
```

---

### Task 3: Build the trending section server component

**Files:**
- Rewrite: `app/(new-layout)/frontpage/sections/trending-section.tsx`

**Step 1: Rewrite the server component**

Replace the entire file. The server component fetches default 7-day game activity, top categories for each game, and all-time top games. It passes all data to the client component.

```tsx
import {
    type CategoryActivity,
    type GameActivity,
    type GameWithImage,
    getGameActivity,
    getCategoryActivityForGame,
    getTopGames,
} from '~src/lib/highlights';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { TrendingSectionClient } from './trending-section-client';

function getDateDaysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

function getToday(): string {
    return new Date().toISOString().split('T')[0];
}

export const TrendingSection = async () => {
    const from7d = getDateDaysAgo(7);
    const to = getToday();

    const [hotGames, allTimeGames] = await Promise.all([
        getGameActivity(from7d, to, 6, 3),
        getTopGames(5),
    ]);

    // Fetch top 2 categories for each hot game in parallel
    const categoryMap: Record<number, CategoryActivity[]> = {};
    const categoryResults = await Promise.all(
        hotGames.map((game) =>
            getCategoryActivityForGame(game.gameId, from7d, to, 2),
        ),
    );
    for (let i = 0; i < hotGames.length; i++) {
        categoryMap[hotGames[i].gameId] = categoryResults[i];
    }

    return (
        <Panel title="Trending Games" subtitle="What's Hot" className="p-0 overflow-hidden">
            <TrendingSectionClient
                initialGames={hotGames}
                initialCategoryMap={categoryMap}
                allTimeGames={allTimeGames}
            />
        </Panel>
    );
};
```

**Step 2: Verify types compile (will fail until Task 4 creates the client component)**

Run: `npm run typecheck`
Expected: Error about missing `./trending-section-client` — this is expected, will be resolved in Task 4.

**Step 3: Commit**

```bash
git add app/\(new-layout\)/frontpage/sections/trending-section.tsx
git commit -m "feat: rewrite trending section server component with activity data"
```

---

### Task 4: Build the trending section client component

**Files:**
- Create: `app/(new-layout)/frontpage/sections/trending-section-client.tsx`

**Step 1: Create the client component**

This is the main interactive component. It handles:
- Period switching (24h, 3d, 7d, 30d) via SWR
- Metric sort toggle (playtime, players, attempts, PBs)
- Hot game cards with inline categories
- All-time section (static, passed from server)

```tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
    FaBolt,
    FaClock,
    FaCrown,
    FaFire,
    FaFlagCheckered,
    FaTrophy,
    FaUsers,
} from 'react-icons/fa6';
import useSWR from 'swr';
import type {
    CategoryActivity,
    GameActivity,
    GameWithImage,
} from '~src/lib/highlights';
import { safeEncodeURI } from '~src/utils/uri';
import styles from './trending-section.module.scss';

const FALLBACK_IMAGE = '/logo_dark_theme_no_text_transparent.png';
const BASE_URL = process.env.NEXT_PUBLIC_DATA_URL;

type Period = '1' | '3' | '7' | '30';
type Metric = 'playtime' | 'players' | 'attempts' | 'pbs';

const PERIODS: { value: Period; label: string }[] = [
    { value: '1', label: '24h' },
    { value: '3', label: '3d' },
    { value: '7', label: '7d' },
    { value: '30', label: '30d' },
];

const METRICS: { value: Metric; label: string }[] = [
    { value: 'playtime', label: 'Playtime' },
    { value: 'players', label: 'Players' },
    { value: 'attempts', label: 'Attempts' },
    { value: 'pbs', label: 'PBs' },
];

function getDateDaysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

function getToday(): string {
    return new Date().toISOString().split('T')[0];
}

function getMinPlayers(period: Period): number {
    return period === '1' || period === '3' ? 2 : 3;
}

function formatHoursCompact(ms: number): string {
    const hours = ms / 3_600_000;
    if (hours >= 1_000) return `${(hours / 1_000).toFixed(1)}K`;
    return Math.round(hours).toLocaleString();
}

const compact = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
});

function sortByMetric(games: GameActivity[], metric: Metric): GameActivity[] {
    const sorted = [...games];
    sorted.sort((a, b) => {
        switch (metric) {
            case 'playtime':
                return b.totalPlaytime - a.totalPlaytime;
            case 'players':
                return b.uniquePlayers - a.uniquePlayers;
            case 'attempts':
                return b.totalAttempts - a.totalAttempts;
            case 'pbs':
                return b.totalPbs - a.totalPbs;
        }
    });
    return sorted;
}

function getMetricValue(game: GameActivity, metric: Metric): string {
    switch (metric) {
        case 'playtime':
            return `${formatHoursCompact(game.totalPlaytime)} hrs`;
        case 'players':
            return `${compact.format(game.uniquePlayers)} players`;
        case 'attempts':
            return `${compact.format(game.totalAttempts)} attempts`;
        case 'pbs':
            return `${compact.format(game.totalPbs)} PBs`;
    }
}

async function activityFetcher(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch activity');
    const json = await res.json();
    return json.result;
}

interface TrendingSectionClientProps {
    initialGames: GameActivity[];
    initialCategoryMap: Record<number, CategoryActivity[]>;
    allTimeGames: GameWithImage[];
}

export const TrendingSectionClient = ({
    initialGames,
    initialCategoryMap,
    allTimeGames,
}: TrendingSectionClientProps) => {
    const [period, setPeriod] = useState<Period>('7');
    const [metric, setMetric] = useState<Metric>('playtime');

    const from = getDateDaysAgo(Number(period));
    const to = getToday();
    const minPlayers = getMinPlayers(period);

    // Only use SWR when period differs from the default (7d)
    const shouldFetch = period !== '7';
    const gamesUrl = shouldFetch
        ? `${BASE_URL}/games/activity?from=${from}&to=${to}&type=games&minPlayers=${minPlayers}&limit=6`
        : null;

    const { data: fetchedGames } = useSWR<GameActivity[]>(
        gamesUrl,
        activityFetcher,
        { keepPreviousData: true },
    );

    const hotGames = sortByMetric(fetchedGames ?? initialGames, metric);

    // Fetch categories for current games
    const gameIds = hotGames.map((g) => g.gameId).join(',');
    const categoriesUrl = shouldFetch
        ? `${BASE_URL}/games/activity?from=${from}&to=${to}&type=categories&limit=12`
        : null;

    const { data: fetchedCategories } = useSWR<CategoryActivity[]>(
        categoriesUrl,
        activityFetcher,
        { keepPreviousData: true },
    );

    // Build category map: group fetched categories by gameId, take top 2
    const categoryMap: Record<number, CategoryActivity[]> = shouldFetch
        ? buildCategoryMap(fetchedCategories ?? [], hotGames)
        : initialCategoryMap;

    return (
        <div className={styles.content}>
            {/* Hot Right Now zone */}
            <div className={styles.hotZone}>
                <div className={styles.hotHeader}>
                    <div className={styles.hotTitle}>
                        <FaFire size={12} />
                        Hot Right Now
                    </div>
                    <div className={styles.periodPills}>
                        {PERIODS.map((p) => (
                            <button
                                key={p.value}
                                type="button"
                                className={`${styles.pill} ${period === p.value ? styles.pillActive : ''}`}
                                onClick={() => setPeriod(p.value)}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.metricPills}>
                    {METRICS.map((m) => (
                        <button
                            key={m.value}
                            type="button"
                            className={`${styles.metricPill} ${metric === m.value ? styles.metricPillActive : ''}`}
                            onClick={() => setMetric(m.value)}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                <div className={styles.hotGames}>
                    {hotGames.map((game, i) => (
                        <HotGameCard
                            key={game.gameId}
                            game={game}
                            rank={i + 1}
                            metric={metric}
                            categories={categoryMap[game.gameId] ?? []}
                        />
                    ))}
                </div>
            </div>

            {/* All-Time zone */}
            <div className={styles.allTimeZone}>
                <div className={styles.allTimeHeader}>
                    <FaCrown size={12} />
                    All-Time
                </div>
                <div className={styles.allTimeGames}>
                    {allTimeGames.map((game, i) => (
                        <AllTimeGameRow
                            key={game.gameId}
                            game={game}
                            rank={i + 1}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

function buildCategoryMap(
    categories: CategoryActivity[],
    games: GameActivity[],
): Record<number, CategoryActivity[]> {
    const map: Record<number, CategoryActivity[]> = {};
    const gameIdSet = new Set(games.map((g) => g.gameId));
    for (const cat of categories) {
        if (!gameIdSet.has(cat.gameId)) continue;
        if (!map[cat.gameId]) map[cat.gameId] = [];
        if (map[cat.gameId].length < 2) map[cat.gameId].push(cat);
    }
    return map;
}

const HotGameCard = ({
    game,
    rank,
    metric,
    categories,
}: {
    game: GameActivity;
    rank: number;
    metric: Metric;
    categories: CategoryActivity[];
}) => {
    const imageUrl =
        game.gameImage && game.gameImage !== 'noimage'
            ? game.gameImage
            : FALLBACK_IMAGE;

    return (
        <div className={styles.hotGameCard}>
            <span className={styles.rank}>{rank}</span>
            <Image
                src={imageUrl}
                alt={game.gameDisplay}
                width={48}
                height={48}
                className={styles.gameArt}
                unoptimized
            />
            <div className={styles.gameInfo}>
                <Link
                    href={`/${safeEncodeURI(game.gameDisplay)}`}
                    className={styles.gameName}
                >
                    {game.gameDisplay}
                </Link>
                {categories.length > 0 && (
                    <span className={styles.categories}>
                        {categories
                            .map((c) => c.categoryDisplay)
                            .join(' · ')}
                    </span>
                )}
            </div>
            <div className={styles.statGrid}>
                <div
                    className={`${styles.stat} ${metric === 'playtime' ? styles.statHighlight : ''}`}
                >
                    <FaClock size={9} />
                    <span>{formatHoursCompact(game.totalPlaytime)}</span>
                </div>
                <div
                    className={`${styles.stat} ${metric === 'players' ? styles.statHighlight : ''}`}
                >
                    <FaUsers size={9} />
                    <span>{compact.format(game.uniquePlayers)}</span>
                </div>
                <div
                    className={`${styles.stat} ${metric === 'attempts' ? styles.statHighlight : ''}`}
                >
                    <FaBolt size={9} />
                    <span>{compact.format(game.totalAttempts)}</span>
                </div>
                <div
                    className={`${styles.stat} ${metric === 'pbs' ? styles.statHighlight : ''}`}
                >
                    <FaTrophy size={9} />
                    <span>{compact.format(game.totalPbs)}</span>
                </div>
            </div>
        </div>
    );
};

const AllTimeGameRow = ({
    game,
    rank,
}: {
    game: GameWithImage;
    rank: number;
}) => {
    const imageUrl =
        game.gameImage && game.gameImage !== 'noimage'
            ? game.gameImage
            : FALLBACK_IMAGE;

    return (
        <Link
            href={`/${safeEncodeURI(game.gameDisplay)}`}
            className={styles.allTimeRow}
        >
            <span className={styles.allTimeRank}>{rank}</span>
            <Image
                src={imageUrl}
                alt={game.gameDisplay}
                width={32}
                height={32}
                className={styles.allTimeArt}
                unoptimized
            />
            <span className={styles.allTimeName}>{game.gameDisplay}</span>
            <span className={styles.allTimeStat}>
                <FaClock size={9} />
                {Math.round(game.totalRunTime / 3_600_000).toLocaleString()} hrs
            </span>
            <span className={styles.allTimeStat}>
                <FaUsers size={9} />
                {compact.format(game.uniqueRunners)}
            </span>
        </Link>
    );
};
```

**Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: No errors (or only SCSS module type warnings)

**Step 3: Commit**

```bash
git add app/\(new-layout\)/frontpage/sections/trending-section-client.tsx
git commit -m "feat: add trending section client component with period switching and metric sort"
```

---

### Task 5: Write the SCSS styles for the trending section

**Files:**
- Rewrite: `app/(new-layout)/frontpage/sections/trending-section.module.scss`

**Step 1: Replace the entire SCSS file**

```scss
$mono: 'SF Mono', 'Monaco', 'Cascadia Code', 'Courier New', monospace;
$amber: #f59e0b;

.content {
    display: flex;
    flex-direction: column;
}

// ── Hot Right Now zone ──

.hotZone {
    padding: 1rem 1.25rem;
}

.hotHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
}

.hotTitle {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: $amber;
}

.periodPills {
    display: flex;
    gap: 2px;
    background: color-mix(in srgb, var(--bs-secondary-bg) 60%, transparent);
    border-radius: 6px;
    padding: 2px;
}

.pill {
    all: unset;
    padding: 0.2rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    border-radius: 4px;
    color: var(--bs-secondary-color);
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
        color: var(--bs-body-color);
        background: color-mix(in srgb, var(--bs-secondary-bg) 80%, transparent);
    }
}

.pillActive {
    color: var(--bs-body-color);
    background: var(--bs-body-bg);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.metricPills {
    display: flex;
    gap: 0.35rem;
    margin-bottom: 0.75rem;
}

.metricPill {
    all: unset;
    padding: 0.15rem 0.45rem;
    font-size: 0.65rem;
    font-weight: 600;
    border-radius: 4px;
    color: var(--bs-secondary-color);
    cursor: pointer;
    transition: all 0.15s;
    border: 1px solid transparent;

    &:hover {
        color: var(--bs-body-color);
    }
}

.metricPillActive {
    color: var(--bs-body-color);
    border-color: var(--bs-border-color);
    background: color-mix(in srgb, var(--bs-secondary-bg) 50%, transparent);
}

// ── Hot game cards ──

.hotGames {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.hotGameCard {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.5rem;
    border-radius: 0.5rem;
    transition: background-color 0.15s ease;

    &:hover {
        background-color: color-mix(in srgb, var(--bs-secondary-bg) 50%, transparent);
    }

    &:nth-child(even) {
        background-color: color-mix(in srgb, var(--bs-secondary-bg) 20%, transparent);

        &:hover {
            background-color: color-mix(in srgb, var(--bs-secondary-bg) 50%, transparent);
        }
    }
}

.rank {
    width: 1.25rem;
    text-align: center;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--bs-secondary-color);
    flex-shrink: 0;
}

.gameArt {
    width: 48px;
    height: 48px;
    border-radius: 4px;
    object-fit: cover;
    flex-shrink: 0;
    border: 1px solid color-mix(in srgb, var(--bs-secondary-bg) 80%, transparent);
}

.gameInfo {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
}

.gameName {
    font-weight: 600;
    font-size: 0.85rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--bs-body-color);
    text-decoration: none;

    &:hover {
        color: var(--bs-primary);
    }
}

.categories {
    font-size: 0.7rem;
    color: var(--bs-secondary-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.statGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.15rem 0.5rem;
    flex-shrink: 0;
}

.stat {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-family: $mono;
    font-size: 0.65rem;
    color: var(--bs-secondary-color);
    white-space: nowrap;
}

.statHighlight {
    color: $amber;
    font-weight: 600;
}

// ── All-Time zone ──

.allTimeZone {
    padding: 0.75rem 1.25rem 1rem;
    border-top: 1px solid var(--bs-border-color);
    background: color-mix(in srgb, var(--bs-secondary-bg) 25%, transparent);
}

.allTimeHeader {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: var(--bs-secondary-color);
    margin-bottom: 0.5rem;
}

.allTimeGames {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.allTimeRow {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.4rem;
    border-radius: 0.4rem;
    text-decoration: none;
    transition: background-color 0.15s ease;

    &:hover {
        background-color: color-mix(in srgb, var(--bs-secondary-bg) 50%, transparent);
    }
}

.allTimeRank {
    width: 1.25rem;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--bs-secondary-color);
    flex-shrink: 0;
}

.allTimeArt {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    object-fit: cover;
    flex-shrink: 0;
}

.allTimeName {
    flex: 1;
    min-width: 0;
    font-weight: 500;
    font-size: 0.8rem;
    color: var(--bs-body-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.allTimeStat {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-family: $mono;
    font-size: 0.7rem;
    color: var(--bs-secondary-color);
    white-space: nowrap;
    flex-shrink: 0;
}

// ── Responsive ──

@media (max-width: 480px) {
    .hotZone {
        padding: 0.75rem 1rem;
    }

    .allTimeZone {
        padding: 0.75rem 1rem;
    }

    .hotHeader {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }

    .statGrid {
        display: none;
    }

    .hotGameCard::after {
        content: attr(data-primary-stat);
        font-family: $mono;
        font-size: 0.7rem;
        color: $amber;
        font-weight: 600;
        flex-shrink: 0;
        margin-left: auto;
    }
}
```

**Step 2: Verify the dev server renders without SCSS errors**

Run: `npm run dev` (check for compilation errors in terminal)

**Step 3: Commit**

```bash
git add app/\(new-layout\)/frontpage/sections/trending-section.module.scss
git commit -m "style: add two-zone trending section styles"
```

---

### Task 6: Visual review and polish

**Files:**
- Possibly adjust: `app/(new-layout)/frontpage/sections/trending-section-client.tsx`
- Possibly adjust: `app/(new-layout)/frontpage/sections/trending-section.module.scss`

**Step 1: Start the dev server and visually review**

Run: `npm run dev`

Visit the frontpage. Check:
1. Community Pulse no longer shows top games
2. Trending Games panel appears with "Hot Right Now" zone and "All-Time" zone
3. Period pills switch correctly and data reloads
4. Metric sort toggle reorders the list client-side
5. Game cards show game art, name, categories, and 2×2 stat grid
6. All-Time zone shows 5 games with compact rows
7. Responsive: check mobile width (the stat grid should hide on small screens)

**Step 2: Fix any visual issues**

Adjust spacing, font sizes, colors as needed. Common things to check:
- Game art sizing and border radius
- Text truncation on long game names
- Stat grid alignment
- Period pill active state contrast
- All-Time zone background contrast

**Step 3: Verify typecheck and lint pass**

Run: `npm run typecheck && npm run lint`

**Step 4: Commit any polish changes**

```bash
git add app/\(new-layout\)/frontpage/sections/
git commit -m "style: polish trending games panel layout and spacing"
```

---

### Summary of files changed

| Action | File |
|--------|------|
| Modify | `src/lib/highlights.ts` — add GameActivity/CategoryActivity types and fetch functions |
| Modify | `app/(new-layout)/frontpage/sections/community-pulse.tsx` — remove getTopGames |
| Modify | `app/(new-layout)/frontpage/sections/community-pulse-client.tsx` — remove topGames prop and Top Games UI |
| Modify | `app/(new-layout)/frontpage/sections/community-pulse.module.scss` — remove top games styles |
| Rewrite | `app/(new-layout)/frontpage/sections/trending-section.tsx` — server component with activity data |
| Create | `app/(new-layout)/frontpage/sections/trending-section-client.tsx` — client component with SWR |
| Rewrite | `app/(new-layout)/frontpage/sections/trending-section.module.scss` — two-zone styles |
