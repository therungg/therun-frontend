export interface ResolvedGame {
    id: number;
    name: string;
    display: string;
    image?: string | null;
    defaultVerified?: boolean;
    primaryTiming?: 'rt' | 'gt';
    /** Board-wide default for the category selector; groups may override. */
    categoryDisplayMode?: CategoryDisplayMode | null;
    redirectedToGameId?: number | null;
    redirectedToSlug?: string | null;
}

export interface ResolvedGroup {
    id: number;
    name: string;
    sortOrder: number;
    /**
     * Collapsed on the public page: the label shows, its categories are
     * behind a disclosure. Absent/false = expanded. Backed by
     * category_groups.hidden_by_default.
     */
    hiddenByDefault?: boolean;
    /**
     * How this group draws its categories on the board. Absent/null inherits
     * the game's `categoryDisplayMode`, which itself falls back to 'auto'.
     * Backed by category_groups.display_mode.
     */
    displayMode?: CategoryDisplayMode | null;
}

/**
 * The category selector's presentation. 'auto' picks from the category count
 * — pills while they fit on a row or two, dropdown once they do not.
 */
export type CategoryDisplayMode = 'auto' | 'pills' | 'dropdown';

/**
 * What a board calls its game-time clock. Display vocabulary only — an LRT
 * (load-removed time) board stores primaryTiming 'gt' and ranks identically
 * to an IGT one; the label just renames the clock everywhere it is shown.
 */
export type GameTimeLabel = 'igt' | 'lrt';

export interface ResolvedCategory {
    id: number;
    name: string;
    display: string;
    primaryTiming: 'rt' | 'gt';
    /** Absent = 'igt'. */
    gameTimeLabel?: GameTimeLabel;
    sortAscending?: boolean;
    isMain?: boolean;
    /** Normalized from API archived/active (see src/lib/archived-flag.ts). Archived = invisible everywhere. */
    archived: boolean;
    /** Moderator-set display order within its group scope; 0 = unset (sorts last, playtime tiebreak). */
    sortOrder: number;
    groupId?: number | null;
    groupName?: string | null;
    /** Moderator-set emblem art (36px square render). Null/absent -> monogram tile. */
    imageUrl?: string | null;
    totalRunTime?: number;
    totalAttemptCount?: number;
    totalFinishedAttemptCount?: number;
    /** Count of runs that were a PB when finished — category_stats.total_pbs. */
    totalPbs?: number;
    uniqueRunners?: number;
    rules?: string | null;
    showMilliseconds?: boolean;
    requireVideo?: boolean;
    requireVideoTopN?: number | null;
    hideRealTime?: boolean;
    hideGameTime?: boolean;
    /** "Put RTA in leaderboard if IGT is not available" — RTA-only runs rank
     * on the game-time board by their real time. */
    rtaFallback?: boolean;
}

export interface QuickStats {
    totalRunTime: number;
    totalAttemptCount: number;
    totalFinishedAttemptCount: number;
    /** Count of runs that were a PB when finished — game_stats.total_pbs. */
    totalPbs: number;
    uniqueRunners: number;
}

export interface RecentPb {
    id: number;
    username: string;
    game: string;
    category: string;
    /**
     * Backend `FINISHED_RUN_SELECT.categoryId` — the row's resolved category,
     * which is what the sidebar filters on. Optional only because
     * `getRecentPbs` casts the raw response with no mapping; treat absence as
     * "unknown category" rather than assuming it matches.
     */
    categoryId?: number | null;
    time: number;
    gameTime?: number | null;
    endedAt: string;
    isPb: boolean;
    /**
     * The runner's previous PB on this board, null for a first-ever PB.
     * Optional for the same cast-without-mapping reason as `runId` below.
     *
     * These are two separate backend columns and they pair with two separate
     * time fields: `previousPb` with `time` (real time), `previousPbGameTime`
     * with `gameTime`. A delta must compare within one pair — crossing them
     * subtracts a game time from a real time and prints nonsense.
     */
    previousPb?: number | null;
    previousPbGameTime?: number | null;
    // Optional: the same /v1/finished-runs endpoint's parallel shape
    // (FinishedRunPB, src/lib/highlights.ts) always carries `runId`, but
    // getRecentPbs casts the raw response straight to RecentPb[] with no
    // mapping, so runtime presence here is unproven. Keep optional so a
    // backend omission doesn't break the type — consumers must fall back
    // when it's missing.
    runId?: number | null;
}

