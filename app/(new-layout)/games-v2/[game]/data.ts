import { EMPTY_GAME_METADATA, getGameMetadata } from '~src/lib/game-mgmt';
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
import type { GamePageData, GamePageSearchParams } from './types';

const DEFAULT_PAGE_SIZE = 25;
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
    const categories = resolved.categories.filter((c) => c.active !== false);
    const selected =
        resolved.selected && resolved.selected.active !== false
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
            },
            categories,
            groups: resolved.groups,
            variables: [],
            reservedParams: [],
            validCombinations: { mode: 'open' },
            leaderboard: emptyBoard(),
            invalidCombination: null,
            wrEntry: null,
            boardIsEmpty: false,
            quickStats,
            gameMeta,
            recentPbs: [],
            yourRuns: [],
            sessionUsername,
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
                uniqueRunners: 0,
            })),
            getRecentPbs(game.id).catch(() => []),
            sessionUsername
                ? getUserRankingsByName(sessionUsername).catch(() => [])
                : Promise.resolve([]),
            getGameMetadata(game.id).catch(() => EMPTY_GAME_METADATA),
        ]);
    // Best-per-board only — see `getUserRankingsByName` and the
    // `yourRuns` field doc on GamePageData for the honest-scope note.
    const yourRuns = rawYourRuns.filter((r) => r.gameSlug === game.name);

    const leaderboard = boardResult.ok ? boardResult.result : emptyBoard();
    const invalidCombination = boardResult.ok
        ? null
        : { validCombinations: boardResult.validCombinations };

    // The crown always needs the real rank-1 entry, even on a deep-linked
    // later page. Page 1 already has it (entries[0]); anything past that
    // needs a separate page-1 fetch — through the same cached `getLeaderboard`
    // path a normal page-1 load would take, so it's never a fresh/uncached
    // hit and never a client waterfall.
    let wrEntry = null as GamePageData['wrEntry'];
    let boardIsEmpty = false;
    if (boardResult.ok) {
        boardIsEmpty = leaderboard.totalItems === 0;
        if (page === 1) {
            wrEntry = leaderboard.entries[0] ?? null;
        } else if (leaderboard.totalItems > 0) {
            const heroResult = await getLeaderboard({
                ...baseQuery,
                page: 1,
                timing: selected.primaryTiming,
            });
            wrEntry = heroResult.ok
                ? (heroResult.result.entries[0] ?? null)
                : null;
        }
    }

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
        wrEntry,
        boardIsEmpty,
        quickStats,
        gameMeta,
        recentPbs,
        yourRuns,
        sessionUsername,
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
