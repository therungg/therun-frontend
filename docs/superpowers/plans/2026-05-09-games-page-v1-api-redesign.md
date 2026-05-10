# Games Page v1 API Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/games/[game]` on top of the new backend v1 APIs (`/leaderboards/*`, `/v1/runs*`, `/v1/finished-runs`, `/v1/leaderboards/{game}/{category}/variables`), with the PB leaderboard as the headline, behind a parallel `/games-v2/[game]` route until cutover.

**Architecture:** Single Next.js 16 server component at `app/(new-layout)/games-v2/[game]/page.tsx`. URL is the source of truth: category, subcategory hash, variable filters, verified, and page all live in query params. Each filter change triggers a server navigation; no client SWR. Slug → ID resolution happens server-side and is cached. Both timing methods (rt + gt) are fetched in parallel and rendered side-by-side. Sidebar panels and drawers reuse existing components from `src/components/`.

**Tech Stack:** Next.js 16 (App Router, `'use cache'`, Turbopack), React 19, TypeScript, Biome, react-bootstrap (existing components reused), `tsx` for runnable scripts. No test framework — verification is `npm run typecheck` + `npm run build` + manual browser checks per CLAUDE.md, plus a `tsx`-runnable script for the pure hash function.

**Spec:** `docs/superpowers/specs/2026-05-09-games-page-v1-api-redesign-design.md`

**Backend dependencies (recap):**
1. `/v1/leaderboards/{game}/{category}/variables` must distinguish subcategory-typed vs filter-typed variables. Blocks Task 5.
2. Per-game `defaultVerified` flag in the resolved game record. Task 3 has a fallback (hardcode `false`).
3. Slug resolution via `/v1/runs/games?game={slug}`. Task 1 has a fallback (use leaderboard endpoint's path-based alias resolution).

---

## File Structure

**New shared modules** (`src/lib/`, `types/`):

| File | Responsibility |
|---|---|
| `types/leaderboards.ts` | Request/response types for v1 leaderboard + run query endpoints |
| `src/lib/v1-fetch.ts` | Thin fetch wrapper for v1 APIs that returns the full JSON body (no `.result` unwrapping) and throws on HTTP errors |
| `src/lib/leaderboard-hash.ts` | Pure `computeSubcategoryHash(defs, values)` mirroring backend SHA-256 algorithm |
| `src/lib/leaderboard-hash.verify.ts` | Standalone `tsx`-runnable verification script with structural assertions |
| `src/lib/games-v1.ts` | `resolveGame`, `resolveCategory`, `getQuickStats`, `getRecentPbs`, `getLiveRunnersForGame` (existing live source, filtered) |
| `src/lib/leaderboards-v1.ts` | `getLeaderboard`, `getVariables`, `getUserRankings`, `getWrHistory` |

**New page-local components** (`app/(new-layout)/games-v2/[game]/`):

| File | Responsibility |
|---|---|
| `page.tsx` | Server entry; orchestrates fan-out; renders `<game-page>` |
| `data.ts` | Server-only composition: collects all data needed by `<game-page>` |
| `types.ts` | Page-local view-model types |
| `game-page.tsx` | Server; pure layout (header / filters / leaderboard / sidebar grid) |
| `header/game-header.tsx` | Game image + display name + breadcrumb + totals |
| `header/category-pills.tsx` | Client; pill row for categories; pushes `?category=` |
| `filters/filter-bar.tsx` | Client; composition of subcategory + variable + verified controls |
| `filters/subcategory-pills.tsx` | Client; renders only when subcategory variables exist; computes hash |
| `filters/variable-pill.tsx` | Client; one per filter-type variable; popover for values |
| `filters/verified-toggle.tsx` | Client; switch; pushes `?verified=` |
| `leaderboard/leaderboard-table.tsx` | Server; rt + gt columns |
| `leaderboard/leaderboard-row.tsx` | Server; rank, runner, rt, gt, set-at, vod, verified pill, current-user highlight |
| `leaderboard/pagination-bar.tsx` | Client; numbered pages; pushes `?page=` |
| `leaderboard/jump-to-rank-button.tsx` | Client; conditional render; pushes `?page=` to user's target page |
| `sidebar/sidebar.tsx` | Server; vertical stack |
| `sidebar/wr-card.tsx` | Top runner of the active board |
| `sidebar/live-panel.tsx` | Compact, max 5; "View all" → `<live-drawer>` |
| `sidebar/recent-pbs-panel.tsx` | Compact, max 5 |
| `sidebar/quick-stats-panel.tsx` | Aggregate numbers |
| `drawers/live-drawer.tsx` | Client; lazy via `next/dynamic`; reuses live grid |
| `drawers/wr-history-drawer.tsx` | Client; lazy via `next/dynamic`; reuses `WrHistory` + `WrHistoryTableMode` |

---

## Task 1: Data Layer + Hash Function

**Files:**
- Create: `types/leaderboards.ts`
- Create: `src/lib/v1-fetch.ts`
- Create: `src/lib/leaderboard-hash.ts`
- Create: `src/lib/leaderboard-hash.verify.ts`
- Create: `src/lib/games-v1.ts`
- Create: `src/lib/leaderboards-v1.ts`

**Dependencies:** None.

- [ ] **Step 1: Create `types/leaderboards.ts`**

```ts
// types/leaderboards.ts

export interface ResolvedGame {
    id: number;
    name: string;
    display: string;
    image?: string | null;
    // From the per-game configurable verified default. Undefined if backend
    // hasn't surfaced this field yet (backend dep #2).
    defaultVerified?: boolean;
    // Used to decide which timing column drives row order.
    primaryTiming?: 'rt' | 'gt';
}

export interface ResolvedCategory {
    id: number;
    name: string;
    display: string;
    primaryTiming: 'rt' | 'gt';
    defaultSubcategoryHash?: string | null;
    sortAscending?: boolean;
}

export interface QuickStats {
    totalRunTime: number;
    totalAttemptCount: number;
    totalFinishedAttemptCount: number;
    uniqueRunners: number;
}

export interface RecentPb {
    id: number;
    username: string;
    game: string;
    category: string;
    time: number;
    gameTime?: number | null;
    endedAt: string;
    isPb: boolean;
}

// Variable definition from /v1/leaderboards/{game}/{category}/variables.
//
// Backend dep #1: `kind` (subcategory vs filter classification) is needed for
// hash computation vs query filtering. The current response surfaces `type`
// as a UI input style (`select`); confirm the classification field name
// before Task 5 ships. Until then this type uses an optional `kind` and code
// that needs the classification falls through to "treat as filter".
export interface VariableDef {
    name: string;
    display: string;
    type: string; // input style hint (e.g. 'select')
    kind?: 'subcategory' | 'filter';
    values: string[];
    defaultValue?: string | null;
    required: boolean;
    sortOrder: number;
    scope: 'game' | 'category';
}

export interface VariablesResponse {
    variables: VariableDef[];
}

export interface LeaderboardEntry {
    runId: number;
    rank: number;
    runnerName: string;
    userId?: number | null;
    isGuest: boolean;
    time: number;
    gameTime?: number | null;
    setAt: string;
    vodUrl?: string | null;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    variables?: Record<string, string> | null;
}

export interface LeaderboardResponse {
    entries: LeaderboardEntry[];
    page: number;
    pageSize: number;
    totalEntries: number;
    totalPages: number;
}

export interface WrHistoryEntry {
    runnerName: string;
    time: number;
    timingMethod: 'rt' | 'gt';
    setAt: string;
    supersededAt?: string | null;
}

export interface UserRanking {
    gameId: number;
    categoryId: number;
    subcategoryHash: string;
    timing: 'rt' | 'gt';
    rank: number;
    time: number;
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS (new types file references nothing else; should be a clean compile).

- [ ] **Step 3: Create `src/lib/v1-fetch.ts`**

```ts
// src/lib/v1-fetch.ts

const BASE_URL = process.env.NEXT_PUBLIC_DATA_URL;

export class V1FetchError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export async function v1Fetch<T>(
    path: string,
    init?: RequestInit,
): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, init);
    if (!res.ok) {
        let message = `${res.status} ${path}`;
        try {
            const j = await res.json();
            if (j?.error) message = j.error;
        } catch {
            // non-JSON body
        }
        throw new V1FetchError(res.status, message);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
}
```

- [ ] **Step 4: Create `src/lib/leaderboard-hash.ts`**

```ts
// src/lib/leaderboard-hash.ts
import { createHash } from 'node:crypto';
import type { VariableDef } from '~/types/leaderboards';

export class MissingRequiredVariableError extends Error {
    constructor(name: string) {
        super(`Missing required subcategory variable: ${name}`);
    }
}

/**
 * Mirrors the backend computeSubcategoryHash algorithm:
 *   1. Filter to subcategory-typed variables only.
 *   2. Sort by name alphabetically.
 *   3. For each: use the user's selected value, or fall back to defaultValue.
 *   4. If a variable is required and has no value or default, throw.
 *   5. Build "name1=value1|name2=value2|...".
 *   6. SHA-256, truncate to 16 hex chars.
 *
 * Returns "" if no subcategory variables exist or all are unset.
 */
export function computeSubcategoryHash(
    defs: VariableDef[],
    selected: Record<string, string | undefined>,
): string {
    const subcategoryDefs = defs
        .filter((d) => d.kind === 'subcategory')
        .sort((a, b) => a.name.localeCompare(b.name));

    if (subcategoryDefs.length === 0) return '';

    const parts: string[] = [];
    for (const def of subcategoryDefs) {
        const value = selected[def.name] ?? def.defaultValue ?? undefined;
        if (value === undefined || value === null || value === '') {
            if (def.required) throw new MissingRequiredVariableError(def.name);
            continue;
        }
        parts.push(`${def.name}=${value}`);
    }

    if (parts.length === 0) return '';

    return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
}
```

- [ ] **Step 5: Create `src/lib/leaderboard-hash.verify.ts`** (runnable via `npx tsx`)

```ts
// src/lib/leaderboard-hash.verify.ts
//
// Run with: npx tsx src/lib/leaderboard-hash.verify.ts
//
// Asserts structural invariants of computeSubcategoryHash. The actual hash
// values printed at the bottom should be cross-checked against the backend's
// implementation by passing the same inputs through the backend's
// computeSubcategoryHash() and confirming string equality.