// Variable definition shared between the admin CRUD endpoint and the public
// /variables endpoint. They return the same shape; the public endpoint just
// excludes unpublished versions. Variables are category-scoped only — there
// is no game-wide scope.
//
// `values` is a list of buckets. Each bucket is a list of accepted aliases;
// index 0 is the canonical display form. `nameNormalized` is the URL filter
// key (lowercase, whitespace + `=`/`|` stripped from `name`).
export interface VariableRow {
    id: number;
    gameId: number;
    categoryId: number;
    name: string;
    nameNormalized: string;
    role: 'subcategory' | 'filter';
    values: string[][];
    defaultValueIndex: number | null;
    sortOrder: number;
    description: string | null;
    // Filters only: when true, the runner's value for this variable is shown
    // as its own column on the leaderboard row. Default false. Optional so an
    // older backend deploy that doesn't return the column doesn't break the
    // type — consumers must treat a missing value as false.
    showValueOnBoard?: boolean;
    version: number;
    published: boolean;
}

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

// Wire shape of the public /variables response.
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
    // What the runner actually submitted (normalized keys, raw values),
    // BEFORE subcategory defaults were filled in. A defaulted subcategory
    // appears in `variables` but not here — the board's value columns use
    // that to leave never-set cells blank. Null/absent when not stamped yet.
    rawVariables?: Record<string, string> | null;
    // Manual-times feature: 'manual' entries are a mod/self-asserted time with no
    // backing finished_run (runId is null). Defaults to 'run' when absent.
    source?: 'run' | 'manual';
    manualTimeId?: number | null;
    // Runner metadata batch-joined by the backend; null for guests and
    // absent on older backend deploys.
    picture?: string | null;
    country?: string | null;
    // Set by the backend's public redaction pass (workstream C, anonymize)
    // and ONLY on redacted rows: `runnerName` carries the stable placeholder
    // ("Anonymous runner #N"), and `userId`/`picture`/`country` are nulled
    // with `isGuest: false`. `runId` survives, so a mod's kebab still works.
    //
    // Style anonymous rows off THIS flag, never off the name string — a real
    // runner may legitimately be called "Anonymous runner #3".
    anonymized?: true;
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

// Backend: GET /mod/v1/leaderboards/{game}/{category}/export — the whole
// board in one response plus per-run fields the paginated endpoint doesn't
// carry. Rides the /mod base path (main gateway is at its resource cap).
export interface LeaderboardExportEntry extends LeaderboardEntry {
    subcategoryKey: string | null;
    platform: string | null;
    emulator: boolean | null;
    /** speedrun.com-linked run reference, when the run was timer-synced. */
    speedrunRunId: string | null;
    verifiedAt: string | null;
    ingestedAt: string | null;
    /** How the entry got here: timer | guest_submit | submission | manual_mod | manual_self. */
    origin: string | null;
}

export interface LeaderboardExportResponse {
    game: { id: number; slug: string; display: string };
    category: { id: number; slug: string; display: string };
    timing: 'rt' | 'gt';
    defaultTiming: 'rt' | 'gt';
    /** What this board calls its game-time clock. Display only. */
    gameTimeLabel: GameTimeLabel;
    forceRealTime: boolean;
    hideRealTime: boolean;
    hideGameTime: boolean;
    totalItems: number;
    /** True when the backend's row guard fired and entries < totalItems. */
    truncated: boolean;
    exportedAt: string;
    entries: LeaderboardExportEntry[];
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
    /** What this board calls its game-time clock. Display only. */
    gameTimeLabel?: GameTimeLabel;
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
    /** What this run's board calls its game-time clock. Display only. */
    gameTimeLabel?: GameTimeLabel;
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

// ---- Cross-category standings -------------------------------------------
// Backend: GET /mod/v1/games/{gameId}/standings (public).
// See docs/frontend-guide-game-standings.md — the backend copy is
// authoritative. Columnar on purpose: `cells` indexes into `categories` and
// `runners` rather than repeating runner identity per row, which costs
// roughly a quarter of the bytes an entry-shaped payload would.

export interface StandingsCategory {
    id: number;
    name: string;
    display: string;
    /** Which clock this board is ranked by. Display only — pct is a ratio. */
    timing: 'rt' | 'gt';
    /** What this board calls its game-time clock. Display only. */
    gameTimeLabel?: GameTimeLabel;
    /** Fastest time on the board; the denominator for this column's pct. */
    wrTimeMs: number;
    entryCount: number;
}

export interface StandingsRunner {
    name: string;
    userId: number | null;
    isGuest: boolean;
    picture: string | null;
    country: string | null;
}

/** [categoryIndex, runnerIndex, rank, timeMs] */
export type StandingsCell = [number, number, number, number];

export interface GameStandings {
    categories: StandingsCategory[];
    runners: StandingsRunner[];
    /** Sparse: a runner has a cell only for categories they've run. */
    cells: StandingsCell[];
    /** Set when the backend's 5000-runner guard fired. */
    truncated: boolean;
}
