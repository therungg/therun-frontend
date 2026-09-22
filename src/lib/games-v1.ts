'use server';

import { cacheLife, cacheTag } from 'next/cache';
import type {
    CategoryDisplayMode,
    LandingView,
    QuickStats,
    RecentPb,
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
} from '../../types/leaderboards.types';
import { isLowActivityCategory } from '../utils/format-stats';
import { normalizeArchived } from './archived-flag';
import { loadCachedGamePageData } from './game-page-data';
import { asMillisecondsMode } from './milliseconds-mode';
import { searchable } from './searchable';
import { selectCategory } from './select-category';
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
    milliseconds_mode?: string;
    require_video?: boolean;
    require_video_top_n?: number | null;
    rta_fallback?: boolean;
}

export async function resolveGame(slug: string): Promise<ResolvedGame | null> {
    'use cache';
    cacheLife('hours');
    // `searchable`, not `normalizeSlug`: by-slug matches `games_pg.name`
    // exactly, and 747 game names carry a hyphen that normalizeSlug eats
    // (`/games/10-yardfight` asked by-slug for `10yardfight` and 404'd).
    const normalized = searchable(slug);
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
    primaryTiming?: string;
    gameTimeLabel?: string;
    rules?: string | null;
    showMilliseconds?: boolean;
    millisecondsMode?: string;
    requireVideo?: boolean;
    sortAscending?: boolean;
    // The rest of the board settings — added to every pageData category entry
    // on 2026-08-19 so a zero-run board or a level category can be edited
    // without a stats row. Optional because pageData baked before then lacks
    // the keys; the column defaults apply until the game is rebuilt. See
    // docs/frontend-guide-levels.md.
    hideRealTime?: boolean;
    hideGameTime?: boolean;
    rtaFallback?: boolean;
    requireVideoTopN?: number | null;
}

interface PageDataGroup {
    id: number;
    name: string;
    sortOrder?: number;
    hiddenByDefault?: boolean;
    displayMode?: string | null;
    kind?: string;
    mirrored?: boolean;
    rules?: string | null;
    categories?: PageDataCategoryFlags[];
}

interface PageDataForCats {
    ungroupedCategories?: PageDataCategoryFlags[];
    groups?: PageDataGroup[];
    game?: {
        categoryDisplayMode?: string | null;
        landingView?: string | null;
    };
    /**
     * Entries per board, keyed by category id — computed live by the backend
     * alongside the baked blob, so it is current rather than as-of the last
     * pageData rebuild. Absent when talking to a backend that predates it.
     */
    categoryEntryCounts?: Record<string, number>;
    /**
     * Boards that were merged away, as slug pairs. A merge tombstones the
     * source and takes its runs, so the old slug has to send visitors on to
     * the board that has them. Absent when talking to a backend that
     * predates it.
     */
    mergedCategories?: { name?: string; redirectedToName?: string }[];
}

/**
 * The URL slug for a category is its backend `categories.name` — the exact
 * value `resolveCategory` matches on server-side. This is the single source
 * of truth: deriving it from the display instead (the old behaviour) diverged
 * for level instances, whose backend name is a hyphen-join of two searchable
 * parts (e.g. `e1m1-any%`) that no display normalization can reproduce (the
 * display uses an em-dash, `E1M1 — Any%`), so their boards 404'd. A template's
 * name is namespaced (`level-template:<slug>`) and is never a URL, so those —
 * and any row whose backend name is missing (pageData baked before names were
 * included) — fall back to `searchable(display)`, the backend's own key.
 */
function slugForCategory(
    backendName: string | undefined,
    display: string,
): string {
    if (backendName && !backendName.startsWith('level-template:')) {
        return backendName;
    }
    // `searchable`, not `normalizeSlug`: the name the backend stored IS
    // `convertToSearchable(display)`, so mirroring it reproduces the row
    // exactly (384 of 400 sampled hyphen categories; the rest are the
    // em-dash level instances that take the backendName branch above).
    // normalizeSlug also ate the hyphen, which is what made every board
    // like `allbosses-basegame-glitched` 404 on /variables.
    return searchable(display);
}

/**
 * Derivations shared by both `resolveCategory` branches (stats-backed rows
 * and the pageData-only zero-stats union) — kept in one place so the two
 * branches cannot silently diverge on how a category resolves to a slug or
 * how the raw timing strings map to the typed enums.
 */