import {
    MissingRequiredVariableError,
    computeSubcategoryHash,
} from './leaderboard-hash';
import type { VariableDef } from '../../types/leaderboards';

function assert(cond: unknown, msg: string): asserts cond {
    if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

const noVars: VariableDef[] = [];

const oneSubcat: VariableDef[] = [
    {
        name: 'difficulty',
        display: 'Difficulty',
        type: 'select',
        kind: 'subcategory',
        values: ['hard', 'easy'],
        required: true,
        sortOrder: 0,
        scope: 'game',
    },
];

const twoSubcat: VariableDef[] = [
    {
        name: 'platform',
        display: 'Platform',
        type: 'select',
        kind: 'subcategory',
        values: ['n64', 'pc'],
        required: true,
        sortOrder: 1,
        scope: 'game',
    },
    {
        name: 'difficulty',
        display: 'Difficulty',
        type: 'select',
        kind: 'subcategory',
        values: ['hard', 'easy'],
        defaultValue: 'easy',
        required: false,
        sortOrder: 0,
        scope: 'game',
    },
];

const filterOnly: VariableDef[] = [
    {
        name: 'platform',
        display: 'Platform',
        type: 'select',
        kind: 'filter',
        values: ['n64', 'pc'],
        required: false,
        sortOrder: 0,
        scope: 'game',
    },
];

// 1. No vars → empty string
assert(computeSubcategoryHash(noVars, {}) === '', 'noVars yields empty string');

// 2. Filter-only vars are ignored → empty string
assert(
    computeSubcategoryHash(filterOnly, { platform: 'n64' }) === '',
    'filter-only vars ignored',
);

// 3. Required missing → throws
let threw = false;
try {
    computeSubcategoryHash(oneSubcat, {});
} catch (e) {
    threw = e instanceof MissingRequiredVariableError;
}
assert(threw, 'required missing throws MissingRequiredVariableError');

// 4. Hash is stable for same input
const a = computeSubcategoryHash(oneSubcat, { difficulty: 'hard' });
const b = computeSubcategoryHash(oneSubcat, { difficulty: 'hard' });
assert(a === b, 'hash is deterministic');
assert(/^[0-9a-f]{16}$/.test(a), 'hash is 16 hex chars');

// 5. Sort order is by variable name, not sortOrder field — so platform,difficulty
//    must produce the same hash as difficulty,platform input order
const c = computeSubcategoryHash(twoSubcat, {
    platform: 'n64',
    difficulty: 'hard',
});
const reversedDefs = [...twoSubcat].reverse();
const d = computeSubcategoryHash(reversedDefs, {
    platform: 'n64',
    difficulty: 'hard',
});
assert(c === d, 'def order does not change hash (sort by name)');

// 6. Default value applies when not selected
const withDefault = computeSubcategoryHash(twoSubcat, { platform: 'n64' });
const explicitDefault = computeSubcategoryHash(twoSubcat, {
    platform: 'n64',
    difficulty: 'easy',
});
assert(withDefault === explicitDefault, 'defaultValue applied when unset');

console.log('All assertions passed.');
console.log('Cross-check hashes against backend:');
console.log(`  difficulty=hard            → ${a}`);
console.log(`  difficulty=hard|platform=n64 → ${c}`);
```

- [ ] **Step 6: Run the verification script**

```bash
npx tsx src/lib/leaderboard-hash.verify.ts
```

Expected output ends with `All assertions passed.` followed by two hash lines. Capture those hash lines and cross-check them against the backend's `computeSubcategoryHash` (ask backend Claude or run the equivalent inputs through the backend code) before proceeding. If they don't match, the algorithm has drifted and Task 1 is not done.

- [ ] **Step 7: Create `src/lib/games-v1.ts`**

```ts
// src/lib/games-v1.ts
'use server';

import { cacheLife, cacheTag } from 'next/cache';
import type {
    QuickStats,
    RecentPb,
    ResolvedCategory,
    ResolvedGame,
} from '~/types/leaderboards';
import { v1Fetch } from './v1-fetch';

interface GamesEndpointRow {
    game_id: number;
    game_display: string;
    game_image?: string | null;
    total_run_time: number;
    total_attempt_count: number;
    total_finished_attempt_count: number;
    unique_runners: number;
}

interface CategoriesEndpointRow {
    game_id: number;
    category_id: number;
    game_display: string;
    category_display: string;
    game_image?: string | null;
    total_run_time: number;
    total_attempt_count: number;
    total_finished_attempt_count: number;
    unique_runners: number;
    // Backend dep: confirm these fields are exposed.
    primary_timing?: 'rt' | 'gt';
    default_subcategory_hash?: string | null;
    sort_ascending?: boolean;
    default_verified?: boolean;
}

function normalizeSlug(slug: string): string {
    return slug.toLowerCase().replace(/\s+/g, '');
}

export async function resolveGame(slug: string): Promise<ResolvedGame | null> {
    'use cache';
    cacheLife('hours');
    cacheTag(`game-resolve:${slug}`);

    const normalized = normalizeSlug(slug);
    const path = `/v1/runs/games?game=${encodeURIComponent(normalized)}&limit=1`;
    const body = await v1Fetch<{ result: GamesEndpointRow[] }>(path);
    const row = body.result?.[0];
    if (!row) return null;

    return {
        id: row.game_id,
        name: row.game_display.toLowerCase().replace(/\s+/g, ''),
        display: row.game_display,
        image: row.game_image ?? null,
        // defaultVerified / primaryTiming come from category-level data, not
        // game-level; left undefined here. Resolved per-category by
        // resolveCategory.
    };
}

export async function getQuickStats(gameId: number): Promise<QuickStats> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`game-stats:${gameId}`);

    const path = `/v1/runs/games?game_id=${gameId}&limit=1`;
    const body = await v1Fetch<{ result: GamesEndpointRow[] }>(path);
    const row = body.result?.[0];
    if (!row) {
        return {
            totalRunTime: 0,
            totalAttemptCount: 0,
            totalFinishedAttemptCount: 0,
            uniqueRunners: 0,
        };
    }
    return {
        totalRunTime: row.total_run_time,
        totalAttemptCount: row.total_attempt_count,
        totalFinishedAttemptCount: row.total_finished_attempt_count,
        uniqueRunners: row.unique_runners,
    };
}

/**
 * Returns the categories for a game, sorted by total run time desc.
 * If `categorySlug` is provided, the matching category is moved first; if
 * not provided, the highest-playtime category is first. Caller picks index 0.
 */
export async function resolveCategory(
    gameId: number,
    categorySlug?: string,
): Promise<{
    categories: ResolvedCategory[];
    selected: ResolvedCategory | null;
}> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`game-cats:${gameId}`);

    const path = `/v1/runs/categories?game_id=${gameId}&sort=-total_run_time&limit=200`;
    const body = await v1Fetch<{ result: CategoriesEndpointRow[] }>(path);
    const rows = body.result ?? [];
    const categories: ResolvedCategory[] = rows.map((r) => ({
        id: r.category_id,
        name: r.category_display.toLowerCase().replace(/\s+/g, ''),
        display: r.category_display,
        primaryTiming: r.primary_timing ?? 'rt',
        defaultSubcategoryHash: r.default_subcategory_hash ?? null,
        sortAscending: r.sort_ascending ?? true,
    }));

    let selected: ResolvedCategory | null = null;
    if (categorySlug) {
        const norm = normalizeSlug(categorySlug);
        selected = categories.find((c) => c.name === norm) ?? null;
    }
    if (!selected) selected = categories[0] ?? null;

    return { categories, selected };
}

export async function getRecentPbs(
    gameId: number,
    limit = 10,
): Promise<RecentPb[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`recent-pbs:${gameId}`);

    const path = `/v1/finished-runs?game_id=${gameId}&is_pb=true&sort=-ended_at&limit=${limit}`;
    const body = await v1Fetch<{ result: RecentPb[] }>(path);
    return body.result ?? [];
}
```

- [ ] **Step 8: Create `src/lib/leaderboards-v1.ts`**

```ts
// src/lib/leaderboards-v1.ts
'use server';

import { cacheLife, cacheTag } from 'next/cache';
import type {
    LeaderboardResponse,
    UserRanking,
    VariableDef,
    VariablesResponse,
    WrHistoryEntry,
} from '~/types/leaderboards';
import { v1Fetch } from './v1-fetch';

export interface LeaderboardQuery {
    gameSlug: string;
    categorySlug: string;
    timing: 'rt' | 'gt';
    subcategoryHash?: string;
    verified?: boolean;
    page?: number;
    pageSize?: number;
    /** filter-typed variables: { platform: 'N64', region: 'JP' } or { platform: 'N64,Wii' } */
    varFilters?: Record<string, string>;
}

function buildLeaderboardQS(q: LeaderboardQuery): string {
    const sp = new URLSearchParams();
    sp.set('timing', q.timing);
    if (q.subcategoryHash !== undefined) sp.set('subcategory', q.subcategoryHash);
    if (q.verified) sp.set('verified', 'true');
    if (q.page) sp.set('page', String(q.page));
    if (q.pageSize) sp.set('pageSize', String(q.pageSize));
    if (q.varFilters) {
        for (const [k, v] of Object.entries(q.varFilters)) {
            sp.set(`var_${k}`, v);
        }
    }
    return sp.toString();
}

export async function getLeaderboard(
    q: LeaderboardQuery,
): Promise<LeaderboardResponse> {
    'use cache';
    cacheLife('minutes');
    cacheTag(
        `lb:${q.gameSlug}:${q.categorySlug}:${q.subcategoryHash ?? ''}:${q.timing}:${q.verified ? 'v' : 'a'}`,
    );

    const game = encodeURIComponent(q.gameSlug);
    const category = encodeURIComponent(q.categorySlug);
    const path = `/leaderboards/${game}/${category}?${buildLeaderboardQS(q)}`;
    return v1Fetch<LeaderboardResponse>(path);
}

