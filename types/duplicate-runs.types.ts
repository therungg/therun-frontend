// Standalone mirror of the backend duplicate-run-detection wire shapes.
// Backend source of truth: therun/src/db/schema.ts (DuplicateSideSignals,
// DuplicateFindingSignals, DuplicateFindingState) and
// therun/src/api/duplicate-runs/handler.ts (response envelopes).
// See docs/frontend-guide-duplicate-runs.md for the endpoint table and
// behavioral notes. Every backend `Date` is a `string` (ISO-8601) on the wire.

export interface DuplicateSideSignals {
    userId: number;
    /** ISO strings; null when every row predates created_at stamping. */
    minCreatedAt: string | null;
    maxCreatedAt: string | null;
    /** max-min created_at across the side's duplicated rows, in ms. */
    blockArrivalSpanMs: number | null;
    /** Non-duplicated attempts on this game within +/-30d of the duplicated block. */
    organicNearCount: number;
    lastOrganicEndedAt: string | null;
}

export interface DuplicateFindingSignals {
    a: DuplicateSideSignals;
    b: DuplicateSideSignals;
}

export type DuplicateFindingState = 'open' | 'dismissed' | 'actioned';

/** One list-item / finding row, as returned by GET /duplicate-runs. */
export interface DuplicateRunFinding {
    id: number;
    gameId: number;
    gameName: string;
    userAId: number;
    userBId: number;
    userA: { id: number; username: string | null };
    userB: { id: number; username: string | null };
    duplicateCount: number;
    firstDupEndedAt: string;
    lastDupEndedAt: string;
    categoryIds: number[];
    involvesPb: boolean;
    /** Capped at 20 per side; not necessarily current — see the frontend guide. */
    sampleRunIds: number[];
    signals: DuplicateFindingSignals;
    state: DuplicateFindingState;
    verdictNote: string | null;
    actedBy: number | null;
    actedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface DuplicateRunListResponse {
    items: DuplicateRunFinding[];
    page: number;
    pageSize: number;
    total: number;
}

/** One duplicated or organic run row, as returned inside DuplicateRunDetailSide. */
export interface DuplicateRunDetailRow {
    id: number;
    categoryId: number;
    time: number;
    gameTime: number | null;
    endedAt: string;
    startedAt: string | null;
    createdAt: string | null;
    isPb: boolean;
    excluded: boolean;
}

export interface DuplicateRunDetailSide {
    user: { id: number; username: string | null };
    dupRows: DuplicateRunDetailRow[];
    /** Capped at 200, newest endedAt first. */
    organicRows: DuplicateRunDetailRow[];
}

/**
 * The finding embedded in GET /duplicate-runs/{id} does NOT include
 * gameName/userA/userB (unlike the list-item shape) — only the raw finding
 * columns. Use `sides.a.user` / `sides.b.user` for display names.
 */
export type DuplicateRunDetailFinding = Omit<
    DuplicateRunFinding,
    'gameName' | 'userA' | 'userB'
>;

export interface DuplicateRunDetail {
    finding: DuplicateRunDetailFinding;
    /** Display names for every distinct categoryId appearing in either side's dupRows/organicRows. */
    categories: Array<{ id: number; display: string }>;
    sides: {
        a: DuplicateRunDetailSide;
        b: DuplicateRunDetailSide;
    };
}

export type DuplicateVerdictInput =
    | { action: 'dismiss'; note: string }
    | { action: 'exclude'; side: 'a' | 'b' | 'both'; note: string };

export interface DuplicateScanInfo {
    id: number;
    mode: string;
    status: string;
    rowsExamined: number;
    findingsTouched: number;
    startedAt: string;
    /** null while the scan is still running. */
    finishedAt: string | null;
}
