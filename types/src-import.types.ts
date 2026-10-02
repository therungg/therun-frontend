// speedrun.com import of a runner's own runs, from the data export they
// upload. Hand-mirrored from the backend; field names match the API exactly
// (therun docs/frontend-guide-src-file-import.md).

export type SrcUserImportStatus =
    | 'queued'
    | 'running'
    | 'done'
    | 'failed'
    /** Staged, held until an admin confirms the speedrun.com account. */
    | 'waiting';
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
    /** 'parked': kept, and imported once this game can be matched on therun.gg. */
    outcome: 'imported' | 'skipped' | 'failed' | 'parked';
    /**
     * Set when outcome !== 'imported'. Known values: 'game-busy',
     * 'game-not-matched' (parked), 'game-not-on-therun' (older jobs), 'game-purged', `plan-conflicts:<n>`, 'staging'
     * (transient), or a raw error string.
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
    /** The identity request attached to this job, if one was needed. */
    identityRequest: {
        status: SrcIdentityRequestStatus;
        createdAt: string;
        decidedAt: string | null;
    } | null;
}

export type SrcIdentityRequestStatus = 'pending' | 'approved' | 'rejected';

/** POST /src-import/me/import → 202. */
export interface SrcUserImportStart {
    jobId: number;
    /** The export's account isn't linked yet; an admin has to confirm it. */
    awaitingApproval: boolean;
}

/** A pending request, as the admin queue lists it (oldest first). */
export interface SrcIdentityRequest {
    id: number;
    userId: number;
    username: string;
    srcUserId: string;
    srcUsername: string;
    /**
     * The name we already hold for srcUserId from earlier imports; null when
     * the id has never been seen. An upload whose name differs is refused.
     */
    knownSrcUsername: string | null;
    createdAt: string;
    /** Runs staged on the waiting job. */
    runCount: number;
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

/** Counts from an automatic sync job; null on an import. */
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
