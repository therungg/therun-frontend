// Mirror of the backend's speedrun.com import (dry-run) contract —
// therun-backend docs/frontend-guide-src-import.md. Field names match the
// API exactly; keep in sync with `therun/src/src-import/types.ts`.

export type SrcImportStatus = 'queued' | 'running' | 'done' | 'failed';
export type SrcImportPhase = 'meta' | 'players' | 'matching' | 'runs' | 'done';

export type SrcImportCheckpoint =
    | { stage: 'players'; boardIndex: number }
    | {
          stage: 'runs';
          playerIndex: number;
          offset: number;
          direction: 'asc' | 'desc';
      };

export interface SrcImportJob {
    id: number;
    gameId: number;
    srcGameId: string;
    srcGameAbbreviation: string;
    srcGameName: string;
    srcUrl: string;
    requestedBy: number;
    status: SrcImportStatus;
    phase: SrcImportPhase;
    checkpoint: SrcImportCheckpoint | null;
    categoriesCount: number;
    levelsCount: number;
    variablesCount: number;
    runsCount: number;
    playersCount: number;
    playersMatchedCount: number;
    requestsMade: number;
    /**
     * Expected total requests, computed up front from per-category run
     * counts. The importer runs at ~1 request/second, so
     * requestsMade / estimatedRequests is both progress and a time estimate.
     * Null when the pre-fetch failed — show no percentage then.
     */
    estimatedRequests: number | null;
    error: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    createdAt: string;
    // ---- commit phase (docs/frontend-guide-src-import.md "Commit phase") ----
    commitStatus: SrcImportCommitStatus | null;
    commitPhase: SrcImportCommitPhase | null;
    importedRunsCount: number;
    importSkippedCount: number;
    configAppliedAt: string | null;
    runsImportedAt: string | null;
    /** "Only use the speedrun.com leaderboard" — set via POST .../src-only, before import-runs runs. */
    srcOnlyLeaderboard: boolean;
    /** 'resync' = one-click re-sync (auto-applied); 'manual' = reviewed import. */
    kind: SrcImportJobKind;
    /** What this commit changed — filled during the commit; null before it runs. */
    changeSummary: SrcCommitChangeSummary | null;
    /**
     * Per-job moderator commit toggles, set via POST .../flags before commit.
     * Null (or a missing key) means the backend default — see resolveCommitFlags
     * on the backend; every default preserves the prior import behavior.
     */
    commitFlags: SrcImportCommitFlags | null;
}

/** 'resync' = one-click re-sync (auto-applied); 'manual' = reviewed import. 'settings' = config-only sync (no runs). */
export type SrcImportJobKind = 'manual' | 'resync' | 'settings';

/**
 * Moderator toggles honored during the commit (mirror of the backend
 * SrcImportCommitFlags). All keys optional; a missing key resolves to its
 * behavior-preserving default (all booleans true, themeMode 'overwrite').
 * Category/theme flags are consumed at apply-config, the run flags at
 * import-runs; the backend freezes them once runs start importing.
 */
export interface SrcImportCommitFlags {
    importTheme?: boolean;
    themeMode?: 'overwrite' | 'if-unset';
    importMiscCategories?: boolean;
    importLevelCategories?: boolean;
    importPending?: boolean;
    setMinTimeFloor?: boolean;
}

/** A game-level field the settings import changed, with the value it replaced. */
export type SrcConfigFieldValue =
    | string
    | number
    | boolean
    | string[]
    | { label: string; url: string }[]
    | null;
export interface SrcConfigFieldChange {
    /** emulatorPolicy | primaryTiming | gameTimeLabel | hideRealTime | hideGameTime | showMilliseconds | platforms | releaseYear | discordUrl | links */
    field: string;
    from: SrcConfigFieldValue;
    to: SrcConfigFieldValue;
}

/** What apply-config changed, written once per successful settings apply. */
export interface SrcConfigChangeSummary {
    categoriesCreated: number;
    categoriesUpdated: number;
    categoriesUnfeatured: number;
    levelsCreated: number;
    levelsUpdated: number;
    variablesCreated: number;
    variablesUpdated: number;
    themeApplied: boolean;
    gameFields: SrcConfigFieldChange[];
    moderatorsAssigned: number;
    minTimeFloors: number;
}

export interface SrcCommitChangeSummary {
    added: number;
    updated: number;
    removed: number;
    archived: number;
    /** Configuration delta; absent on jobs that ran before it existed. */
    config?: SrcConfigChangeSummary | null;
}

