import type { GameMetadata } from '~src/lib/game-mgmt';
import type {
    BoardFacets,
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
import type { LevelTemplate } from '../../../../types/levels.types';
import type {
    BoardSort,
    BoardSortDir,
    BoardTiming,
} from './filters/board-sort';
import type { BuiltinFilterState } from './filters/builtin-params';

export interface GamePageSearchParams {
    /**
     * The board being viewed. `category` used to hold this, but it is also
     * what a subcategory variable named "Category" normalizes to, so the two
     * fought over one key — see the legacy redirect in page.tsx.
     */
    board?: string;
    /** A subcategory/filter value now, not the board selector. */
    category?: string;
    combined?: string;
    verified?: string;
    video?: string;
    from?: string;
    to?: string;
    country?: string;
    page?: string;
    pageSize?: string;
    /** 'moderation' -> the board's public Moderation tab (see leaderboard/moderation/). */
    view?: string;
    /** Board order: run date instead of time rank. The `#` column keeps
     * showing each run's real time rank regardless — see board-sort.ts. */
    sort?: string;
    dir?: string;
    /** Which clock ranks the board ('rt' | 'gt'), overriding the category's
     * configured primaryTiming. Set by clicking the other time column. */
    timing?: string;
    [key: string]: string | undefined;
}

export interface GamePageData {
    game: ResolvedGame;
    selectedCategory: ResolvedCategory;
    /** The level group owning `selectedCategory`, when it's a level board —
     *  derived once here so header/board-masthead.tsx and game-page.tsx
     *  don't each re-derive the same `groups.find(...)` lookup. Null when
     *  the selected board isn't a level board. */
    activeLevel: ResolvedGroup | null;
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    /** Level templates (pageData.levelTemplates) — never in `categories`
     *  or `groups[].categories`; see docs/frontend-guide-levels.md. */
    levelTemplates: LevelTemplate[];
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
    /**
     * Board population per category, keyed by category slug — the same measure
     * `subcategoryValueCounts` uses, so a category's number is the total its
     * own subcategory values partition. Deliberately NOT the category stats
     * row's `uniqueRunners`, which counts everyone with a finished run whether
     * or not it made a board. Empty above MAX_CATEGORY_COUNT_PROBES; a chip
     * with no entry renders with no count.
     */
    categoryBoardCounts: Record<string, number>;
    facets: BoardFacets;
    activeFilters: {
        subcategoryValues: Record<string, string>;
        varFilters: Record<string, string>;
        combined: boolean;
        verified: boolean;
        builtins: BuiltinFilterState;
        sort: BoardSort;
        dir: BoardSortDir;
        /** The clock actually used to rank this render — the category's
         * primaryTiming unless ?timing= overrode it. */
        timing: BoardTiming;
        page: number;
        pageSize: number;
    };
}
