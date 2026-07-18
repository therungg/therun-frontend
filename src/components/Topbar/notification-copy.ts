import type { NotificationRow } from '../../../types/moderation.types';

function str(v: unknown): string | null {
    return typeof v === 'string' && v.length > 0 ? v : null;
}

function num(v: unknown): number | null {
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
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
        default:
            return 'You have a new notification.';
    }
}

/**
 * Link target for a notification, when the payload carries enough to build one.
 * Every field is typeof-guarded — a missing or mistyped field means no link
 * rather than a broken one (see W4 handoff for payload guarantees).
 */
export function linkFor(n: NotificationRow): string | null {
    const p = (n.payload ?? {}) as Record<string, unknown>;
    const gameSlug = str(p.gameSlug);

    switch (n.type) {
        case 'board_claim_approved':
            return gameSlug ? `/games-v2/${gameSlug}/setup` : null;
        case 'board_claim_denied':
            return gameSlug ? `/games-v2/${gameSlug}` : null;
        case 'verdict_applied': {
            const runId = num(p.runId);
            return gameSlug && runId !== null
                ? `/games-v2/${gameSlug}/run/${runId}`
                : null;
        }
        case 'manual_time_verdict':
        case 'manual_time_created':
        case 'manual_time_deleted': {
            const manualTimeId = num(p.manualTimeId);
            return gameSlug && manualTimeId !== null
                ? `/games-v2/${gameSlug}/manual/${manualTimeId}`
                : null;
        }
        default:
            return null;
    }
}