export type SrcImportCommitStatus =
    | 'planning'
    | 'applying'
    | 'applied'
    | 'importing'
    | 'imported'
    | 'pruning'
    | 'pruned'
    | 'reconciling'
    | 'reconciled'
    | 'undoing'
    | 'failed';

export type SrcImportCommitPhase = 'config' | 'runs' | 'prune' | 'reconcile';

export interface SrcImportCategory {
    id: number;
    jobId: number;
    srcId: string;
    name: string;
    rules: string | null;
    type: 'per-game' | 'per-level';
    defaultTiming: 'realtime' | 'realtime_noloads' | 'ingame' | null;
    misc: boolean;
    sortOrder: number;
    skipped: boolean;
}

/** SRC levels: a plain ordered list. Level categories (`type: 'per-level'`) apply to every level. */
export interface SrcImportLevel {
    id: number;
    jobId: number;
    srcId: string;
    name: string;
    rules: string | null;
    sortOrder: number;
}

export interface SrcImportVariableValue {
    id: string;
    label: string;
    rules: string | null;
}

export interface SrcImportVariable {
    id: number;
    jobId: number;
    srcId: string;
    srcCategoryId: string | null;
    name: string;
    isSubcategory: boolean;
    values: SrcImportVariableValue[];
    defaultValueId: string | null;
    scope: 'global' | 'full-game' | 'all-levels' | 'single-level';
    /** Set iff scope is 'single-level'. */
    srcLevelId: string | null;
    skipped: boolean;
}

export type SrcImportMatchKind =
    | 'src_verified'
    | 'twitch'
    | 'src_name'
    | 'none';

export interface SrcImportPlayer {
    id: number;
    jobId: number;
    srcUserId: string | null;
    name: string;
    twitchLogin: string | null;
    youtubeUri: string | null;
    twitterUri: string | null;
    country: string | null;
    therunUserId: number | null;
    therunUsername: string | null;
    matchKind: SrcImportMatchKind;
}

export type SrcImportRunPlayer =
    | {
          srcUserId: string;
          /** Staged player's speedrun.com name; null if the player was not staged. */
          name: string | null;
          /** Twitch login from the player's speedrun.com profile, if any. */
          twitchLogin: string | null;
          /** therun.gg username when the player matched, else null. */
          therunUsername: string | null;
      }
    | { guestName: string };

export interface SrcImportRun {
    id: number;
    jobId: number;
    srcRunId: string;
    srcCategoryId: string;
    /** Null for full-game runs; the SRC level id for IL runs. */
    srcLevelId: string | null;
    status: 'verified' | 'new';
    realtimeMs: number | null;
    realtimeNoloadsMs: number | null;
    ingameMs: number | null;
    date: string | null;
    submittedAt: string | null;
    verifiedAt: string | null;
    srcVerifierId: string | null;
    comment: string | null;
    videoUrl: string | null;
    platformName: string | null;
    emulated: boolean;
    region: string | null;
    values: Record<string, string>;
    players: SrcImportRunPlayer[];
    playerCount: number;
}

export interface Paged<T> {
    items: T[];
    total: number;
}

// ---------------------------------------------------------------------------
// Commit plan (read-only preview) — backend `src-import/commit/types.ts`,
// docs: docs/frontend-guide-src-import.md "Commit phase" / "Plan types".
// ---------------------------------------------------------------------------

export type SrcPlanAction = 'create' | 'reuse' | 'skip';

export interface SrcCommitOverrides {
    categories?: Record<string, { action: SrcPlanAction; therunId?: number }>;
    levels?: Record<string, { action: SrcPlanAction; therunId?: number }>;
    variables?: Record<string, { action: SrcPlanAction; therunId?: number }>;
}

export interface SrcPlanCategory {
    srcId: string;
    name: string;
    type: 'per-game' | 'per-level';
    action: SrcPlanAction;
    therunId?: number;
    therunDisplay?: string;
    reason?: string;
}

export interface SrcPlanLevel {
    srcId: string;
    name: string;
    action: SrcPlanAction;
    therunId?: number;
    reason?: string;
}

export interface SrcPlanVariableTarget {
    kind: 'category' | 'template' | 'instance';
    therunId?: number;
    name: string;
}

