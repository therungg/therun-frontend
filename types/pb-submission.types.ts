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
    heldAt: string;
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

/** Mirrors VideoRule in the backend's verification-settings/types.ts. */
export interface VideoRule {
    require: 'nothing' | 'top_n' | 'under_time' | 'everything';
    topN?: number;
    timeMs?: number;
    onMissing: 'hide' | 'flag';
}

/**
 * One run waiting on its runner, from `GET /v1/me/pb-submissions?include=video`.
 * `video`: off its board until the runner adds a video.
 * `submit`: held until the runner submits it.
 */
export interface WaitingRun {
    kind: 'video' | 'submit';
    runId: number;
    gameId: number;
    gameSlug: string | null;
    gameDisplay: string | null;
    gameImage: string | null;
    categoryId: number;
    categoryDisplay: string | null;
    subcategoryKey: string;
    timeMs: number;
    gameTimeMs: number | null;
    /** When it started waiting: the run's end for `video`, the hold for `submit`. */
    since: string;
    wouldBeRank: number;
    videoRule: VideoRule;
}
