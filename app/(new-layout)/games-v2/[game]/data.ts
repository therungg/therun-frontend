import { EMPTY_GAME_METADATA } from '~src/lib/game-metadata';
import { getGameMetadata } from '~src/lib/game-mgmt';
import {
    getQuickStats,
    getRecentPbs,
    resolveCategory,
    resolveGame,
} from '~src/lib/games-v1';
import {
    getLeaderboard,
    getUserRankingsByName,
    getVariables,
} from '~src/lib/leaderboards-v1';
import type { VariableRow } from '../../../../types/leaderboards.types';
import {
    filterPbsToFeatured,
    RECENT_PB_FETCH_LIMIT,
} from './sidebar/featured-pbs';
import type { GamePageData, GamePageSearchParams } from './types';

const DEFAULT_PAGE_SIZE = 25;

/**
 * Ceiling on the per-value count fan-out. One probe is one cached
 * `getLeaderboard` at pageSize 1 (a tiny response), but a game with four
 * subcategories of five values each would fire twenty of them on every cold
 * board render. Past this bound the values render without counts — a missing
 * number is a smaller failure than a slow board.
 */
const MAX_VALUE_COUNT_PROBES = 16;

/**
 * Same ceiling for the per-category board sizes. Over it, the category chips
 * carry no count at all rather than falling back to `uniqueRunners` — a
 * number that means something different (see loadCategoryBoardCounts) must
 * not quietly take the place of one that's merely missing.
 */
const MAX_CATEGORY_COUNT_PROBES = 24;
const RESERVED_LOWER = new Set([
    'category',
    'combined',
    'verified',
    'country',
    'year',
    'page',
    'pagesize',
    'timing',
    'view',
]);

export async function loadGamePageData(
    slug: string,
    sp: GamePageSearchParams,
    sessionUsername: string | null,
): Promise<GamePageData | null> {
    const game = await resolveGame(slug);
    if (!game) return null;

    const resolved = await resolveCategory(game.id, sp.category);
    const categories = resolved.categories.filter(
        (c) => !c.archived && c.isMain,
    );
    const selected =
        resolved.selected &&
        !resolved.selected.archived &&
        resolved.selected.isMain
            ? resolved.selected
            : (categories[0] ?? null);
    if (!selected) {
        const [quickStats, gameMeta] = await Promise.all([
            getQuickStats(game.id),
            getGameMetadata(game.id).catch(() => EMPTY_GAME_METADATA),
        ]);
        return {
            game,
            selectedCategory: {
                id: -1,
                name: '',
                display: '',
                primaryTiming: 'rt',
                archived: false,
                sortOrder: 0,
            },
            categories,
            groups: resolved.groups,
            variables: [],
            reservedParams: [],
            validCombinations: { mode: 'open' },
            leaderboard: emptyBoard(),
            invalidCombination: null,
            quickStats,
            gameMeta,
            recentPbs: [],
            yourRuns: [],
            sessionUsername,
            subcategoryValueCounts: {},
            categoryBoardCounts: {},
            activeFilters: emptyFilters(),
        };
    }

    const varsResp = await getVariables(game.name, selected.name).catch(() => ({
        variables: [],
        reservedParams: [],
        validCombinations: { mode: 'open' as const },
    }));

    const subVarNames = new Set(
        varsResp.variables
            .filter((v) => v.role === 'subcategory')
            .map((v) => v.nameNormalized),
    );
    const filterVarNames = new Set(
        varsResp.variables
            .filter((v) => v.role === 'filter')
            .map((v) => v.nameNormalized),
    );
    const reservedLower = new Set([
        ...RESERVED_LOWER,
        ...varsResp.reservedParams.map((r) => r.toLowerCase()),
    ]);

    const subcategoryValues: Record<string, string> = {};
    const varFilters: Record<string, string> = {};
    for (const [rawKey, raw] of Object.entries(sp)) {
        if (typeof raw !== 'string' || raw.length === 0) continue;
        const key = rawKey.toLowerCase();
        if (reservedLower.has(key)) continue;
        if (subVarNames.has(key)) subcategoryValues[key] = raw;
        else if (filterVarNames.has(key)) varFilters[key] = raw;
        // Unknown keys are ignored to avoid sending them to the backend.
    }

    const combined = sp.combined === '1' || sp.combined === 'true';
    const verified = sp.verified === 'true';
    const page = sp.page ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;
    const pageSize = sp.pageSize
        ? Math.min(
              100,
              Math.max(1, parseInt(sp.pageSize, 10) || DEFAULT_PAGE_SIZE),
          )
        : DEFAULT_PAGE_SIZE;

    const baseQuery = {
        gameSlug: game.name,
        categorySlug: selected.name,
        subcategoryValues,
        combined,
        verified,
        page,
        pageSize,
        varFilters,
    };

    const [boardResult, quickStats, recentPbs, rawYourRuns, gameMeta] =
        await Promise.all([
            getLeaderboard({ ...baseQuery, timing: selected.primaryTiming }),
            getQuickStats(game.id).catch(() => ({
                totalRunTime: 0,
                totalAttemptCount: 0,
                totalFinishedAttemptCount: 0,
                totalPbs: 0,
                uniqueRunners: 0,
            })),
            getRecentPbs(game.id, RECENT_PB_FETCH_LIMIT, {
                featuredOnly: true,
            }).catch(() => []),
            sessionUsername
                ? getUserRankingsByName(sessionUsername).catch(() => [])
                : Promise.resolve([]),
            getGameMetadata(game.id).catch(() => EMPTY_GAME_METADATA),
        ]);
    // Best-per-board only — see `getUserRankingsByName` and the
    // `yourRuns` field doc on GamePageData for the honest-scope note.
    const yourRuns = rawYourRuns.filter((r) => r.gameSlug === game.name);

    // `categories` is already the Featured set — the sidebar must not surface
    // PBs from boards this page can't link to. See filterPbsToFeatured.
    const featuredPbs = filterPbsToFeatured(recentPbs, categories);

    const leaderboard = boardResult.ok ? boardResult.result : emptyBoard();
    const invalidCombination = boardResult.ok
        ? null
        : { validCombinations: boardResult.validCombinations };

    const [subcategoryValueCounts, categoryBoardCounts] = await Promise.all([
        loadSubcategoryValueCounts(
            { ...baseQuery, timing: selected.primaryTiming },
            varsResp.variables,
            boardResult.ok && !combined ? leaderboard.totalItems : null,
        ),
        loadCategoryBoardCounts(game.name, categories),
    ]);

    return {
        game,
        selectedCategory: selected,
        categories,
        groups: resolved.groups,
        variables: varsResp.variables,
        reservedParams: varsResp.reservedParams,
        validCombinations: varsResp.validCombinations,
        leaderboard,
        invalidCombination,
        quickStats,
        gameMeta,
        recentPbs: featuredPbs,
        yourRuns,
        sessionUsername,
        subcategoryValueCounts,
        categoryBoardCounts,
        activeFilters: {
            subcategoryValues,
            varFilters,
            combined,
            verified,
            page,
            pageSize,
        },
    };
}

