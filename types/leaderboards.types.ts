export interface ResolvedGame {
    id: number;
    name: string;
    display: string;
    image?: string | null;
    defaultVerified?: boolean;
    primaryTiming?: 'rt' | 'gt';
    redirectedToGameId?: number | null;
    redirectedToSlug?: string | null;
}

export interface ResolvedGroup {
    id: number;
    name: string;
    sortOrder: number;
}

export interface ResolvedCategory {
    id: number;
    name: string;
    display: string;
    primaryTiming: 'rt' | 'gt';
    sortAscending?: boolean;
    isMain?: boolean;
    active?: boolean;
    groupId?: number | null;
    groupName?: string | null;
    totalRunTime?: number;
    totalAttemptCount?: number;
    totalFinishedAttemptCount?: number;
    uniqueRunners?: number;
    rules?: string | null;
    showMilliseconds?: boolean;
    requireVideo?: boolean;
    requireVideoTopN?: number | null;
    hideRealTime?: boolean;
    hideGameTime?: boolean;
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

// Variable definition shared between the admin CRUD endpoint and the public
// /variables endpoint. They now return the same shape; the public endpoint
// just excludes unpublished versions and applies the merge rule.
//
// `values` is a list of buckets. Each bucket is a list of accepted aliases;
// index 0 is the canonical display form. `nameNormalized` is the URL filter
// key (lowercase, whitespace + `=`/`|` stripped from `name`).
export interface VariableRow {
    id: number;
    gameId: number;
    categoryId: number | null; // null = game-wide
    name: string;
    nameNormalized: string;
    role: 'subcategory' | 'filter';
    values: string[][];
    defaultValueIndex: number | null;
    sortOrder: number;
    description: string | null;
    version: number;
    published: boolean;
}

// VariableDef is the merged/public-read flattening. Identical shape to
// VariableRow plus a derived `scope` for UI labeling (which scope the row
// came from after the merge).
export type VariableDef = VariableRow & {
    scope: 'game' | 'category';
};

export interface ValidCombinationsOpen {
    mode: 'open';
}
export interface ValidCombinationsManaged {
    mode: 'managed';
    keys: string[];
}
export type ValidCombinations =
    | ValidCombinationsOpen
    | ValidCombinationsManaged;

// Wire shape of the public /variables response. `getVariables` in
// leaderboards-v1.ts enriches each row to `VariableDef` (adds `scope`).
export interface VariablesResponse {
    variables: VariableRow[];
    reservedParams: string[];
    validCombinations: ValidCombinations;
}

export interface LeaderboardEntry {
    runId?: number | null;
    rank: number;
    runnerName: string;
    userId?: number | null;
    isGuest: boolean;
    time: number | null;
    realTime: number | null;
    gameTime: number | null;
    runDate: string | null;
    vodUrl?: string | null;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    // Keyed by nameNormalized; values are canonical bucket values.
    variables?: Record<string, string> | null;
    // Manual-times feature: 'manual' entries are a mod/self-asserted time with no
    // backing finished_run (runId is null). Defaults to 'run' when absent.
    source?: 'run' | 'manual';
    manualTimeId?: number | null;
}

export interface LeaderboardResponse {
    entries: LeaderboardEntry[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hideRealTime: boolean;
    hideGameTime: boolean;
}

export interface WrHistoryEntry {
    runnerName: string;
    time: number;
    timingMethod: 'rt' | 'gt';
    setAt: string;
    supersededAt?: string | null;
}

export interface UserRanking {
    game: string;
    gameSlug: string;
    gameId: number;
    category: string;
    categorySlug: string;
    categoryId: number;
    subcategoryKey: string;
    runId: number;
    time: number;
    gameTime: number | null;
    primaryTiming: 'rt' | 'gt';
    verificationStatus: 'pending' | 'verified' | 'rejected';
    vodUrl: string | null;
    runDate: string;
    rank: number | null;
    totalRunners: number;
}

// Backend: GET /v1/leaderboards/runs/{runId}
export interface RunDetail {
    runId: number;
    gameId: number;
    gameDisplay: string;
    categoryId: number;
    categoryDisplay: string;
    subcategoryKey: string;
    runnerName: string;
    userId: number | null;
    isGuest: boolean;
    time: number;
    realTime: number | null;
    gameTime: number | null;
    runDate: string;
    vodUrl: string | null;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    variables: Record<string, string>;
    origin?: RunOrigin;
    verifiedBy?: RunOriginRef | null;
    verifiedAt?: string | null;
    rejectionReason?: string | null;
}

export interface RunOriginRef {
    userId: number;
    name: string;
}

export type RunOriginPath =
    | 'timer'
    | 'guest_submit'
    | 'submission'
    | 'manual_mod'
    | 'manual_self';

export interface RunOrigin {
    path: RunOriginPath | null;
    submittedBy: RunOriginRef | null;
    speedrunRunId: string | null;
    ingestedAt: string | null;
}

// Backend: GET /v1/leaderboards/manual-times/{id}
export interface ManualTimeDetail {
    manualTimeId: number;
    gameId: number;
    gameDisplay: string;
    categoryId: number;
    categoryDisplay: string;
    subcategoryKey: string;
    runnerName: string;
    userId: number | null;
    isGuest: boolean;
    timing: 'realtime' | 'gametime';
    timeMs: number;
    evidenceUrl: string | null;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    origin: RunOrigin;
}

// Submit warnings (no UI consumer in this app yet — see plan coordination notes).
export interface SubmitWarning {
    nameNormalized: string;
    submitted: string;
    resolved: string;
    reason:
        | 'no_match_default_used'
        | 'missing_default_used'
        | 'no_match_filter_dropped'
        | 'combination_invalid_default_used';
}

// Backend: POST /v1/me/submissions
export interface SubmitRunInput {
    gameId: number;
    categoryId: number;
    time?: number;
    gameTime?: number;
    runDate: string;
    vodUrl?: string;
    variables?: Record<string, string>;
}

export interface SubmitRunResult {
    id: number;
    verificationStatus: 'pending' | 'verified';
    applied: 'instant' | 'provisional';
    warnings: SubmitWarning[];
    subcategoryKey: string;
}