export async function getVariables(
    gameSlug: string,
    categorySlug: string,
): Promise<VariableDef[]> {
    'use cache';
    cacheLife('hours');
    cacheTag(`game-vars:${gameSlug}:${categorySlug}`);

    const path = `/v1/leaderboards/${encodeURIComponent(gameSlug)}/${encodeURIComponent(categorySlug)}/variables`;
    const body = await v1Fetch<VariablesResponse>(path);
    return body.variables ?? [];
}

export async function getWrHistory(
    gameSlug: string,
    categorySlug: string,
    subcategoryHash = '',
): Promise<WrHistoryEntry[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`wr-history:${gameSlug}:${categorySlug}:${subcategoryHash}`);

    const path = `/leaderboards/wr-history/${encodeURIComponent(gameSlug)}/${encodeURIComponent(categorySlug)}?subcategory=${encodeURIComponent(subcategoryHash)}`;
    const body = await v1Fetch<{ result: WrHistoryEntry[] }>(path);
    return body.result ?? [];
}

export async function getUserRankings(userId: number): Promise<UserRanking[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`user-rankings:${userId}`);

    const path = `/leaderboards/user/${userId}/rankings`;
    const body = await v1Fetch<{ result: UserRanking[] }>(path);
    return body.result ?? [];
}
```

- [ ] **Step 9: Run typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: PASS. If lint fails on import order or formatting, run `npm run lint-fix` and re-run.

- [ ] **Step 10: Commit**

```bash
git add types/leaderboards.ts src/lib/v1-fetch.ts src/lib/leaderboard-hash.ts src/lib/leaderboard-hash.verify.ts src/lib/games-v1.ts src/lib/leaderboards-v1.ts
git commit -m "feat(games): add v1 API data layer + subcategory hash"
```

---

## Task 2: Route Shell + URL State

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/page.tsx`
- Create: `app/(new-layout)/games-v2/[game]/data.ts`
- Create: `app/(new-layout)/games-v2/[game]/types.ts`
- Create: `app/(new-layout)/games-v2/[game]/game-page.tsx`
- Create: `app/(new-layout)/games-v2/[game]/header/game-header.tsx`
- Create: `app/(new-layout)/games-v2/[game]/header/category-pills.tsx`

**Dependencies:** Task 1 (data layer is imported here).

- [ ] **Step 1: Create page-local types**

```ts
// app/(new-layout)/games-v2/[game]/types.ts
import type {
    LeaderboardResponse,
    QuickStats,
    RecentPb,
    ResolvedCategory,
    ResolvedGame,
    UserRanking,
    VariableDef,
} from '~/types/leaderboards';

export interface GamePageSearchParams {
    category?: string;
    subcategory?: string;
    verified?: string;
    page?: string;
    pageSize?: string;
    [varKey: string]: string | undefined; // var_* keys
}

export interface GamePageData {
    game: ResolvedGame;
    selectedCategory: ResolvedCategory;
    categories: ResolvedCategory[];
    variables: VariableDef[];
    leaderboardRt: LeaderboardResponse;
    leaderboardGt: LeaderboardResponse;
    quickStats: QuickStats;
    recentPbs: RecentPb[];
    liveRunners: unknown[]; // existing live data type — narrow when wiring sidebar
    userRankings: UserRanking[] | null;
    sessionUserId: number | null;
    activeFilters: {
        subcategoryHash: string;
        verified: boolean;
        page: number;
        pageSize: number;
        varFilters: Record<string, string>;
    };
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Create the page-level data orchestrator**

```ts
// app/(new-layout)/games-v2/[game]/data.ts
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { getSession } from '~src/lib/get-session-data';
import { getQuickStats, getRecentPbs, resolveCategory, resolveGame } from '~src/lib/games-v1';
import {
    getLeaderboard,
    getUserRankings,
    getVariables,
} from '~src/lib/leaderboards-v1';
import type { GamePageData, GamePageSearchParams } from './types';

const DEFAULT_PAGE_SIZE = 25;

export async function loadGamePageData(
    slug: string,
    sp: GamePageSearchParams,
): Promise<GamePageData | null> {
    const session = await getSession();
    const sessionUserId =
        typeof session?.id === 'number'
            ? session.id
            : (session?.userId ?? null);

    const game = await resolveGame(slug);
    if (!game) return null;

    const { categories, selected } = await resolveCategory(game.id, sp.category);
    if (!selected) {
        return {
            game,
            selectedCategory: {
                id: -1,
                name: '',
                display: '',
                primaryTiming: 'rt',
            },
            categories,
            variables: [],
            leaderboardRt: emptyBoard(),
            leaderboardGt: emptyBoard(),
            quickStats: await getQuickStats(game.id),
            recentPbs: [],
            liveRunners: [],
            userRankings: null,
            sessionUserId,
            activeFilters: emptyFilters(),
        };
    }

    const subcategoryHash = sp.subcategory ?? selected.defaultSubcategoryHash ?? '';
    const verified = sp.verified === 'true';
    const page = sp.page ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;
    const pageSize = sp.pageSize
        ? Math.min(100, Math.max(1, parseInt(sp.pageSize, 10) || DEFAULT_PAGE_SIZE))
        : DEFAULT_PAGE_SIZE;
    const varFilters = extractVarFilters(sp);

    const baseQuery = {
        gameSlug: game.name,
        categorySlug: selected.name,
        subcategoryHash,
        verified,
        page,
        pageSize,
        varFilters,
    };

    const [variables, leaderboardRt, leaderboardGt, quickStats, recentPbs, userRankings] =
        await Promise.all([
            getVariables(game.name, selected.name),
            getLeaderboard({ ...baseQuery, timing: 'rt' }),
            getLeaderboard({ ...baseQuery, timing: 'gt' }),
            getQuickStats(game.id),
            getRecentPbs(game.id),
            sessionUserId ? getUserRankings(sessionUserId) : Promise.resolve(null),
        ]);

    return {
        game,
        selectedCategory: selected,
        categories,
        variables,
        leaderboardRt,
        leaderboardGt,
        quickStats,
        recentPbs,
        liveRunners: [], // wired in Task 4
        userRankings,
        sessionUserId,
        activeFilters: { subcategoryHash, verified, page, pageSize, varFilters },
    };
}

function extractVarFilters(sp: GamePageSearchParams): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(sp)) {
        if (k.startsWith('var_') && typeof v === 'string' && v.length > 0) {
            out[k.slice(4)] = v;
        }
    }
    return out;
}

function emptyBoard() {
    return {
        entries: [],
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        totalEntries: 0,
        totalPages: 0,
    };
}

function emptyFilters() {
    return {
        subcategoryHash: '',
        verified: false,
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        varFilters: {} as Record<string, string>,
    };
}
```

Note: `getSession()` shape — confirm using `getSession()` returns `User` directly (per the project's auth memory). Adjust the userId extraction if needed.

- [ ] **Step 4: Create `header/game-header.tsx`** (server component)

```tsx
// app/(new-layout)/games-v2/[game]/header/game-header.tsx
import Image from 'next/image';
import type { QuickStats, ResolvedGame } from '~/types/leaderboards';
import { DurationToFormatted } from '~src/components/util/datetime';

interface Props {
    game: ResolvedGame;
    stats: QuickStats;
}

export function GameHeader({ game, stats }: Props) {
    return (
        <header className="d-flex align-items-center gap-3 mb-3">
            {game.image && (
                <Image
                    src={game.image}
                    alt={game.display}
                    width={48}
                    height={64}
                    className="rounded"
                />
            )}
            <div>
                <h1 className="mb-0">{game.display}</h1>
                <small className="text-muted">
                    {stats.uniqueRunners.toLocaleString()} runners ·{' '}
                    <DurationToFormatted duration={stats.totalRunTime} /> total
                </small>
            </div>
        </header>
    );
}
```

- [ ] **Step 5: Create `header/category-pills.tsx`** (client component)

```tsx
// app/(new-layout)/games-v2/[game]/header/category-pills.tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type { ResolvedCategory } from '~/types/leaderboards';

interface Props {
    categories: ResolvedCategory[];
    selectedCategoryName: string;
}

export function CategoryPills({ categories, selectedCategoryName }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const onSelect = (name: string) => {
        const sp = new URLSearchParams(searchParams.toString());
        sp.set('category', name);
        sp.delete('page');
        sp.delete('subcategory');
        for (const k of Array.from(sp.keys())) if (k.startsWith('var_')) sp.delete(k);
        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`);
        });
    };

    if (categories.length <= 1) return null;

    return (
        <nav className="d-flex gap-2 flex-wrap mb-3" aria-label="Category">
            {categories.map((c) => {
                const active = c.name === selectedCategoryName;
                return (
                    <button
                        key={c.id}
                        type="button"
                        onClick={() => onSelect(c.name)}
                        disabled={isPending}
                        aria-pressed={active}
                        className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline-secondary'}`}
                    >
                        {c.display}
                    </button>
                );
            })}
        </nav>
    );
}
```

- [ ] **Step 6: Create the layout shell**

```tsx
// app/(new-layout)/games-v2/[game]/game-page.tsx
import type { GamePageData } from './types';
import { GameHeader } from './header/game-header';
import { CategoryPills } from './header/category-pills';

interface Props {
    data: GamePageData;
}

