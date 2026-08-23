// Mirror of the backend's speedrun.com import (dry-run) contract —
// therun-backend docs/frontend-guide-src-import.md. Field names match the
// API exactly; keep in sync with `therun/src/src-import/types.ts`.

export type SrcImportStatus = 'queued' | 'running' | 'done' | 'failed';
export type SrcImportPhase = 'meta' | 'runs' | 'matching' | 'done';

export interface SrcImportCheckpoint {
    categoryIndex: number;
    status: 'verified' | 'new';
    offset: number;
    dateFrom?: string;
}

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
    error: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    createdAt: string;
}

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

export type SrcImportMatchKind = 'src_verified' | 'twitch' | 'none';

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
