import type { NotificationRow } from '../../../types/moderation.types';

function str(v: unknown): string | null {
    return typeof v === 'string' && v.length > 0 ? v : null;
}

/** "Any% run of Celeste" / "run of Celeste" / null when no game name is known. */
function runSubject(
    gameDisplay: string | null,
    categoryDisplay: string | null,
) {
    if (!gameDisplay) return null;
    return categoryDisplay
        ? `${categoryDisplay} run of ${gameDisplay}`
        : `run of ${gameDisplay}`;
}

/** "Any% time for Celeste" / "time for Celeste" / null when no game name is known. */
function timeSubject(
    gameDisplay: string | null,
    categoryDisplay: string | null,
) {
    if (!gameDisplay) return null;
    return categoryDisplay
        ? `${categoryDisplay} time for ${gameDisplay}`
        : `time for ${gameDisplay}`;
}

/**
 * Human-readable description of a notification. Payload fields are opportunistic
 * (backend does not yet guarantee gameDisplay/categoryDisplay on every type — see
 * docs/backend-handoffs-leaderboard-ux.md W4) so every read is typeof-guarded and
 * falls back to the existing generic copy when a field is missing or mistyped.
 */
export function describe(n: NotificationRow): string {
    const p = (n.payload ?? {}) as Record<string, unknown>;
    const gameDisplay = str(p.gameDisplay);
    const categoryDisplay = str(p.categoryDisplay);

    switch (n.type) {
        case 'manual_time_created':
            return 'A moderator set a leaderboard time for you.';
        case 'manual_time_verdict': {
            const subject = timeSubject(gameDisplay, categoryDisplay);
            if (p.verdict === 'verified') {
                return subject
                    ? `Your claimed ${subject} was verified.`
                    : 'Your claimed time was verified.';
            }
            return subject
                ? `Your claimed ${subject} was rejected.`
                : 'Your claimed time was rejected.';
        }
        case 'manual_time_deleted':
            return 'A moderator removed a leaderboard time set for you.';
        case 'verdict_applied': {
            const subject = runSubject(gameDisplay, categoryDisplay);
            if (p.action === 'verify') {
                return subject
                    ? `Your ${subject} was verified by a moderator.`
                    : 'One of your runs was verified by a moderator.';
            }
            if (p.action === 'reject') {
                return subject
                    ? `Your ${subject} was rejected by a moderator.`
                    : 'One of your runs was rejected by a moderator.';
            }
            if (p.action === 'unreject') {
                return subject
                    ? `Your ${subject} was reinstated by a moderator.`
                    : 'One of your runs was reinstated by a moderator.';
            }
            return 'A moderator updated one of your runs.';
        }
        case 'board_claim_approved':
            return `Your application to moderate ${gameDisplay ?? 'this game'} was approved — set up your board`;
        case 'board_claim_denied': {
            const reason = str(p.reason);
            return `Your application to moderate ${gameDisplay ?? 'this game'} was declined${reason ? ` (${reason})` : ''}`;
        }
        case 'run_needs_video': {
            const subject = runSubject(gameDisplay, categoryDisplay);
            return subject
                ? `Your ${subject} needs a video before it goes on the board.`
                : 'One of your runs needs a video before it goes on the board.';
        }
        case 'pb_awaiting_submission':
            return 'A new personal best is waiting for you to submit it.';
        case 'run_video_waived': {
            const subject = runSubject(gameDisplay, categoryDisplay);
            return subject
                ? `A moderator accepted your ${subject} without a video.`
                : 'A moderator accepted one of your runs without a video.';
        }
        default:
            return 'You have a new notification.';
    }
}

/**
 * Where clicking a notification takes the runner: the place they can act on
 * it. Only for notifications that ask something of them; the rest stay plain.
 */
export function hrefFor(
    n: NotificationRow,
    username: string | null,
): string | null {
    const runId = n.payload?.runId;
    if (typeof runId !== 'number') return null;
    if (n.type === 'pb_awaiting_submission') return `/submissions/${runId}`;
    if (n.type === 'run_needs_video' && username) {
        return `/${encodeURIComponent(username)}/submissions?run=${runId}`;
    }
    return null;
}
