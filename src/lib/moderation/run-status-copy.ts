// One vocabulary for run status/held/review-reason copy (spec §5). Every
// panel that shows a run's state reads from here — do not invent new labels.

import type { ReviewReason } from '../../../types/run-review.types';

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
};

export function heldLabel(reason: string | null | undefined): string | null {
    if (!reason) return null;
    return HELD_LABEL[reason] ?? 'Held off the board';
}

export const REVIEW_REASON_LABEL: Record<string, string> = {
    reported: 'Reported',
    appeal: 'Appeal',
    pending_self_claim: 'Typed-in time',
};

/** One line for the "why it's here" band and the queue row. */
export function reviewReasonLine(r: ReviewReason): string {
    const head = REVIEW_REASON_LABEL[r.reason];
    if (head && r.text) return `${head}: “${r.text}”`;
    if (head) return head;
    const detail =
        typeof r.details.reason === 'string' ? r.details.reason : null;
    return detail ?? r.reason.replace(/_/g, ' ');
}