export function GamePage({ data }: Props) {
    if (data.categories.length === 0) {
        return (
            <div>
                <GameHeader game={data.game} stats={data.quickStats} />
                <p className="text-center text-muted my-5">
                    No runs uploaded for this game yet.
                </p>
            </div>
        );
    }

    return (
        <div>
            <GameHeader game={data.game} stats={data.quickStats} />
            <CategoryPills
                categories={data.categories}
                selectedCategoryName={data.selectedCategory.name}
            />
            <div className="row">
                <div className="col-lg-8">
                    {/* Filters slot — Task 5 */}
                    {/* Leaderboard slot — Task 3 */}
                    <div className="border rounded p-4 text-center text-muted">
                        Leaderboard for{' '}
                        <strong>{data.selectedCategory.display}</strong> goes here.
                    </div>
                </div>
                <div className="col-lg-4">
                    {/* Sidebar slot — Task 4 */}
                    <div className="border rounded p-4 text-center text-muted">
                        Sidebar
                    </div>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 7: Create the route entry**

```tsx
// app/(new-layout)/games-v2/[game]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { safeDecodeURI } from '~src/utils/uri';
import buildMetadata, { getGameImage } from '~src/utils/metadata';
import { loadGamePageData } from './data';
import { GamePage } from './game-page';
import type { GamePageSearchParams } from './types';

export const maxDuration = 60;

interface PageProps {
    params: Promise<{ game: string }>;
    searchParams: Promise<GamePageSearchParams>;
}

export default async function GameV2Page({ params, searchParams }: PageProps) {
    const { game } = await params;
    const sp = await searchParams;
    if (!game) notFound();

    const data = await loadGamePageData(game, sp);
    if (!data) notFound();

    return <GamePage data={data} />;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { game } = await params;
    if (!game) return buildMetadata();
    const display = safeDecodeURI(game);
    return buildMetadata({
        title: `Statistics for ${display}`,
        description: `View statistics for ${display}, including categories, top runners, total run time, and more!`,
        images: await getGameImage(display),
    });
}
```

- [ ] **Step 8: Run typecheck and build**

```bash
npm run typecheck && npm run build
```

Expected: PASS. If `getSession`/`User` shape mismatches, narrow the `sessionUserId` extraction in `data.ts` to whatever the actual return shape is (consult `src/lib/get-session-data.ts`). If the existing `~/types/leaderboards` import path doesn't resolve, check `tsconfig.json` `paths` and adjust to `~src/...` or relative.

- [ ] **Step 9: Manual browser check**

```bash
npm run dev
```

Visit:
- `http://localhost:3000/games-v2/super-mario-64` — header should render with the game name and stats; category pills should appear if there's more than one category; the leaderboard/sidebar slots show placeholder text.
- `http://localhost:3000/games-v2/this-game-does-not-exist` — should hit `notFound()` and show the standard Next.js 404 page.
- `http://localhost:3000/games-v2/super-mario-64?category=70-star` — clicking a different pill should update the URL and re-render with that category active.

Report what you saw. If the page errors, capture the server-side stack from the dev terminal.

- [ ] **Step 10: Commit**

```bash
git add app/\(new-layout\)/games-v2
git commit -m "feat(games): add /games-v2/[game] route shell with category pills"
```

---

## Task 3: Leaderboard Table (rt + gt + Pagination + Verified Toggle)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-table.tsx`
- Create: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-row.tsx`
- Create: `app/(new-layout)/games-v2/[game]/leaderboard/pagination-bar.tsx`
- Create: `app/(new-layout)/games-v2/[game]/filters/verified-toggle.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx`

**Dependencies:** Task 2.

- [ ] **Step 1: Create `leaderboard/leaderboard-row.tsx`** (server component)

```tsx
// app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-row.tsx
import type { LeaderboardEntry } from '~/types/leaderboards';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';

interface Props {
    rank: number;
    rtEntry?: LeaderboardEntry;
    gtEntry?: LeaderboardEntry;
    isCurrentUser: boolean;
    primaryTiming: 'rt' | 'gt';
}

export function LeaderboardRow({
    rank,
    rtEntry,
    gtEntry,
    isCurrentUser,
    primaryTiming,
}: Props) {
    const primary = primaryTiming === 'gt' ? gtEntry : rtEntry;
    if (!primary) return null;

    return (
        <tr className={isCurrentUser ? 'table-active' : undefined}>
            <td>{rank}</td>
            <td>
                <UserLink username={primary.runnerName} url={undefined} />
            </td>
            <td>
                {rtEntry ? <DurationToFormatted duration={rtEntry.time} /> : '—'}
            </td>
            <td>
                {gtEntry?.gameTime ? (
                    <DurationToFormatted duration={gtEntry.gameTime} />
                ) : (
                    '—'
                )}
            </td>
            <td>
                {primary.setAt
                    ? new Date(primary.setAt).toLocaleDateString()
                    : ''}
            </td>
            <td>
                {primary.vodUrl ? (
                    <a href={primary.vodUrl} target="_blank" rel="noreferrer">
                        VOD
                    </a>
                ) : null}
            </td>
            <td>
                {primary.verificationStatus === 'verified' ? '✓' : ''}
            </td>
        </tr>
    );
}
```

- [ ] **Step 2: Create `leaderboard/leaderboard-table.tsx`** (server component)

```tsx
// app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-table.tsx
import type {
    LeaderboardEntry,
    LeaderboardResponse,
    ResolvedCategory,
} from '~/types/leaderboards';
import { LeaderboardRow } from './leaderboard-row';

interface Props {
    rt: LeaderboardResponse;
    gt: LeaderboardResponse;
    category: ResolvedCategory;
    sessionUserId: number | null;
}

export function LeaderboardTable({ rt, gt, category, sessionUserId }: Props) {
    const primary = category.primaryTiming === 'gt' ? gt : rt;
    if (primary.entries.length === 0) {
        return (
            <p className="text-center text-muted my-4">
                No runs match these filters.
            </p>
        );
    }

    // Index secondary timing's entries by runId for O(1) lookup.
    const secondary = category.primaryTiming === 'gt' ? rt : gt;
    const secondaryByRunner = new Map<string, LeaderboardEntry>();
    for (const e of secondary.entries) {
        secondaryByRunner.set(keyFor(e), e);
    }

    return (
        <table className="table table-hover">
            <thead>
                <tr>
                    <th style={{ width: '6%' }}>#</th>
                    <th>Runner</th>
                    <th>Real Time</th>
                    <th>Game Time</th>
                    <th>Date</th>
                    <th>VOD</th>
                    <th>Verified</th>
                </tr>
            </thead>
            <tbody>
                {primary.entries.map((entry) => {
                    const secondaryEntry = secondaryByRunner.get(keyFor(entry));
                    const rtE = category.primaryTiming === 'gt' ? secondaryEntry : entry;
                    const gtE = category.primaryTiming === 'gt' ? entry : secondaryEntry;
                    return (
                        <LeaderboardRow
                            key={entry.runId}
                            rank={entry.rank}
                            rtEntry={rtE}
                            gtEntry={gtE}
                            isCurrentUser={
                                sessionUserId !== null &&
                                entry.userId === sessionUserId
                            }
                            primaryTiming={category.primaryTiming}
                        />
                    );
                })}
            </tbody>
        </table>
    );
}

function keyFor(e: LeaderboardEntry): string {
    return e.userId !== null && e.userId !== undefined
        ? `u:${e.userId}`
        : `g:${e.runnerName}`;
}
```

- [ ] **Step 3: Create `leaderboard/pagination-bar.tsx`** (client component)

```tsx
// app/(new-layout)/games-v2/[game]/leaderboard/pagination-bar.tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

interface Props {
    page: number;
    totalPages: number;
}

export function PaginationBar({ page, totalPages }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    if (totalPages <= 1) return null;

    const go = (p: number) => {
        const sp = new URLSearchParams(searchParams.toString());
        if (p === 1) sp.delete('page');
        else sp.set('page', String(p));
        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`);
        });
    };

    const windowed = pageWindow(page, totalPages, 5);

    return (
        <nav aria-label="Leaderboard pages" className="d-flex gap-1 justify-content-center">
            <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page === 1 || isPending}
                onClick={() => go(page - 1)}
            >
                Prev
            </button>
            {windowed.map((p) => (
                <button
                    key={p}
                    type="button"
                    onClick={() => go(p)}
                    disabled={isPending}
                    aria-current={p === page ? 'page' : undefined}
                    className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline-secondary'}`}
                >
                    {p}
                </button>
            ))}
            <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= totalPages || isPending}
                onClick={() => go(page + 1)}
            >
                Next
            </button>
        </nav>
    );
}

function pageWindow(current: number, total: number, size: number): number[] {
    const half = Math.floor(size / 2);
    let start = Math.max(1, current - half);
    const end = Math.min(total, start + size - 1);
    start = Math.max(1, end - size + 1);
    const out: number[] = [];
    for (let i = start; i <= end; i++) out.push(i);
    return out;
}
```

- [ ] **Step 4: Create `filters/verified-toggle.tsx`** (client component)

```tsx
// app/(new-layout)/games-v2/[game]/filters/verified-toggle.tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

interface Props {
    verified: boolean;
}

