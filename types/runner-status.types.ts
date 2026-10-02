// Runner-facing run status, shared by the run page, the Submissions/
// Leaderboards tab and notifications. Derived server-side by the backend's
// `runnerStatus()` (docs/frontend-guide-run-status.md) — the frontend never
// computes this itself, only renders it.

export type RunnerStatus =
    | 'on_board'
    | 'waiting_mod'
    | 'needs_you'
    | 'beaten'
    | 'rejected'
    | 'removed_by_you'
    | 'removed_by_mod'
    | 'off_board'
    | 'no_board';

export type RunnerNextStep =
    | 'add_video'
    | 'submit'
    | 'fix_runners'
    | 'appeal'
    | 'restore'
    | 'move';

export type VodState = 'has' | 'missing' | 'required_missing';

export interface SubmissionItem {
    kind: 'run' | 'manual';
    id: number; // runId for kind=run, manualTimeId for kind=manual
    gameId: number;
    categoryId: number;
    categoryDisplay: string | null;
    subcategoryKey: string;
    timeMs: number;
    gameTimeMs: number | null;
    endedAt: string | null;
    decidedAt: string | null;
    vodUrl: string | null;
    vodState: VodState;
    status: RunnerStatus;
    nextStep: RunnerNextStep | null;
    reason: string | null;
}

export interface SubmissionsOverview {
    runner: { userId: number; username: string };
    scope: 'all' | 'moderated';
    moderatedGameIds: number[] | null;
    needsYou: SubmissionItem[];
    items: SubmissionItem[];
}
