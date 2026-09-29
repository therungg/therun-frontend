// Mirrors src/api/me/pb-submission.ts on the backend. Field names and casing are
// exactly what it reads and writes — do not "fix" them.

/** Everything the submission form needs for one held run. */
export interface PbSubmissionForm {
    runId: number;
    gameId: number;
    categoryId: number;
    subcategoryKey: string;
    /** What the timer recorded. The runner may submit a different, retimed value. */
    timerTimeMs: number;
    timerGameTimeMs: number | null;
    startedAt: string | null;
    endedAt: string;
    /** Null for an offBoard run: it was never held for the runner. */
    heldAt: string | null;
    /**
     * A board baseline took it off for not being on speedrun.com. Sending it
     * takes the video only; the time stands as the timer recorded it.
     */
    offBoard: boolean;
    vodUrl: string | null;
    /** True only where the board's own video rule already requires one at this rank. */
    videoRequired: boolean;
    rules: { game: string | null; category: string | null };
    variables: unknown;
    validCombinations: string[] | null;
    wouldBeRank: number;
}

export interface PbSubmissionInput {
    /** The runner saying the run was legitimate. The backend refuses without it. */
    legitimate: true;
    timeMs: number;
    gameTimeMs?: number | null;
    vodUrl?: string;
    variables?: Record<string, unknown>;
    vodReview?: unknown;
}
