// One vocabulary for run status/held/review-reason copy (spec §5). Every
// panel that shows a run's state reads from here — do not invent new labels.

import type {
    RunnerNextStep,
    RunnerStatus,
} from '../../../types/runner-status.types';

export type RunStatus = 'pending' | 'verified' | 'rejected';

export const STATUS_LABEL: Record<RunStatus, string> = {
    pending: 'Pending',
    verified: 'Verified',
    rejected: 'Rejected',
};

/** Removed (excluded) wins over the verdict: the run is off the board either way. */
export function statusLabel(status: RunStatus, excluded = false): string {
    return excluded ? 'Removed' : STATUS_LABEL[status];
}

export const HELD_LABEL: Record<string, string> = {
    missing_video: 'Waiting for a video',
    awaiting_runner: 'Waiting for the runner',
    below_minimum: 'Below the minimum time',
    banned: 'Runner banned',
    mod_override: 'Kept off by a moderator',
    participants_incomplete: 'Co-op runners missing',
    participants_too_many: 'Too many co-op runners',
    stale_timer_attempt: 'Old timer attempt',
    no_src_evidence: 'Not submitted to SRC',
};

export function heldLabel(reason: string | null | undefined): string | null {
    if (!reason) return null;
    return HELD_LABEL[reason] ?? 'Held off the board';
}

export const REVIEW_REASON_LABEL: Record<string, string> = {
    reported: 'Reported',
    appeal: 'Appealed',
    pending_self_claim: 'Manual submission',
};

// Runner status: one status per run, in the runner's own terms (see
// docs/frontend-guide-run-status.md). Every surface a runner reads (run
// page, Submissions/Leaderboards tab, notifications) reads these exact
// strings — do not invent new labels here either.
export const RUNNER_STATUS_LABEL: Record<RunnerStatus, string> = {
    on_board: 'Verified',
    waiting_mod: 'Waiting for a moderator',
    needs_you: 'Needs you',
    beaten: 'Beaten',
    rejected: 'Rejected',
    removed_by_you: 'Removed by you',
    removed_by_mod: 'Removed by a moderator',
    off_board: 'Held',
    no_board: 'Not on a board',
};

export const RUNNER_NEXT_STEP_LABEL: Record<RunnerNextStep, string> = {
    add_video: 'Add a video',
    submit: 'Submit for verification',
    fix_runners: 'Add your co-op runners',
    appeal: 'Appeal',
    restore: 'Put back on the boards',
    move: 'Move to a board',
};

/**
 * A run the runner can submit for verification that nothing waits on them
 * for: one a baseline took off, or a pending PB that has since been beaten.
 * However it got there, the runner sees the same thing.
 */
const isSubmittable = (status: RunnerStatus, nextStep: RunnerNextStep | null) =>
    nextStep === 'submit' && (status === 'off_board' || status === 'beaten');

/** The status's name, in the runner's terms. */
export function runnerStatusLabel(
    status: RunnerStatus,
    nextStep: RunnerNextStep | null = null,
): string {
    return isSubmittable(status, nextStep)
        ? 'Not on the board'
        : RUNNER_STATUS_LABEL[status];
}

/** The "why" line under a runner status; null when the status needs no
 * explanation beyond its label. */
export function runnerStatusHint(
    status: RunnerStatus,
    reason: string | null,
    nextStep: RunnerNextStep | null = null,
): string | null {
    if (isSubmittable(status, nextStep)) {
        return status === 'beaten'
            ? 'Beaten by a faster run of yours · not verified'
            : 'Not verified';
    }
    switch (status) {
        case 'needs_you':
            return reason === 'missing_video'
                ? 'This board needs a video before the run goes on it.'
                : reason === 'awaiting_runner'
                  ? 'A new PB waits for you to submit it.'
                  : reason === 'participants_incomplete'
                    ? 'Add the other runners before it goes on the board.'
                    : null;
        case 'waiting_mod':
            return 'Pending until a moderator looks at it.';
        case 'beaten':
            return 'A faster run of yours is on the board. Nothing to do.';
        case 'rejected':
            return reason;
        case 'removed_by_mod':
        case 'removed_by_you':
            return reason;
        case 'off_board':
            return reason ? heldLabel(reason) : null;
        case 'no_board':
            return 'This category has no board. Move the run to one to put it on the boards.';
        default:
            return null;
    }
}
