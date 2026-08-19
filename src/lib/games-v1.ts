'use server';

import { cacheLife, cacheTag } from 'next/cache';
import type {
    CategoryDisplayMode,
    QuickStats,
    RecentPb,
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
} from '../../types/leaderboards.types';
import type { LevelTemplate } from '../../types/levels.types';
import { isLowActivityCategory } from '../utils/format-stats';
import { normalizeArchived } from './archived-flag';
import { normalizeSlug } from './normalize-slug';
import { V1FetchError, v1Fetch } from './v1-fetch';

interface GamesEndpointRow {
    gameId: number;
    gameDisplay: string;
    gameImage?: string | null;
    totalRunTime: number;
    totalAttemptCount: number;
    totalFinishedAttemptCount: number;
    totalPbs?: number;
    uniqueRunners: number;
}

// /v1/runs/categories returns snake_case (unlike /v1/runs/games, which is camelCase).
interface CategoriesEndpointRow {
    game_id: number;
    category_id: number;
    game_display: string;
    category_display: string;
    game_image?: string | null;
    total_run_time: number;
    total_attempt_count: number;
    total_finished_attempt_count: number;
    total_pbs?: number;
    unique_runners: number;
    primary_timing?: string; // "realtime" | "gametime" | "rt" | "gt"
    game_time_label?: string; // "igt" | "lrt"
    hide_real_time?: boolean;
    hide_game_time?: boolean;
    sort_ascending?: boolean;
    default_verified?: boolean;
    rules?: string | null;
    show_milliseconds?: boolean;
    require_video?: boolean;
    require_video_top_n?: number | null;
    rta_fallback?: boolean;
}

export async function resolveGame(slug: string): Promise<ResolvedGame | null> {
    'use cache';
    cacheLife('hours');
    const normalized = normalizeSlug(slug);
    cacheTag(`game-resolve:${normalized}`);

    let lookup: {
        result: {
            id: number;
            name: string;
            display: string;
            redirectedToGameId?: number | null;
            redirectedToSlug?: string | null;
        };
    };
    try {
        lookup = await v1Fetch(
            `/v1/games/by-slug/${encodeURIComponent(normalized)}`,
        );
    } catch (e) {
        if (e instanceof V1FetchError && e.status === 404) return null;
        throw e;
    }
    const { id, name, display } = lookup.result;

    let image: string | null = null;
    try {
        const body = await v1Fetch<{ result: GamesEndpointRow[] }>(
            `/v1/runs/games?game_id=${id}&limit=1`,
        );
        image = body.result?.[0]?.gameImage ?? null;
    } catch {
        // Image is non-essential; degrade gracefully.
    }

    return {
        id,
        name,
        display,
        image,
        redirectedToGameId: lookup.result.redirectedToGameId ?? null,
        redirectedToSlug: lookup.result.redirectedToSlug ?? null,
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
            totalPbs: 0,
            uniqueRunners: 0,
        };
    }
    return {
        totalRunTime: row.totalRunTime,
        totalAttemptCount: row.totalAttemptCount,
        totalFinishedAttemptCount: row.totalFinishedAttemptCount,
        totalPbs: row.totalPbs ?? 0,
        uniqueRunners: row.uniqueRunners,
    };
}

interface PageDataCategoryFlags {
    id: number;
    isMain?: boolean;
    active?: boolean | null;
    archived?: boolean | null;
    sortOrder?: number | null;
    imageUrl?: string | null;
    display?: string;
    name?: string;
    levelTemplateId?: number | null;
    levelOverride?: boolean;
    primaryTiming?: string;
    gameTimeLabel?: string;
    rules?: string | null;
    showMilliseconds?: boolean;
    requireVideo?: boolean;
    sortAscending?: boolean;
}

interface PageDataGroup {
    id: number;
    name: string;
    sortOrder?: number;
    hiddenByDefault?: boolean;
    displayMode?: string | null;
    kind?: string;
    rules?: string | null;
    categories?: PageDataCategoryFlags[];
}

