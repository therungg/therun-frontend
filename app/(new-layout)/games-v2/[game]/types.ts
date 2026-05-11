import type { LiveRun } from '~app/(new-layout)/live/live.types';
import type {
    LeaderboardResponse,
    QuickStats,
    RecentPb,
    ResolvedCategory,
    ResolvedGame,
    VariableDef,
} from '../../../../types/leaderboards.types';

export interface GamePageSearchParams {
    category?: string;
    subcategory?: string;
    verified?: string;
    page?: string;
    pageSize?: string;
    [varKey: string]: string | undefined; // var_* and subvar_* keys
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
    liveRunners: LiveRun[];
    sessionUsername: string | null;
    activeFilters: {
        subcategoryHash: string;
        verified: boolean;
        page: number;
        pageSize: number;
        varFilters: Record<string, string>;
        selectedSubcategoryValues: Record<string, string>;
    };
}