function deriveCategoryBasics(
    display: string,
    backendName: string | undefined,
    primaryTimingRaw: string | undefined,
    gameTimeLabelRaw: string | undefined,
): {
    name: string;
    primaryTiming: 'rt' | 'gt';
    gameTimeLabel: 'igt' | 'lrt';
} {
    return {
        name: slugForCategory(backendName, display),
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
/** Same shape as `asCategoryDisplayMode`: an unknown value means "unset". */
function asLandingView(value: string | null | undefined): LandingView | null {
    return value === 'categories' ||
        value === 'board' ||
        value === 'levels' ||
        value === 'standings'
        ? value
        : null;
}

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
    /** The view the game's root opens on; null = decide from the board count. */
    landingView: LandingView | null;
    /** Entries per board, keyed by category id. Empty on an older backend. */
    categoryEntryCounts: Record<number, number>;
    /**
     * Old board slug -> the slug that took its runs, for boards merged away.
     * Empty on an older backend, which makes the redirect a no-op rather
     * than an error.
     */
    mergedInto: Map<string, string>;
}> {
    'use cache';
    cacheLife('minutes');
    // The cache entry is keyed by BOTH arguments, so passing a slug buys a
    // separate copy of the whole category catalog per board — a board switch
    // refetched every page of /v1/runs/categories for nothing. A caller that
    // reads more than one board's worth per render should call this with the
    // game id alone and pick with `selectCategory`.
    cacheTag(`game-cats:${gameId}`);

    // The whole-payload read is shared with the other public readers of
    // `/v1/games/{id}` (game metadata, the display name) through one cached
    // entry per game, so a board render doesn't fetch the payload twice.
    const [categoryStats, pageData] = await Promise.all([
        fetchAllCategoryStats(gameId),
        loadCachedGamePageData(gameId).catch(() => undefined) as Promise<
            PageDataForCats | undefined
        >,
    ]);

    // Keep the full pageData entry per category id — not just display
    // flags — so a pageData-only row (no stats yet) has everything it needs
    // to render.
    const entryById = new Map<number, PageDataCategoryFlags>();
    const groupByCatId = new Map<number, { id: number; name: string }>();
    for (const c of pageData?.ungroupedCategories ?? []) {
        entryById.set(c.id, c);
    }
    for (const g of pageData?.groups ?? []) {
        for (const c of g.categories ?? []) {
            entryById.set(c.id, c);
            groupByCatId.set(c.id, { id: g.id, name: g.name });
        }
    }

    const groups: ResolvedGroup[] = (pageData?.groups ?? [])
        .map((g) => ({
            id: g.id,
            name: g.name,
            sortOrder: g.sortOrder ?? 0,
            hiddenByDefault: g.hiddenByDefault ?? false,
            displayMode: asCategoryDisplayMode(g.displayMode),
            kind: g.kind === 'level' ? ('level' as const) : ('normal' as const),
            mirrored: g.mirrored === true,
            rules: g.rules ?? null,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder);

    // The activity floor exists to keep accidental splits categories off the
    // page, so it must not reach a board somebody configured: a level, or a
    // board a moderator featured. Undertale's Ruins (43 minutes of playtime)
    // and Snowdin (no finished attempt) were dropped by it the moment the
    // import made them levels, and because both have a stats row the
    // zero-stats union below could not put them back: six levels in the
    // database, four on the page. A quiet board a moderator has featured
    // disappeared the same way.
    const levelGroupIds = new Set(
        (pageData?.groups ?? [])
            .filter((g) => g.kind === 'level')
            .map((g) => g.id),
    );
    const isConfiguredBoard = (categoryId: number): boolean => {
        const grp = groupByCatId.get(categoryId);
        if (grp && levelGroupIds.has(grp.id)) return true;
        return entryById.get(categoryId)?.isMain === true;
    };
    const rows = categoryStats.filter((r) => {
        if (isConfiguredBoard(r.category_id)) return true;
        return !isLowActivityCategory({
            totalRunTime: r.total_run_time,
            totalFinishedAttemptCount: r.total_finished_attempt_count,
        });
    });
    // Every category with a stats row is "seen" — including rows filtered
    // out below the activity floor, which must stay dropped, not get
    // re-added by the zero-stats union below.
    const seenIds = new Set(categoryStats.map((r) => r.category_id));
    const categories: ResolvedCategory[] = rows.map((r) => {
        const entry = entryById.get(r.category_id);
        const grp = groupByCatId.get(r.category_id) ?? null;
        const basics = deriveCategoryBasics(
            r.category_display,
            entry?.name,
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
            millisecondsMode: asMillisecondsMode(r.milliseconds_mode),
            requireVideo: r.require_video ?? false,
            requireVideoTopN: r.require_video_top_n ?? null,
            hideRealTime: r.hide_real_time ?? false,
            hideGameTime: r.hide_game_time ?? false,
            rtaFallback: r.rta_fallback ?? false,
        };
    });

    // Union in every pageData category (ungrouped or grouped, any kind)
    // that has no stats row — zero-run boards and level boards, which start
    // empty, must still show up rather than waiting for their first run.
    for (const [id, entry] of entryById) {
        if (seenIds.has(id)) continue;
        // No display is no category: the slug derives from it, so an entry
        // without one would join the list under the empty slug and shadow
        // every lookup that misses.
        if (!entry.display) continue;
        const grp = groupByCatId.get(id) ?? null;
        const display = entry.display;
        const basics = deriveCategoryBasics(
            display,
            entry.name,
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
            millisecondsMode: asMillisecondsMode(entry.millisecondsMode),
            requireVideo: entry.requireVideo ?? false,
            // pageData carries these since 2026-08-19; older baked pageData
            // may lack the keys, in which case the column defaults apply
            // until the game is rebuilt (a board that really does set one of
            // them reads as the default in the meantime).
            requireVideoTopN: entry.requireVideoTopN ?? null,
            hideRealTime: entry.hideRealTime ?? false,
            hideGameTime: entry.hideGameTime ?? false,
            rtaFallback: entry.rtaFallback ?? false,
        });
    }

    const selected = selectCategory(categories, categorySlug);

    const categoryEntryCounts: Record<number, number> = {};
    for (const [id, n] of Object.entries(pageData?.categoryEntryCounts ?? {})) {
        categoryEntryCounts[Number(id)] = n;
    }

    // Slug -> slug, for the routes that have to redirect. Built only from
    // pairs where both halves are present: a half-written entry would send
    // someone to `?board=undefined`.
    const mergedInto = new Map<string, string>();
    for (const m of pageData?.mergedCategories ?? []) {
        if (m?.name && m.redirectedToName) {
            mergedInto.set(m.name, m.redirectedToName);
        }
    }

    return {
        categories,
        selected,
        categoryEntryCounts,
        mergedInto,
        groups,
        categoryDisplayMode: asCategoryDisplayMode(
            pageData?.game?.categoryDisplayMode,
        ),
        landingView: asLandingView(pageData?.game?.landingView),
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
