export interface ResolvedGame {
    id: number;
    name: string;
    display: string;
    image?: string | null;
    // From the per-game configurable verified default. Undefined if backend
    // hasn't surfaced this field yet (backend dep #2).
    defaultVerified?: boolean;
    // Used to decide which timing column drives row order.
    primaryTiming?: 'rt' | 'gt';
}

export interface ResolvedCategory {
    id: number;
    name: string;
    display: string;
    primaryTiming: 'rt' | 'gt';
    defaultSubcategoryHash?: string | null;
    sortAscending?: boolean;
    isMain?: boolean;
    active?: boolean;
}

export interface QuickStats {
    totalRunTime: number;
    totalAttemptCount: number;
    totalFinishedAttemptCount: number;
    uniqueRunners: number;
}

export interface RecentPb {
    id: number;
    username: string;
    game: string;
    category: string;
    time: number;
    gameTime?: number | null;
    endedAt: string;
    isPb: boolean;
}

// Variable definition from /v1/leaderboards/{game}/{category}/variables.
//
// Backend dep #1: `kind` (subcategory vs filter classification) is needed
// for hash computation vs query filtering. The current response surfaces
// `type` as a UI input style (`select`); confirm the classification field
// name before Task 5 ships. Until then this type uses an optional `kind`
// and code that needs the classification falls through to "treat as filter".
export interface VariableDef {
    name: string;
    display: string;
    type: string; // input style hint (e.g. 'select')
    kind?: 'subcategory' | 'filter';
    values: string[];
    defaultValue?: string | null;
    required: boolean;
    sortOrder: number;
    scope: 'game' | 'category';
}

export interface VariablesResponse {
    variables: VariableDef[];
}

export interface LeaderboardEntry {
    runId?: number | null;
    rank: number;
    runnerName: string;
    userId?: number | null;
    isGuest: boolean;
    time: number | null;
    runDate: string | null;
    vodUrl?: string | null;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    variables?: Record<string, string> | null;
}

export interface LeaderboardResponse {
    entries: LeaderboardEntry[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface WrHistoryEntry {
    runnerName: string;
    time: number;
    timingMethod: 'rt' | 'gt';
    setAt: string;
    supersededAt?: string | null;
}

export interface UserRanking {
    gameId: number;
    categoryId: number;
    subcategoryHash: string;
    timing: 'rt' | 'gt';
    rank: number;
    time: number;
}