export interface SrcPlanVariableValue {
    srcId: string;
    label: string;
    action: 'create' | 'reuse';
    /**
     * Set when this SRC value normalized to the same string as an earlier one
     * and was folded into it. Both srcIds still get a `variable-value` mapping
     * written on apply-config, pointing at the surviving canonical label.
     */
    mergedIntoSrcId?: string;
}

export interface SrcPlanVariable {
    srcId: string;
    name: string;
    role: 'subcategory' | 'filter';
    scope: string;
    targets: SrcPlanVariableTarget[];
    action: SrcPlanAction;
    values: SrcPlanVariableValue[];
    /** The storage key the variable will get (`nameNormalized`). */
    nameNormalized?: string;
    reason?: string;
}

export interface SrcPlanConflict {
    kind: 'category' | 'level' | 'variable';
    srcId: string;
    message: string;
}

export interface SrcPlanRunSummary {
    total: number;
    byStatus: { verified: number; new: number };
    guests: number;
    matched: number;
    unmappable: number;
}

export interface SrcCommitPlan {
    categories: SrcPlanCategory[];
    levels: SrcPlanLevel[];
    variables: SrcPlanVariable[];
    conflicts: SrcPlanConflict[];
    runs: SrcPlanRunSummary;
}

// ---------------------------------------------------------------------------
// User import ("import my own runs") — a distinct flow from the mod/board import
// above. Backend: docs/frontend-guide-src-import.md ("User import (me/import)")
// + therun `src/db/schema.ts`. Hand-mirrored; re-check on any schema change.
// ---------------------------------------------------------------------------

export type SrcUserImportStatus = 'queued' | 'running' | 'done' | 'failed';
export type SrcUserImportPhase = 'fetch' | 'fanout' | 'done';

/** Internal resume state — opaque to the FE, kept for completeness. */
export interface SrcUserImportCheckpoint {
    offset?: number;
    direction?: 'asc' | 'desc';
    gameIndex?: number;
}

/** One entry per SRC game the fan-out has visited so far, in srcGameId order. */
export interface SrcUserImportGameResult {
    srcGameId: string;
    srcGameName: string;
    therunGameId: number | null;
    childJobId: number | null;
    outcome: 'imported' | 'skipped' | 'failed';
    /**
     * Set when outcome !== 'imported'. Known values: 'game-busy',
     * `plan-conflicts:<n>`, 'staging' (transient), or a raw error string.
     */
    reason: string | null;
    imported: number;
    skipped: number;
    autoCreatedGame: boolean;
}

export interface SrcUserImportJob {
    id: number;
    userId: number;
    srcUserId: string;
    srcUserName: string;
    status: SrcUserImportStatus;
    phase: SrcUserImportPhase;
    checkpoint: SrcUserImportCheckpoint | null;
    gameResults: SrcUserImportGameResult[];
    runsFetched: number;
    gamesTotal: number;
    gamesDone: number;
    runsImported: number;
    runsSkipped: number;
    requestsMade: number;
    error: string | null;
    undoneAt: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    createdAt: string;
    kind: 'import' | 'sync';
    summary: SrcUserSyncSummary | null;
}

/** Whether the undo action is offered — exactly the gate the backend enforces. */
export function canUndoImport(job: SrcUserImportJob | null): boolean {
    return (
        !!job &&
        job.status === 'done' &&
        job.undoneAt === null &&
        job.gameResults.some((g) => g.outcome === 'imported')
    );
}

// ---------------------------------------------------------------------------
// Automatic sync of the user's own SRC runs — a background counterpart to the
// one-shot import above. Backend: docs/frontend-guide-src-import.md
// ("Automatic sync").
// ---------------------------------------------------------------------------

export interface SrcUserSyncSummary {
    fetched: number;
    added: number;
    linked: number;
    updated: number;
    vanished: number;
    restored: number;
    skipped: number;
    skippedReasons: Record<string, number>;
    errors: string[];
}

export type SrcLookupResult = 'matched' | 'no-match' | 'ambiguous' | 'stale';

export interface SrcUserSyncStatus {
    optOut: boolean;
    lastAt: string | null;
    nextAt: string | null;
    identity: {
        srcUserId: string;
        srcUsername: string | null;
        verifiedAt: string | null;
    } | null;
    lookupResult: SrcLookupResult | null;
    lastJob: {
        id: number;
        status: 'queued' | 'running' | 'done' | 'failed';
        finishedAt: string | null;
        error: string | null;
        summary: SrcUserSyncSummary | null;
    } | null;
}
