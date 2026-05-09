import type { LiveRun } from '~app/(new-layout)/live/live.types';
import {
    getQuickStats,
    getRecentPbs,
    resolveCategory,
    resolveGame,
} from '~src/lib/games-v1';
import { getLeaderboard, getVariables } from '~src/lib/leaderboards-v1';
import { getAllLiveRuns } from '~src/lib/live-runs';
import type { GamePageData, GamePageSearchParams } from './types';

const DEFAULT_PAGE_SIZE = 25;

export async function loadGamePageData(
    slug: string,
    sp: GamePageSearchParams,
    sessionUsername: string | null,
): Promise<GamePageData | null> {
    const game = await resolveGame(slug);
    if (!game) return null;

    const { categories, selected } = await resolveCategory(
        game.id,
        sp.category,
    );
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
            sessionUsername,
            activeFilters: emptyFilters(),
        };
    }

    const subcategoryHash =
        sp.subcategory ?? selected.defaultSubcategoryHash ?? '';
    const verified = sp.verified === 'true';
    const page = sp.page ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;
    const pageSize = sp.pageSize
        ? Math.min(
              100,
              Math.max(1, parseInt(sp.pageSize, 10) || DEFAULT_PAGE_SIZE),
          )
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

    const [
        variables,
        leaderboardRt,
        leaderboardGt,
        quickStats,
        recentPbs,
        liveRunners,
    ] = await Promise.all([
        getVariables(game.name, selected.name),
        getLeaderboard({ ...baseQuery, timing: 'rt' }),
        getLeaderboard({ ...baseQuery, timing: 'gt' }),
        getQuickStats(game.id),
        getRecentPbs(game.id),
        getAllLiveRuns(game.display) as Promise<LiveRun[]>,
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
        liveRunners: liveRunners ?? [],
        sessionUsername,
        activeFilters: {
            subcategoryHash,
            verified,
            page,
            pageSize,
            varFilters,
        },
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
        totalItems: 0,
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
