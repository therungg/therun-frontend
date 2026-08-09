import type { GameMetadata } from '~src/lib/game-mgmt';
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
    VariableRow,
} from '../../../../types/leaderboards.types';

export interface GamePageSearchParams {
    category?: string;
    combined?: string;
    verified?: string;
    page?: string;
    pageSize?: string;
    /** 'moderation' -> the board's public Moderation tab (see leaderboard/moderation/). */
    view?: string;
    [key: string]: string | undefined;
}

export interface GamePageData {
    game: ResolvedGame;
    selectedCategory: ResolvedCategory;
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    variables: VariableRow[];
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
    /**
     * Runner counts per subcategory value, keyed
     * `nameNormalized -> canonicalValue -> count`. Each number is the size of
     * the board you'd land on by picking that value while every *other*
     * subcategory stays where it is — the same "what am I about to open"
     * promise the category chips' counts make.
     *
     * Empty when the fan-out would be too wide to be worth it (see
     * MAX_VALUE_COUNT_PROBES in data.ts); consumers must render the value
     * with no count rather than a zero.
     */
    subcategoryValueCounts: Record<string, Record<string, number>>;
    activeFilters: {
        subcategoryValues: Record<string, string>;
        varFilters: Record<string, string>;
        combined: boolean;
        verified: boolean;
        page: number;
        pageSize: number;
    };
}
