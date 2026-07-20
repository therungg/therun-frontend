import type { GameMetadata } from '~src/lib/game-mgmt';
import type {
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
    quickStats: QuickStats;
    /** IGDB + moderator game metadata from pageData; EMPTY_GAME_METADATA when the fetch fails. */
    gameMeta: GameMetadata;
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
