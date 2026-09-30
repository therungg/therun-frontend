/** Mirrors therun/src/leaderboards/verdicts/reject-options.ts. */

export type RejectWithout = number[] | 'all' | null;

export interface RejectOptionsRun {
    runId: number;
    timeMs: number | null;
    endedAt: string | null;
    status: string;
    isCurrentEntry: boolean;
}

export type RejectEntryAfter =
    | { kind: 'run'; runId: number; timeMs: number; endedAt: string | null }
    | { kind: 'manual'; runId: null; timeMs: number; endedAt: null }
    | null;

export interface RejectOptions {
    runner: {
        name: string;
        userId: number | null;
        teamKey: string;
        isCoop: boolean;
    };
    board: {
        categoryId: number;
        categoryDisplay: string;
        subcategoryKey: string;
    };
    runs: RejectOptionsRun[];
    allRunIds: number[];
    entryAfter: RejectEntryAfter;
    bans: { category: boolean; game: boolean };
}