export function VerifiedToggle({ verified }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const onChange = (next: boolean) => {
        const sp = new URLSearchParams(searchParams.toString());
        if (next) sp.set('verified', 'true');
        else sp.delete('verified');
        sp.delete('page');
        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`);
        });
    };

    return (
        <label className="d-flex align-items-center gap-2 mb-3">
            <input
                type="checkbox"
                checked={verified}
                disabled={isPending}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span>Verified runs only</span>
        </label>
    );
}
```

- [ ] **Step 5: Wire into `game-page.tsx`** — replace the placeholder leaderboard slot

```tsx
// app/(new-layout)/games-v2/[game]/game-page.tsx
import type { GamePageData } from './types';
import { CategoryPills } from './header/category-pills';
import { GameHeader } from './header/game-header';
import { VerifiedToggle } from './filters/verified-toggle';
import { LeaderboardTable } from './leaderboard/leaderboard-table';
import { PaginationBar } from './leaderboard/pagination-bar';

interface Props {
    data: GamePageData;
}

export function GamePage({ data }: Props) {
    if (data.categories.length === 0) {
        return (
            <div>
                <GameHeader game={data.game} stats={data.quickStats} />
                <p className="text-center text-muted my-5">
                    No runs uploaded for this game yet.
                </p>
            </div>
        );
    }

    return (
        <div>
            <GameHeader game={data.game} stats={data.quickStats} />
            <CategoryPills
                categories={data.categories}
                selectedCategoryName={data.selectedCategory.name}
            />
            <div className="row">
                <div className="col-lg-8">
                    <VerifiedToggle verified={data.activeFilters.verified} />
                    <LeaderboardTable
                        rt={data.leaderboardRt}
                        gt={data.leaderboardGt}
                        category={data.selectedCategory}
                        sessionUserId={data.sessionUserId}
                    />
                    <PaginationBar
                        page={
                            data.selectedCategory.primaryTiming === 'gt'
                                ? data.leaderboardGt.page
                                : data.leaderboardRt.page
                        }
                        totalPages={
                            data.selectedCategory.primaryTiming === 'gt'
                                ? data.leaderboardGt.totalPages
                                : data.leaderboardRt.totalPages
                        }
                    />
                </div>
                <div className="col-lg-4">
                    <div className="border rounded p-4 text-center text-muted">
                        Sidebar
                    </div>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 6: Run typecheck and build**

```bash
npm run typecheck && npm run build
```

Expected: PASS. If the leaderboard endpoint response shape (`{entries, page, pageSize, totalEntries, totalPages}`) doesn't match what the backend actually returns, adjust `LeaderboardResponse` in `types/leaderboards.ts` and the consumers in `getLeaderboard` / `LeaderboardTable` / `PaginationBar`. Note the actual shape in a comment for the PR description.

- [ ] **Step 7: Manual browser check**

```bash
npm run dev
```

Visit `http://localhost:3000/games-v2/super-mario-64`. Verify:
- Leaderboard table renders with rt + gt columns side-by-side.
- Verified toggle changes the URL to `?verified=true` and the page re-renders with verified-only data.
- Pagination clicking page 2 navigates to `?page=2` and shows the next page of results.
- Category pill change resets `?page` and reloads the board.

Cross-check at least one row's rank + time visually against the backend (e.g., `curl ${NEXT_PUBLIC_DATA_URL}/leaderboards/super-mario-64/70-star?timing=rt&pageSize=5 | jq`).

- [ ] **Step 8: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/leaderboard app/\(new-layout\)/games-v2/\[game\]/filters/verified-toggle.tsx app/\(new-layout\)/games-v2/\[game\]/game-page.tsx
git commit -m "feat(games): leaderboard table with rt+gt, pagination, verified toggle"
```

---

## Task 4: Sidebar Panels

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/sidebar/sidebar.tsx`
- Create: `app/(new-layout)/games-v2/[game]/sidebar/wr-card.tsx`
- Create: `app/(new-layout)/games-v2/[game]/sidebar/live-panel.tsx`
- Create: `app/(new-layout)/games-v2/[game]/sidebar/recent-pbs-panel.tsx`
- Create: `app/(new-layout)/games-v2/[game]/sidebar/quick-stats-panel.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/data.ts` (wire up `liveRunners`)
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx` (replace sidebar placeholder)

**Dependencies:** Task 3.

- [ ] **Step 1: Find the existing live-runs source for filtering by game**

```bash
grep -rn "live-runs\|LiveRunsForGame" /home/joey/therun/therun-fr/src/lib /home/joey/therun/therun-fr/src/components/game/live-runs-for-game.tsx | head
```

The current page uses `LiveRunsForGame` (`src/components/game/live-runs-for-game.tsx`) which fetches via SWR client-side. For the sidebar's compact panel we want a server-fetched snapshot. If `src/lib/live-runs.ts` exposes a server-callable fetcher, use it. Otherwise, the simplest server-side approach is `apiFetch<{ live: LiveRun[] }>('/live')` (or whatever the existing endpoint is) and then filter to runs whose game matches `game.display`. Pick the path that matches existing conventions and document it briefly in the PR description.

- [ ] **Step 2: Create `sidebar/wr-card.tsx`** (server component)

```tsx
// app/(new-layout)/games-v2/[game]/sidebar/wr-card.tsx
import type { LeaderboardResponse, ResolvedCategory } from '~/types/leaderboards';
import { DurationToFormatted } from '~src/components/util/datetime';
import { UserLink } from '~src/components/links/links';

interface Props {
    rt: LeaderboardResponse;
    gt: LeaderboardResponse;
    category: ResolvedCategory;
}

export function WrCard({ rt, gt, category }: Props) {
    const primary = category.primaryTiming === 'gt' ? gt : rt;
    const top = primary.entries[0];
    if (!top) return null;

    const time =
        category.primaryTiming === 'gt' ? top.gameTime ?? top.time : top.time;

    return (
        <section className="border rounded p-3 mb-3">
            <small className="text-muted d-block">World Record</small>
            <div className="fs-4 fw-bold">
                <DurationToFormatted duration={time} />
            </div>
            <div>
                <UserLink username={top.runnerName} url={undefined} />
            </div>
            <small className="text-muted">
                Set {new Date(top.setAt).toLocaleDateString()}
            </small>
            {top.vodUrl && (
                <div className="mt-2">
                    <a href={top.vodUrl} target="_blank" rel="noreferrer">
                        Watch VOD
                    </a>
                </div>
            )}
        </section>
    );
}
```

- [ ] **Step 3: Create `sidebar/live-panel.tsx`** (server component, drawer button is client in Task 6)

```tsx
// app/(new-layout)/games-v2/[game]/sidebar/live-panel.tsx
interface LiveRunner {
    username: string;
    game?: string;
    category?: string;
    streamUrl?: string;
}

interface Props {
    runners: LiveRunner[];
}

export function LivePanel({ runners }: Props) {
    if (runners.length === 0) {
        return (
            <section className="border rounded p-3 mb-3">
                <small className="text-muted d-block mb-2">Live now</small>
                <p className="text-muted mb-0">No one is live for this game right now.</p>
            </section>
        );
    }

    const top = runners.slice(0, 5);
    return (
        <section className="border rounded p-3 mb-3">
            <div className="d-flex justify-content-between align-items-baseline mb-2">
                <small className="text-muted">Live now</small>
                {runners.length > 5 && (
                    <small>
                        <a href="#live-drawer">View all ({runners.length})</a>
                    </small>
                )}
            </div>
            <ul className="list-unstyled mb-0">
                {top.map((r) => (
                    <li key={r.username} className="d-flex justify-content-between">
                        <span>{r.username}</span>
                        {r.category && <small className="text-muted">{r.category}</small>}
                    </li>
                ))}
            </ul>
        </section>
    );
}
```

The `href="#live-drawer"` is a stub link — Task 6 replaces it with the drawer trigger.

- [ ] **Step 4: Create `sidebar/recent-pbs-panel.tsx`** (server component)

```tsx
// app/(new-layout)/games-v2/[game]/sidebar/recent-pbs-panel.tsx
import type { RecentPb } from '~/types/leaderboards';
import { DurationToFormatted } from '~src/components/util/datetime';
import { UserLink } from '~src/components/links/links';

interface Props {
    pbs: RecentPb[];
}

export function RecentPbsPanel({ pbs }: Props) {
    if (pbs.length === 0) {
        return (
            <section className="border rounded p-3 mb-3">
                <small className="text-muted d-block mb-2">Recent PBs</small>
                <p className="text-muted mb-0">No recent PBs.</p>
            </section>
        );
    }

    return (
        <section className="border rounded p-3 mb-3">
            <small className="text-muted d-block mb-2">Recent PBs</small>
            <ul className="list-unstyled mb-0">
                {pbs.slice(0, 5).map((p) => (
                    <li
                        key={p.id}
                        className="d-flex justify-content-between align-items-baseline"
                    >
                        <UserLink username={p.username} url={undefined} />
                        <span>
                            <DurationToFormatted duration={p.time} />{' '}
                            <small className="text-muted">{p.category}</small>
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
```

- [ ] **Step 5: Create `sidebar/quick-stats-panel.tsx`** (server component)

```tsx
// app/(new-layout)/games-v2/[game]/sidebar/quick-stats-panel.tsx
import type { QuickStats } from '~/types/leaderboards';
import { DurationToFormatted } from '~src/components/util/datetime';

interface Props {
    stats: QuickStats;
}

export function QuickStatsPanel({ stats }: Props) {
    return (
        <section className="border rounded p-3 mb-3">
            <small className="text-muted d-block mb-2">Quick stats</small>
            <dl className="row mb-0 small">
                <dt className="col-7">Runners</dt>
                <dd className="col-5 text-end">
                    {stats.uniqueRunners.toLocaleString()}
                </dd>
                <dt className="col-7">Total run time</dt>
                <dd className="col-5 text-end">
                    <DurationToFormatted duration={stats.totalRunTime} />
                </dd>
                <dt className="col-7">Total attempts</dt>
                <dd className="col-5 text-end">
                    {stats.totalAttemptCount.toLocaleString()}
                </dd>
                <dt className="col-7">Finished attempts</dt>
                <dd className="col-5 text-end">
                    {stats.totalFinishedAttemptCount.toLocaleString()}
                </dd>
            </dl>
        </section>
    );
}
```

- [ ] **Step 6: Create `sidebar/sidebar.tsx`** (server component)

```tsx
// app/(new-layout)/games-v2/[game]/sidebar/sidebar.tsx
import type { GamePageData } from '../types';
import { LivePanel } from './live-panel';
import { QuickStatsPanel } from './quick-stats-panel';
import { RecentPbsPanel } from './recent-pbs-panel';
import { WrCard } from './wr-card';

interface LiveRunner {
    username: string;
    game?: string;
    category?: string;
    streamUrl?: string;
}

interface Props {
    data: GamePageData;
}

export function Sidebar({ data }: Props) {
    const liveRunners = data.liveRunners as LiveRunner[];
    return (
        <>
            <WrCard
                rt={data.leaderboardRt}
                gt={data.leaderboardGt}
                category={data.selectedCategory}
            />
            <LivePanel runners={liveRunners} />
            <RecentPbsPanel pbs={data.recentPbs} />
            <QuickStatsPanel stats={data.quickStats} />
        </>
    );
}
```

- [ ] **Step 7: Wire `liveRunners` in `data.ts`**

Add a server-side fetch for live runners filtered to the game. The exact code depends on what Step 1 turned up. The pattern (replacing the empty array literal in the `data.ts` return):

```ts
// in data.ts, replace:
//     liveRunners: [], // wired in Task 4
// with the result of a server fetch like:

import { getLiveRunnersForGame } from '~src/lib/games-v1';
// ...
const liveRunners = await getLiveRunnersForGame(game.display);
```

If `getLiveRunnersForGame` doesn't exist yet, add it to `src/lib/games-v1.ts`:

```ts
export async function getLiveRunnersForGame(gameDisplay: string) {
    // Not cached: live data must be fresh.
    const path = `/live`; // adjust to actual endpoint
    const body = await v1Fetch<{ result: Array<{ username: string; game?: string; category?: string }> }>(path);
    return (body.result ?? []).filter(
        (r) => r.game?.toLowerCase() === gameDisplay.toLowerCase(),
    );
}
```

Confirm the actual live endpoint path and response shape from existing FE code (`src/lib/live-runs.ts` if it exists, or how `LiveRunsForGame` fetches today). Prefer reusing whatever helper already exists.

- [ ] **Step 8: Wire `<Sidebar>` into `game-page.tsx`**

Replace the placeholder in `game-page.tsx`:

```tsx
// at top of game-page.tsx
import { Sidebar } from './sidebar/sidebar';

// in the <div className="col-lg-4">, replace the placeholder div with:
<Sidebar data={data} />
```

- [ ] **Step 9: Run typecheck and build**

```bash
npm run typecheck && npm run build
```

Expected: PASS.

- [ ] **Step 10: Manual browser check**

```bash
npm run dev
```

Visit `http://localhost:3000/games-v2/super-mario-64`. Verify:
- WR card shows the #1 runner from the active board.
- Live panel shows runners (or "No one is live" if none).
- Recent PBs shows up to 5 entries.
- Quick stats shows numeric values consistent with backend.

If any single panel fails, the rest should still render. Confirm by temporarily breaking the URL for one fetch (e.g., misspell the path) and reloading — the broken panel should show its empty/error state, not the whole page.

- [ ] **Step 11: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/sidebar app/\(new-layout\)/games-v2/\[game\]/data.ts app/\(new-layout\)/games-v2/\[game\]/game-page.tsx src/lib/games-v1.ts
git commit -m "feat(games): sidebar with WR card, live, recent PBs, quick stats"
```

---

## Task 5: Filter Pills (Subcategory + Variables)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/filters/filter-bar.tsx`
- Create: `app/(new-layout)/games-v2/[game]/filters/subcategory-pills.tsx`
- Create: `app/(new-layout)/games-v2/[game]/filters/variable-pill.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx`

**Dependencies:** Task 3 (uses `verified-toggle`), Task 4. **GATED on backend dep #1**: confirm `/v1/leaderboards/{game}/{category}/variables` returns the subcategory/filter classification (look for a `kind`, `classification`, or similar field). If still pending, this task can be partially built (treating all variables as filters) and unblocked when backend lands the field.

- [ ] **Step 1: Confirm backend dep #1**

```bash
curl "${NEXT_PUBLIC_DATA_URL}/v1/leaderboards/super-mario-64/70-star/variables" | jq
```

Inspect the response. Each variable should have either:
- A `kind` field (`"subcategory"` or `"filter"`), or
- A `type` field whose values are `"subcategory"` / `"filter"` (different from the input-style `"select"` documented earlier), or
- Some other classification field.

Update `VariableDef` in `types/leaderboards.ts` to match the actual field name. If no classification is exposed, document this in the PR and stop here — proceed only after the backend lands it.

- [ ] **Step 2: Create `filters/subcategory-pills.tsx`** (client component)

```tsx
// app/(new-layout)/games-v2/[game]/filters/subcategory-pills.tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type { VariableDef } from '~/types/leaderboards';
import { computeSubcategoryHash } from '~src/lib/leaderboard-hash';

interface Props {
    defs: VariableDef[];
    selected: Record<string, string>; // current values from URL or defaults
}

export function SubcategoryPills({ defs, selected }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const subcatDefs = defs.filter((d) => d.kind === 'subcategory');
    if (subcatDefs.length === 0) return null;

    const onPick = (def: VariableDef, value: string) => {
        const next = { ...selected, [def.name]: value };
        const hash = computeSubcategoryHash(defs, next);
        const sp = new URLSearchParams(searchParams.toString());
        if (hash) sp.set('subcategory', hash);
        else sp.delete('subcategory');
        sp.delete('page');
        // Persist the variable selection too so the UI can show what's active.
        sp.set(`subvar_${def.name}`, value);
        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`);
        });
    };

    return (
        <div className="d-flex flex-column gap-2 mb-3">
            {subcatDefs.map((def) => (
                <div key={def.name} className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="small text-muted">{def.display}:</span>
                    {def.values.map((v) => {
                        const isActive = (selected[def.name] ?? def.defaultValue) === v;
                        return (
                            <button
                                key={v}
                                type="button"
                                onClick={() => onPick(def, v)}
                                disabled={isPending}
                                aria-pressed={isActive}
                                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-secondary'}`}
                            >
                                {v}
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
```

Note the URL convention: `subvar_<name>` carries the user's current subcategory variable selection (so the UI can highlight the active pill); `subcategory=<hash>` carries the hash the backend uses. Both are derived in tandem.

- [ ] **Step 3: Create `filters/variable-pill.tsx`** (client component)

```tsx
// app/(new-layout)/games-v2/[game]/filters/variable-pill.tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { VariableDef } from '~/types/leaderboards';

interface Props {
    def: VariableDef;
    selectedValues: string[]; // from ?var_<name>=...
}

export function VariablePill({ def, selectedValues }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);

    const setValues = (next: string[]) => {
        const sp = new URLSearchParams(searchParams.toString());
        if (next.length === 0) sp.delete(`var_${def.name}`);
        else sp.set(`var_${def.name}`, next.join(','));
        sp.delete('page');
        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`);
        });
    };

    const toggle = (v: string) => {
        const has = selectedValues.includes(v);
        setValues(has ? selectedValues.filter((x) => x !== v) : [...selectedValues, v]);
    };

    const label =
        selectedValues.length === 0
            ? def.display
            : `${def.display}: ${selectedValues.join(', ')}`;

    return (
        <div className="position-relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                disabled={isPending}
                className={`btn btn-sm ${selectedValues.length > 0 ? 'btn-primary' : 'btn-outline-secondary'}`}
            >
                {label}
            </button>
            {open && (
                <div
                    role="dialog"
                    className="position-absolute mt-1 p-2 border rounded bg-body shadow-sm"
                    style={{ zIndex: 10, minWidth: '12rem' }}
                >
                    {def.values.map((v) => (
                        <label key={v} className="d-block">
                            <input
                                type="checkbox"
                                checked={selectedValues.includes(v)}
                                onChange={() => toggle(v)}
                                className="me-1"
                            />
                            {v}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 4: Create `filters/filter-bar.tsx`** (server component composing the pieces)

```tsx
// app/(new-layout)/games-v2/[game]/filters/filter-bar.tsx
import type { VariableDef } from '~/types/leaderboards';
import { SubcategoryPills } from './subcategory-pills';
import { VariablePill } from './variable-pill';
import { VerifiedToggle } from './verified-toggle';

interface Props {
    defs: VariableDef[];
    selectedSubcategoryValues: Record<string, string>;
    selectedVarFilters: Record<string, string>;
    verified: boolean;
}

export function FilterBar({
    defs,
    selectedSubcategoryValues,
    selectedVarFilters,
    verified,
}: Props) {
    const filterDefs = defs.filter((d) => d.kind === 'filter');

    return (
        <div className="mb-3">
            <SubcategoryPills defs={defs} selected={selectedSubcategoryValues} />
            {filterDefs.length > 0 && (
                <div className="d-flex gap-2 flex-wrap mb-2">
                    {filterDefs.map((def) => (
                        <VariablePill
                            key={def.name}
                            def={def}
                            selectedValues={
                                selectedVarFilters[def.name]?.split(',').filter(Boolean) ?? []
                            }
                        />
                    ))}
                </div>
            )}
            <VerifiedToggle verified={verified} />
        </div>
    );
}
```

- [ ] **Step 5: Extract subcategory variable selections from search params in `data.ts`**

Add to `data.ts`:

```ts
function extractSubcategoryValues(sp: GamePageSearchParams): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(sp)) {
        if (k.startsWith('subvar_') && typeof v === 'string' && v.length > 0) {
            out[k.slice(7)] = v;
        }
    }
    return out;
}
```

Add `selectedSubcategoryValues: extractSubcategoryValues(sp)` to the `activeFilters` object in `loadGamePageData` (and to `GamePageData['activeFilters']` in `types.ts`).

- [ ] **Step 6: Wire `<FilterBar>` into `game-page.tsx`**

Replace the standalone `<VerifiedToggle>` (added in Task 3) with:

```tsx
import { FilterBar } from './filters/filter-bar';

// inside the col-lg-8, before <LeaderboardTable>:
<FilterBar
    defs={data.variables}
    selectedSubcategoryValues={data.activeFilters.selectedSubcategoryValues}
    selectedVarFilters={data.activeFilters.varFilters}
    verified={data.activeFilters.verified}
/>
```

Remove the standalone `<VerifiedToggle>` import — it's now nested inside `<FilterBar>`.

- [ ] **Step 7: Run typecheck and build**

```bash
npm run typecheck && npm run build
```

Expected: PASS.

- [ ] **Step 8: Manual browser check**

```bash
npm run dev
```

Visit a game with subcategory variables (ask backend for one or check the variables endpoint). Verify:
- Subcategory pills render and clicking one updates `?subcategory=<hash>` and `?subvar_<name>=<value>` in the URL.
- The leaderboard re-fetches with the new hash.
- Filter pills (filter-typed variables) toggle `?var_<name>=<value,value>` and update the board.
- Verified toggle still works.
- "Clear filters" — for now there's no explicit button; clearing happens by category change. (The empty-state "Clear filters" button is added in a follow-up if the empty state shows up; otherwise leave for a later PR.)

- [ ] **Step 9: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/filters app/\(new-layout\)/games-v2/\[game\]/data.ts app/\(new-layout\)/games-v2/\[game\]/types.ts app/\(new-layout\)/games-v2/\[game\]/game-page.tsx
git commit -m "feat(games): subcategory + variable filter pills"
```

---

## Task 6: Drawers (Live Grid + WR History)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/drawers/live-drawer.tsx`
- Create: `app/(new-layout)/games-v2/[game]/drawers/wr-history-drawer.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/sidebar/live-panel.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/sidebar/wr-card.tsx`

**Dependencies:** Task 4.

- [ ] **Step 1: Create `drawers/live-drawer.tsx`** (client, lazy)

```tsx
// app/(new-layout)/games-v2/[game]/drawers/live-drawer.tsx
'use client';

import { Modal } from 'react-bootstrap';

interface LiveRunner {
    username: string;
    game?: string;
    category?: string;
    streamUrl?: string;
}

interface Props {
    show: boolean;
    onHide: () => void;
    runners: LiveRunner[];
}

export function LiveDrawer({ show, onHide, runners }: Props) {
    return (
        <Modal show={show} onHide={onHide} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Live runners</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {runners.length === 0 ? (
                    <p className="text-muted">No one is live for this game.</p>
                ) : (
                    <ul className="list-unstyled">
                        {runners.map((r) => (
                            <li
                                key={r.username}
                                className="d-flex justify-content-between align-items-baseline py-2 border-bottom"
                            >
                                <strong>{r.username}</strong>
                                <span>
                                    {r.category && (
                                        <small className="text-muted">{r.category}</small>
                                    )}
                                    {r.streamUrl && (
                                        <a
                                            href={r.streamUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="ms-2"
                                        >
                                            Watch
                                        </a>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </Modal.Body>
        </Modal>
    );
}
```

- [ ] **Step 2: Convert `live-panel.tsx` to a client component that owns drawer state**

```tsx
// app/(new-layout)/games-v2/[game]/sidebar/live-panel.tsx
'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const LiveDrawer = dynamic(
    () => import('../drawers/live-drawer').then((m) => m.LiveDrawer),
    { ssr: false },
);

interface LiveRunner {
    username: string;
    game?: string;
    category?: string;
    streamUrl?: string;
}

interface Props {
    runners: LiveRunner[];
}

export function LivePanel({ runners }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <section className="border rounded p-3 mb-3">
            <div className="d-flex justify-content-between align-items-baseline mb-2">
                <small className="text-muted">Live now</small>
                {runners.length > 5 && (
                    <button
                        type="button"
                        className="btn btn-link btn-sm p-0"
                        onClick={() => setOpen(true)}
                    >
                        View all ({runners.length})
                    </button>
                )}
            </div>
            {runners.length === 0 ? (
                <p className="text-muted mb-0">No one is live for this game right now.</p>
            ) : (
                <ul className="list-unstyled mb-0">
                    {runners.slice(0, 5).map((r) => (
                        <li key={r.username} className="d-flex justify-content-between">
                            <span>{r.username}</span>
                            {r.category && <small className="text-muted">{r.category}</small>}
                        </li>
                    ))}
                </ul>
            )}
            {open && <LiveDrawer show={open} onHide={() => setOpen(false)} runners={runners} />}
        </section>
    );
}
```

- [ ] **Step 3: Create `drawers/wr-history-drawer.tsx`** (client, lazy)

```tsx
// app/(new-layout)/games-v2/[game]/drawers/wr-history-drawer.tsx
'use client';

import { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import Switch from 'react-switch';
import WrHistory from '~src/components/tournament/wr-history';
import WrHistoryTableMode from '~src/components/game/wr-history-table-mode';

interface Props {
    show: boolean;
    onHide: () => void;
    gameSlug: string;
    categorySlug: string;
    subcategoryHash: string;
}

export function WrHistoryDrawer({
    show,
    onHide,
    gameSlug,
    categorySlug,
    subcategoryHash,
}: Props) {
    const [history, setHistory] = useState<unknown[] | null>(null);
    const [visualMode, setVisualMode] = useState(true);

    useEffect(() => {
        if (!show) return;
        let cancelled = false;
        const url = `/leaderboards/wr-history/${encodeURIComponent(gameSlug)}/${encodeURIComponent(categorySlug)}?subcategory=${encodeURIComponent(subcategoryHash)}`;
        fetch(`${process.env.NEXT_PUBLIC_DATA_URL}${url}`)
            .then((r) => r.json())
            .then((j) => {
                if (!cancelled) setHistory(j.result ?? []);
            });
        return () => {
            cancelled = true;
        };
    }, [show, gameSlug, categorySlug, subcategoryHash]);

    return (
        <Modal show={show} onHide={onHide} size="xl">
            <Modal.Header closeButton>
                <Modal.Title>World record history</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="d-flex align-items-center gap-2 mb-3">
                    <span>Data mode</span>
                    <Switch
                        onChange={setVisualMode}
                        checked={visualMode}
                        checkedIcon={false}
                        uncheckedIcon={false}
                    />
                    <span>Visual mode</span>
                </div>
                {history === null ? (
                    <p className="text-muted">Loading…</p>
                ) : visualMode ? (
                    <WrHistory historyData={history} />
                ) : (
                    <WrHistoryTableMode historyData={history} />
                )}
            </Modal.Body>
        </Modal>
    );
}
```

If the existing `WrHistory` and `WrHistoryTableMode` components expect a specific data shape, adapt the `setHistory` call (or the fetch's `.then`) to match. Read those components' props in `src/components/tournament/wr-history.tsx` and `src/components/game/wr-history-table-mode.tsx` and align.

- [ ] **Step 4: Convert `wr-card.tsx` to a client component that owns drawer state**

```tsx
// app/(new-layout)/games-v2/[game]/sidebar/wr-card.tsx
'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { LeaderboardResponse, ResolvedCategory, ResolvedGame } from '~/types/leaderboards';
import { DurationToFormatted } from '~src/components/util/datetime';
import { UserLink } from '~src/components/links/links';

const WrHistoryDrawer = dynamic(
    () => import('../drawers/wr-history-drawer').then((m) => m.WrHistoryDrawer),
    { ssr: false },
);

interface Props {
    rt: LeaderboardResponse;
    gt: LeaderboardResponse;
    category: ResolvedCategory;
    game: ResolvedGame;
    subcategoryHash: string;
}

export function WrCard({ rt, gt, category, game, subcategoryHash }: Props) {
    const [open, setOpen] = useState(false);
    const primary = category.primaryTiming === 'gt' ? gt : rt;
    const top = primary.entries[0];
    if (!top) return null;

    const time = category.primaryTiming === 'gt' ? top.gameTime ?? top.time : top.time;

    return (
        <section className="border rounded p-3 mb-3">
            <div className="d-flex justify-content-between align-items-baseline">
                <small className="text-muted">World Record</small>
                <button
                    type="button"
                    className="btn btn-link btn-sm p-0"
                    onClick={() => setOpen(true)}
                >
                    History
                </button>
            </div>
            <div className="fs-4 fw-bold">
                <DurationToFormatted duration={time} />
            </div>
            <div>
                <UserLink username={top.runnerName} url={undefined} />
            </div>
            <small className="text-muted">
                Set {new Date(top.setAt).toLocaleDateString()}
            </small>
            {top.vodUrl && (
                <div className="mt-2">
                    <a href={top.vodUrl} target="_blank" rel="noreferrer">
                        Watch VOD
                    </a>
                </div>
            )}
            {open && (
                <WrHistoryDrawer
                    show={open}
                    onHide={() => setOpen(false)}
                    gameSlug={game.name}
                    categorySlug={category.name}
                    subcategoryHash={subcategoryHash}
                />
            )}
        </section>
    );
}
```

- [ ] **Step 5: Update `sidebar.tsx` to pass `game` and `subcategoryHash` to `<WrCard>`**

```tsx
// app/(new-layout)/games-v2/[game]/sidebar/sidebar.tsx
import type { GamePageData } from '../types';
import { LivePanel } from './live-panel';
import { QuickStatsPanel } from './quick-stats-panel';
import { RecentPbsPanel } from './recent-pbs-panel';
import { WrCard } from './wr-card';

interface LiveRunner {
    username: string;
    game?: string;
    category?: string;
    streamUrl?: string;
}

interface Props {
    data: GamePageData;
}

export function Sidebar({ data }: Props) {
    const liveRunners = data.liveRunners as LiveRunner[];
    return (
        <>
            <WrCard
                game={data.game}
                category={data.selectedCategory}
                rt={data.leaderboardRt}
                gt={data.leaderboardGt}
                subcategoryHash={data.activeFilters.subcategoryHash}
            />
            <LivePanel runners={liveRunners} />
            <RecentPbsPanel pbs={data.recentPbs} />
            <QuickStatsPanel stats={data.quickStats} />
        </>
    );
}
```

- [ ] **Step 6: Run typecheck and build**

```bash
npm run typecheck && npm run build
```

Expected: PASS.

- [ ] **Step 7: Manual browser check**

```bash
npm run dev
```

Visit `http://localhost:3000/games-v2/super-mario-64`. Verify:
- "View all" on the Live panel opens the live drawer.
- "History" on the WR card opens the WR history drawer.
- Both drawers close cleanly.
- The WR history drawer renders both visual + table modes via the toggle.
- Drawers don't load their bundles until first opened (check DevTools network tab — the dynamic chunks should appear on click).

- [ ] **Step 8: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/drawers app/\(new-layout\)/games-v2/\[game\]/sidebar
git commit -m "feat(games): live runners and WR history drawers"
```

---

## Task 7: Jump-to-My-Rank

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/leaderboard/jump-to-rank-button.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/data.ts` (compute `userTargetPage`)
- Modify: `app/(new-layout)/games-v2/[game]/types.ts` (add `userTargetPage`)
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx` (mount button)
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-row.tsx` (already highlights via `isCurrentUser`; verify)

**Dependencies:** Task 3.

- [ ] **Step 1: Add `userTargetPage` to `GamePageData` in `types.ts`**

```ts
// types.ts — add to GamePageData
userTargetPage: { page: number; rank: number } | null;
```

- [ ] **Step 2: Compute `userTargetPage` in `data.ts`**

After awaiting `userRankings`, add:

```ts
let userTargetPage: { page: number; rank: number } | null = null;
if (sessionUserId !== null && userRankings) {
    const match = userRankings.find(
        (r) =>
            r.gameId === game.id &&
            r.categoryId === selected.id &&
            r.subcategoryHash === subcategoryHash &&
            r.timing === selected.primaryTiming,
    );
    if (match) {
        const targetPage = Math.ceil(match.rank / pageSize);
        if (targetPage !== page) {
            userTargetPage = { page: targetPage, rank: match.rank };
        }
    }
}
```

Then add `userTargetPage` to the returned object.

- [ ] **Step 3: Create `leaderboard/jump-to-rank-button.tsx`** (client component)

```tsx
// app/(new-layout)/games-v2/[game]/leaderboard/jump-to-rank-button.tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

interface Props {
    targetPage: number;
    rank: number;
}

export function JumpToRankButton({ targetPage, rank }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const onClick = () => {
        const sp = new URLSearchParams(searchParams.toString());
        if (targetPage === 1) sp.delete('page');
        else sp.set('page', String(targetPage));
        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`);
        });
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isPending}
            className="btn btn-sm btn-outline-primary mb-3"
        >
            Jump to my rank (#{rank})
        </button>
    );
}
```

- [ ] **Step 4: Mount the button in `game-page.tsx`**

In the col-lg-8 container, just before `<LeaderboardTable>`:

```tsx
{data.userTargetPage && (
    <JumpToRankButton
        targetPage={data.userTargetPage.page}
        rank={data.userTargetPage.rank}
    />
)}
```

Add the import:

```tsx
import { JumpToRankButton } from './leaderboard/jump-to-rank-button';
```

- [ ] **Step 5: Verify the row highlight**

Open `leaderboard-row.tsx` and confirm:

```tsx
<tr className={isCurrentUser ? 'table-active' : undefined}>
```

If you want a stronger visual treatment than `table-active`, swap for a custom class — but `table-active` is the existing react-bootstrap idiom and a reasonable default.

- [ ] **Step 6: Run typecheck and build**

```bash
npm run typecheck && npm run build
```

Expected: PASS.

- [ ] **Step 7: Manual browser check**

```bash
npm run dev
```

Log in with a Twitch account that has at least one PB on a game. Visit that game's `/games-v2/[game]` page. Verify:
- If your PB is on page 1, your row is highlighted; no Jump button.
- If your PB is on a later page, the Jump button shows above the table; clicking it navigates to that page; your row is highlighted on arrival.
- Logged-out: no highlight, no button.

- [ ] **Step 8: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/leaderboard/jump-to-rank-button.tsx app/\(new-layout\)/games-v2/\[game\]/data.ts app/\(new-layout\)/games-v2/\[game\]/types.ts app/\(new-layout\)/games-v2/\[game\]/game-page.tsx
git commit -m "feat(games): jump-to-my-rank affordance + current-user highlight"
```

---

## Task 8: Cutover

**Files:**
- Modify: `app/(new-layout)/games/[game]/page.tsx` (replace with redirect)
- Modify: `src/lib/sitemap.ts` (point at canonical URLs after redirect)
- Optionally remove: `app/(new-layout)/games/[game]/game.tsx`, `game-header.component.tsx`, `game-filter.component.tsx`, `game.context.ts`, `game.types.ts`

**Dependencies:** Tasks 1–7. **Do not run this task until the new page has been smoke-tested by a human on real games for several days.**

- [ ] **Step 1: Replace the old page with a redirect**

```tsx
// app/(new-layout)/games/[game]/page.tsx
import type { Metadata } from 'next';
import { redirect, RedirectType } from 'next/navigation';
import { safeDecodeURI } from '~src/utils/uri';
import buildMetadata, { getGameImage } from '~src/utils/metadata';

export const maxDuration = 60;

interface PageProps {
    params: Promise<{ game: string }>;
    searchParams: Promise<Record<string, string | undefined>>;
}

export default async function GamePage({ params, searchParams }: PageProps) {
    const { game } = await params;
    const sp = await searchParams;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
        if (typeof v === 'string') qs.set(k, v);
    }
    const target = qs.toString()
        ? `/games-v2/${game}?${qs.toString()}`
        : `/games-v2/${game}`;
    redirect(target, RedirectType.replace);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { game } = await params;
    if (!game) return buildMetadata();
    const display = safeDecodeURI(game);
    return buildMetadata({
        title: `Statistics for ${display}`,
        description: `View statistics for ${display}, including categories, top runners, total run time, and more!`,
        images: await getGameImage(display),
    });
}
```

This replaces the old `Game` component import with an unconditional redirect. Old query params (e.g. anything legacy clients might pass) are forwarded.

- [ ] **Step 2: Update sitemap**

Open `src/lib/sitemap.ts`, find any URL construction for `/games/${gameName}`, and change to `/games-v2/${gameName}`. (After the redirect cleanup in a follow-up PR, the URL becomes `/games/...` again — see Step 5.)

- [ ] **Step 3: Run typecheck and build**

```bash
npm run typecheck && npm run build
```

Expected: PASS.

- [ ] **Step 4: Manual browser check**

```bash
npm run dev
```

Visit:
- `http://localhost:3000/games/super-mario-64` — should redirect (the URL bar updates to `/games-v2/super-mario-64`).
- `http://localhost:3000/games/super-mario-64?category=70-star&page=2` — should redirect with the query string preserved.
- `http://localhost:3000/games-v2/super-mario-64` — still works directly.
- Sitemap (`/sitemap.xml`) — paths point at `/games-v2/...`.

- [ ] **Step 5: Commit**

```bash
git add app/\(new-layout\)/games/\[game\]/page.tsx src/lib/sitemap.ts
git commit -m "feat(games): redirect /games/[game] to /games-v2/[game]"
```

- [ ] **Step 6: Open follow-up issue / note**

The eventual cleanup is to rename `app/(new-layout)/games-v2/[game]/` → `app/(new-layout)/games/[game]/` (deleting the old folder) once the new page has been live and stable for some agreed period. At that point sitemap URLs go back to `/games/...` and the redirect goes away. Capture this as a TODO in the PR description so it isn't forgotten.

---

## Self-Review

**Spec coverage:**

| Spec section | Implemented in |
|---|---|
| Goals: replace blob fetches with v1 surfaces | Task 1 (data layer) |
| Goals: PB leaderboard as headline | Task 3 |
| Goals: subcategory + variable filters, verified, real ranks | Task 5 (filters), Task 3 (verified, ranks via Redis) |
| Goals: match new-layout design | All tasks (react-bootstrap + existing helpers) |
| Goals: parallel route, flip on cutover | Tasks 2 (build under games-v2), 8 (cutover) |
| Non-goals: /games index, [username]/[game], mod actions, secondary boards, src/components/game-v2/ extraction | Excluded by construction; nothing in tasks touches them |
| Page shape: header + filters + leaderboard + sidebar + drawers | Tasks 2, 5, 3, 4, 6 |
| URL contract (category, subcategory, var_*, verified, page, pageSize) | Tasks 2, 3, 5 |
| `timing` not a URL param; rt+gt rendered side-by-side | Task 3 (LeaderboardTable merges both) |
| Default landing = top category leaderboard | Task 1 (resolveCategory picks index 0) + Task 2 |
| Slug → ID resolution server-side, cached | Task 1 (resolveGame with cacheTag) |
| `'use cache'` minutes for page, hours for resolves | Task 1 (cacheLife per function) |
| `getQuickStats` separate from `resolveGame` for separate TTL | Task 1 (separate function) |
| Empty/error states (notFound, no-categories, no-entries, panel-level failures) | Tasks 2 (notFound, no-categories), 3 (no-entries), 4 (panel independence) |
| Logged-in features (highlight + jump-to-rank) | Task 7 |
| Backend dep #1 gates Task 5 | Stated in Task 5 + Step 1 confirms |
| Backend dep #2 fallback in Task 3 | Stated in Task 3 + verified-toggle uses URL param default |
| Backend dep #3 fallback in Task 1 | Resolve via leaderboard endpoint alias path if needed; documented |
| Migration: redirect from old path | Task 8 |

**Placeholder scan:** No "TBD" / "implement later" / "appropriate handling" left. Two places use natural-language guidance (`Step 1` of Task 4 — "find the existing live-runs source" — and `Step 1` of Task 5 — "confirm backend dep #1"). Both are deliberate investigation steps, not skipped implementation.

**Type consistency:** `LeaderboardResponse` uses `entries`, `page`, `pageSize`, `totalEntries`, `totalPages` consistently across Tasks 1, 3, 4, 6. `LeaderboardEntry` uses `runId`, `rank`, `runnerName`, `userId`, `time`, `gameTime`, `setAt`, `vodUrl`, `verificationStatus` consistently across Tasks 1, 3, 4, 7. `VariableDef` uses `name`, `display`, `type`, `kind`, `values`, `defaultValue`, `required`, `sortOrder`, `scope` consistently across Tasks 1, 5. `ResolvedGame` and `ResolvedCategory` shape stable across Tasks 1, 2, 4, 6, 7.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-09-games-page-v1-api-redesign.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

## Deferred work: Jump-to-my-rank

Task 7's "Jump to my rank" affordance is blocked on a backend dependency: the `/leaderboards/user/{userId}/rankings` endpoint requires a numeric Postgres `user_id`, but the FE session payload (`User`) only carries `username` (string). The `/v1/runs/user-stats?username=X` endpoint returns aggregate stats with no `user_id`. There is no current FE-accessible path from username → numeric user_id.

To unblock, the backend needs one of:
1. Add `user_id` to the session payload (preferred — surfaces the canonical ID once at login).
2. Expose a `/leaderboards/user/by-username/{username}/rankings` route or accept `?username=` on the existing rankings route.
3. Expose `user_id` on the `/v1/runs/user-stats` response.

The current-user row highlight (already implemented via `entry.runnerName === sessionUsername` in `leaderboard-table.tsx`) covers the on-page case. Off-page jump-to-rank waits on the backend.

Which approach?