interface PageDataForCats {
    ungroupedCategories?: PageDataCategoryFlags[];
    groups?: PageDataGroup[];
    game?: { categoryDisplayMode?: string | null };
    levelTemplates?: PageDataCategoryFlags[];
}

/**
 * Derivations shared by both `resolveCategory` branches (stats-backed rows
 * and the pageData-only zero-stats union) — kept in one place so the two
 * branches cannot silently diverge on how a display resolves to a slug or
 * how the raw timing strings map to the typed enums.
 *
 * The slug is always `normalizeSlug(display)`, never the backend `name`
 * column — an instance's backend `name` (e.g. `e1m1-any%`) is a real slug,
 * but a template's is namespaced `level-template:<slug>` and is never a URL
 * slug, and every slug lookup in this app (this function's own `selected`
 * search, `root-view.ts`) compares against `normalizeSlug(param)`. Deriving
 * the slug the same way here keeps both branches — and every other slug
 * consumer — consistent.
 */
function deriveCategoryBasics(
    display: string,
    primaryTimingRaw: string | undefined,
    gameTimeLabelRaw: string | undefined,
): {
    name: string;
    primaryTiming: 'rt' | 'gt';
    gameTimeLabel: 'igt' | 'lrt';
} {
    return {
        name: normalizeSlug(display),
        primaryTiming:
            primaryTimingRaw === 'gt' || primaryTimingRaw === 'gametime'
                ? 'gt'
                : 'rt',
        gameTimeLabel: gameTimeLabelRaw === 'lrt' ? 'lrt' : 'igt',
    };
}

/**
 * The wire carries whatever the column holds; anything the UI does not know
 * how to draw degrades to 'auto' rather than to a blank band.
 */
function asCategoryDisplayMode(
    value: string | null | undefined,
): CategoryDisplayMode | null {
    return value === 'auto' || value === 'pills' || value === 'dropdown'
        ? value
        : null;
}

// /v1/runs/categories hard-caps `limit` at 100 server-side (parseLimit's
// maxLimit in the backend's query-runs.ts) and silently returns 100 for any
// larger ask — this used to request 200 and get 100, which quietly dropped
// every category outside a game's top 100 by playtime. SM64 has ~1000 with
// real activity, so a Featured category could go missing from the board
// entirely. It does honour `offset`, so page through it.
const CATEGORY_PAGE_SIZE = 100;
/** Ceiling of 2000 categories; the largest game today is ~1250 rows. */
const CATEGORY_MAX_PAGES = 20;
/** Pages per round trip — SM64 finishes in three batches rather than 13 hops. */
const CATEGORY_PAGE_BATCH = 5;

async function fetchAllCategoryStats(
    gameId: number,
): Promise<CategoriesEndpointRow[]> {
    const page = async (offset: number) => {
        const body = await v1Fetch<{ result: CategoriesEndpointRow[] }>(
            `/v1/runs/categories?game_id=${gameId}&sort=-total_run_time&limit=${CATEGORY_PAGE_SIZE}&offset=${offset}`,
        );
        return body.result ?? [];
    };

    const rows: CategoriesEndpointRow[] = [];
    for (
        let start = 0;
        start < CATEGORY_MAX_PAGES;
        start += CATEGORY_PAGE_BATCH
    ) {
        const offsets: number[] = [];
        const end = Math.min(start + CATEGORY_PAGE_BATCH, CATEGORY_MAX_PAGES);
        for (let i = start; i < end; i++) offsets.push(i * CATEGORY_PAGE_SIZE);

        const pages = await Promise.all(offsets.map(page));
        for (const p of pages) rows.push(...p);
        // A short page is the end of the list; later pages in the batch came
        // back empty and cost nothing.
        if (pages.some((p) => p.length < CATEGORY_PAGE_SIZE)) break;
    }
    return rows;
}