/**
 * "How big is the board behind this value?" for every subcategory value on
 * screen.
 *
 * Each probe holds the rest of the selection still and swaps one variable —
 * so the number under `Co-op` is the Co-op board *at the current console*,
 * not the Co-op runs across all consoles. That is the number a reader is
 * actually asking for when they look at a value before clicking it.
 *
 * The board already on screen supplies its own cell for free; everything else
 * is a pageSize-1 `getLeaderboard`, which is cached per combination and
 * therefore warm for every other visitor to the same board.
 */
async function loadSubcategoryValueCounts(
    baseQuery: Parameters<typeof getLeaderboard>[0],
    defs: VariableRow[],
    currentTotal: number | null,
): Promise<Record<string, Record<string, number>>> {
    const subDefs = defs.filter((d) => d.role === 'subcategory');
    if (subDefs.length === 0) return {};

    const probes = subDefs.flatMap((def) =>
        def.values
            .map((bucket) => bucket[0])
            .filter((value): value is string => Boolean(value))
            .map((value) => ({ key: def.nameNormalized, value })),
    );
    if (probes.length === 0 || probes.length > MAX_VALUE_COUNT_PROBES) {
        return {};
    }

    // The board on screen resolved its own defaults server-side; mirror that
    // here so a probe for the value already selected is recognised as such
    // (and answered from `currentTotal` instead of a second fetch).
    const effective: Record<string, string> = {};
    for (const def of subDefs) {
        const explicit = baseQuery.subcategoryValues?.[def.nameNormalized];
        const fallback =
            def.defaultValueIndex != null
                ? def.values[def.defaultValueIndex]?.[0]
                : undefined;
        const value = explicit ?? fallback;
        if (value) effective[def.nameNormalized] = value;
    }

    const results = await Promise.all(
        probes.map(async ({ key, value }) => {
            if (currentTotal != null && effective[key] === value) {
                return { key, value, count: currentTotal };
            }
            try {
                const r = await getLeaderboard({
                    ...baseQuery,
                    subcategoryValues: { ...effective, [key]: value },
                    combined: false,
                    page: 1,
                    pageSize: 1,
                });
                // An unbuilt combination is a real, honest zero: picking it
                // lands on an empty board.
                return { key, value, count: r.ok ? r.result.totalItems : 0 };
            } catch {
                return null;
            }
        }),
    );

    const counts: Record<string, Record<string, number>> = {};
    for (const r of results) {
        if (!r) continue;
        (counts[r.key] ??= {})[r.value] = r.count;
    }
    return counts;
}

/**
 * Board population per category, keyed by category slug.
 *
 * The category chips used to show `unique_runners` off the category stats row
 * — everyone with a finished run in the category, board-eligible or not. The
 * subcategory values below them show board rows. On LEGO Star Wars Any% that
 * read as 98 on top of 90 + 1, and the seven missing runners are simply runs
 * that never made a board (below the minimum, rejected, no required video, a
 * value outside the defined buckets).
 *
 * Two measures, both labelled "runners", stacked in one header, is a puzzle
 * the reader is invited to solve by subtracting. So the chips count boards
 * too: `combined=1` is the whole category across its subcategories, which is
 * exactly the total its own values partition.
 */
async function loadCategoryBoardCounts(
    gameSlug: string,
    categories: { name: string; primaryTiming: 'rt' | 'gt' }[],
): Promise<Record<string, number>> {
    if (categories.length === 0) return {};
    if (categories.length > MAX_CATEGORY_COUNT_PROBES) return {};

    const results = await Promise.all(
        categories.map(async (c) => {
            try {
                const r = await getLeaderboard({
                    gameSlug,
                    categorySlug: c.name,
                    timing: c.primaryTiming,
                    combined: true,
                    page: 1,
                    pageSize: 1,
                });
                return r.ok ? ([c.name, r.result.totalItems] as const) : null;
            } catch {
                return null;
            }
        }),
    );

    return Object.fromEntries(
        results.filter((r): r is readonly [string, number] => r !== null),
    );
}

function emptyBoard() {
    return {
        entries: [],
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        totalItems: 0,
        totalPages: 0,
        hideRealTime: false,
        hideGameTime: false,
    };
}

function emptyFilters() {
    return {
        subcategoryValues: {} as Record<string, string>,
        varFilters: {} as Record<string, string>,
        combined: false,
        verified: false,
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
    };
}
