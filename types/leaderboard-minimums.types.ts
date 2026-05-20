export interface MinimumTime {
    subcategoryKey: string;
    minTimeMs: number | null;
    minGameTimeMs: number | null;
    setBy: number | null;
    updatedAt: string;
}

export interface UpsertMinimumTimeInput {
    subcategoryKey: string;
    minTimeMs: number | null;
    minGameTimeMs: number | null;
}

export interface UpsertMinimumTimeResult {
    updated: boolean;
    flagged: number;
    unflagged: number;
}

export interface DeleteMinimumTimeResult {
    deleted: boolean;
    unflagged: number;
}