export async function resolveCategory(
    gameId: number,
    categorySlug?: string,
): Promise<{
    categories: ResolvedCategory[];
    selected: ResolvedCategory | null;
    groups: ResolvedGroup[];
    /** Board-wide selector default; the flat case has nowhere else to get one. */
    categoryDisplayMode: CategoryDisplayMode | null;
    levelTemplates: LevelTemplate[];
}> {
    'use cache';
    cacheLife('minutes');
    // Cache is keyed by gameId only; categorySlug is used post-fetch to pick
    // one entry from the cached list, so it intentionally shares cache across
    // category selections for the same game.
    cacheTag(`game-cats:${gameId}`);

    const [categoryStats, pageDataResp] = await Promise.all([
        fetchAllCategoryStats(gameId),
        v1Fetch<{ result?: PageDataForCats }>(`/v1/games/${gameId}`).catch(
            () => ({ result: undefined as PageDataForCats | undefined }),
        ),
    ]);

    // Keep the full pageData entry per category id — not just display
    // flags — so a pageData-only row (no stats yet) has everything it needs
    // to render, and every row can pick up levelTemplateId/levelOverride.
    const entryById = new Map<number, PageDataCategoryFlags>();
    const groupByCatId = new Map<number, { id: number; name: string }>();
    for (const c of pageDataResp.result?.ungroupedCategories ?? []) {
        entryById.set(c.id, c);
    }
    for (const g of pageDataResp.result?.groups ?? []) {
        for (const c of g.categories ?? []) {
            entryById.set(c.id, c);
            groupByCatId.set(c.id, { id: g.id, name: g.name });
        }
    }

    const groups: ResolvedGroup[] = (pageDataResp.result?.groups ?? [])
        .map((g) => ({
            id: g.id,
            name: g.name,
            sortOrder: g.sortOrder ?? 0,
            hiddenByDefault: g.hiddenByDefault ?? false,
            displayMode: asCategoryDisplayMode(g.displayMode),
            kind: g.kind === 'level' ? ('level' as const) : ('normal' as const),
            rules: g.rules ?? null,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder);

    const rows = categoryStats.filter(
        (r) =>
            !isLowActivityCategory({
                totalRunTime: r.total_run_time,
                totalFinishedAttemptCount: r.total_finished_attempt_count,
            }),
    );
    // Every category with a stats row is "seen" — including rows filtered
    // out below the activity floor, which must stay dropped, not get
    // re-added by the zero-stats union below.
    const seenIds = new Set(categoryStats.map((r) => r.category_id));
    const categories: ResolvedCategory[] = rows.map((r) => {
        const entry = entryById.get(r.category_id);
        const grp = groupByCatId.get(r.category_id) ?? null;
        const basics = deriveCategoryBasics(
            r.category_display,
            r.primary_timing,
            r.game_time_label,
        );
        return {
            id: r.category_id,
            name: basics.name,
            display: r.category_display,
            primaryTiming: basics.primaryTiming,
            gameTimeLabel: basics.gameTimeLabel,
            sortAscending: r.sort_ascending ?? true,
            isMain: entry?.isMain ?? false,
            archived: entry ? normalizeArchived(entry) : false,
            sortOrder: entry?.sortOrder ?? 0,
            groupId: grp?.id ?? null,
            groupName: grp?.name ?? null,
            imageUrl: entry?.imageUrl ?? null,
            totalRunTime: r.total_run_time,
            totalAttemptCount: r.total_attempt_count,
            totalFinishedAttemptCount: r.total_finished_attempt_count,
            totalPbs: r.total_pbs ?? 0,
            uniqueRunners: r.unique_runners,
            rules: r.rules ?? null,
            showMilliseconds: r.show_milliseconds ?? true,
            requireVideo: r.require_video ?? false,
            requireVideoTopN: r.require_video_top_n ?? null,
            hideRealTime: r.hide_real_time ?? false,
            hideGameTime: r.hide_game_time ?? false,
            rtaFallback: r.rta_fallback ?? false,
            levelTemplateId: entry?.levelTemplateId ?? null,
            levelOverride: entry?.levelOverride ?? false,
        };
    });

    // Union in every pageData category (ungrouped or grouped, any kind)
    // that has no stats row — zero-run boards and level boards, which start
    // empty, must still show up rather than waiting for their first run.
    for (const [id, entry] of entryById) {
        if (seenIds.has(id)) continue;
        const grp = groupByCatId.get(id) ?? null;
        const display = entry.display ?? '';
        const basics = deriveCategoryBasics(
            display,
            entry.primaryTiming,
            entry.gameTimeLabel,
        );
        categories.push({
            id,
            name: basics.name,
            display,
            primaryTiming: basics.primaryTiming,
            gameTimeLabel: basics.gameTimeLabel,
            sortAscending: entry.sortAscending ?? true,
            isMain: entry.isMain ?? false,
            archived: normalizeArchived(entry),
            sortOrder: entry.sortOrder ?? 0,
            groupId: grp?.id ?? null,
            groupName: grp?.name ?? null,
            imageUrl: entry.imageUrl ?? null,
            totalRunTime: 0,
            totalAttemptCount: 0,
            totalFinishedAttemptCount: 0,
            totalPbs: 0,
            uniqueRunners: 0,
            rules: entry.rules ?? null,
            showMilliseconds: entry.showMilliseconds ?? true,
            requireVideo: entry.requireVideo ?? false,
            // pageData doesn't carry these — they're wired to real config
            // only once the board has a stats row (/v1/runs/categories).
            // Until then these are gaps, not asserted config: a board that
            // actually sets requireVideoTopN/hideRealTime/hideGameTime/
            // rtaFallback shows the defaults here until its first run lands
            // it in the stats branch above.
            requireVideoTopN: null,
            hideRealTime: false,
            hideGameTime: false,
            rtaFallback: false,
            levelTemplateId: entry.levelTemplateId ?? null,
            levelOverride: entry.levelOverride ?? false,
        });
    }

    let selected: ResolvedCategory | null = null;
    if (categorySlug) {
        const norm = normalizeSlug(categorySlug);
        selected = categories.find((c) => c.name === norm) ?? null;
    }
    if (!selected) selected = categories[0] ?? null;

    const levelTemplates: LevelTemplate[] = (
        pageDataResp.result?.levelTemplates ?? []
    ).map((t) => ({
        id: t.id,
        display: t.display ?? '',
        rules: t.rules ?? null,
        isMain: t.isMain ?? false,
        sortOrder: t.sortOrder ?? 0,
        imageUrl: t.imageUrl ?? null,
    }));

    return {
        categories,
        selected,
        groups,
        categoryDisplayMode: asCategoryDisplayMode(
            pageDataResp.result?.game?.categoryDisplayMode,
        ),
        levelTemplates,
    };
}

/**
 * `featuredOnly` narrows to boards the site actually publishes, server-side —
 * `is_main=true&active=true` on /v1/finished-runs (the API keeps the column
 * names; the UI calls them Featured and Archived). Without it the feed spans
 * every category the game has ever seen, including ones whose boards aren't
 * publicly reachable.
 */
export async function getRecentPbs(
    gameId: number,
    limit = 10,
    { featuredOnly = false }: { featuredOnly?: boolean } = {},
): Promise<RecentPb[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`recent-pbs:${gameId}`);

    const featured = featuredOnly ? '&is_main=true&active=true' : '';
    const path = `/v1/finished-runs?game_id=${gameId}&is_pb=true${featured}&sort=-ended_at&limit=${limit}`;
    const body = await v1Fetch<{ result: { data: RecentPb[] } }>(path);
    return body.result?.data ?? [];
}
