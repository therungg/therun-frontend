import type {
    LeaderboardEntry,
    LeaderboardResponse,
    QuickStats,
    RecentPb,
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
    UserRanking,
    ValidCombinations,
    VariableDef,
} from '../../../../types/leaderboards.types';

export interface GamePageSearchParams {
    category?: string;
    combined?: string;
    verified?: string;
    page?: string;
    pageSize?: string;
    [key: string]: string | undefined;
}

export interface GamePageData {
    game: ResolvedGame;
    selectedCategory: ResolvedCategory;
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    variables: VariableDef[];
    reservedParams: string[];
    validCombinations: ValidCombinations;
    leaderboard: LeaderboardResponse;
    invalidCombination: { validCombinations: string[] } | null;
    /**
     * The actual rank-1 entry for the current category/subcategory, i.e.
     * the crown's WR — always page 1, even when `leaderboard` itself is a
     * deep-linked later page. Null when there is no valid board (invalid
     * combination) or the board has no runs yet.
     */
    wrEntry: LeaderboardEntry | null;
    /** True only for a genuinely empty (zero-entry) valid board. */
    boardIsEmpty: boolean;
    quickStats: QuickStats;
    recentPbs: RecentPb[];
    /**
     * The signed-in runner's own standing on this game — best entry per
     * board only (see `getUserRankingsByName`). Empty for signed-out
     * visitors and for signed-in runners with no PBs on this game.
     */
    yourRuns: UserRanking[];
    sessionUsername: string | null;
    activeFilters: {
        subcategoryValues: Record<string, string>;
        varFilters: Record<string, string>;
        combined: boolean;
        verified: boolean;
        page: number;
        pageSize: number;
    };
}
