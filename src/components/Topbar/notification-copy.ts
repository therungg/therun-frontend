import {
    buildManageHref,
    buildManualTimeHref,
    buildRunHref,
    gameSegment,
} from '~src/lib/board-url';
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
 * Human-readable description of a notification. Every type now carries
 * gameDisplay/categoryDisplay (filled in on read for older rows), but either
 * can be null for a deleted game or category, so every read is typeof-guarded
 * and falls back to the generic copy when a field is missing or mistyped.
 */
export function describe(n: NotificationRow): string {
    const p = (n.payload ?? {}) as Record<string, unknown>;
    const gameDisplay = str(p.gameDisplay);
    const categoryDisplay = str(p.categoryDisplay);

    switch (n.type) {
        case 'manual_time_created': {
            const subject = timeSubject(gameDisplay, categoryDisplay);
            return subject
                ? `A moderator set your ${subject}.`
                : 'A moderator set a leaderboard time for you.';
        }
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
        case 'manual_time_deleted': {
            const subject = timeSubject(gameDisplay, categoryDisplay);
            return subject
                ? `A moderator removed your ${subject}.`
                : 'A moderator removed a leaderboard time set for you.';
        }
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
        case 'run_video_waived': {
            const subject = runSubject(gameDisplay, categoryDisplay);
            return subject
                ? `A moderator accepted your ${subject} without a video.`
                : 'A moderator accepted one of your runs without a video.';
        }
        case 'pb_awaiting_submission': {
            const subject = runSubject(gameDisplay, categoryDisplay);
            return subject
                ? `Your ${subject} is waiting for you to submit it.`
                : 'One of your runs is waiting for you to submit it.';
        }
        case 'runs_off_board': {
            const count =
                typeof p.runs === 'number' && p.runs > 0 ? p.runs : null;
            const game = gameDisplay ?? 'a game';
            if (count === null) {
                return `Some of your runs for ${game} came off the board because they're not on speedrun.com.`;
            }
            if (count === 1) {
                return `Your run for ${game} came off the board because it's not on speedrun.com.`;
            }
            return `${count} of your runs for ${game} came off the board because they're not on speedrun.com.`;
        }
        default:
            return 'You have a new notification.';
    }
}

function positiveInt(v: unknown): number | null {
    return typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null;
}

/**
 * The page a notification is about. Runs and manual times open their own
 * page, which anyone can view. A held PB opens its submission form. Board
 * claims open the game's console: an approved claimant moderates it now, and
 * a declined one sees the door with the option to apply again. A deleted
 * manual time has no page of its own and boards are not public yet, so it
 * opens the game's public stats page. Null when the payload lacks what the
 * target needs (rows written before runId / manualTimeId were stored).
 */
export function linkFor(n: NotificationRow): string | null {
    const p = (n.payload ?? {}) as Record<string, unknown>;
    const game = str(p.gameSlug);
    const runId = positiveInt(p.runId);
    const manualTimeId = positiveInt(p.manualTimeId);

    switch (n.type) {
        case 'run_needs_video':
        case 'run_video_waived':
        case 'verdict_applied':
            return game && runId != null ? buildRunHref(game, runId) : null;
        case 'pb_awaiting_submission':
            return runId != null ? `/submissions/${runId}` : null;
        case 'manual_time_created':
        case 'manual_time_verdict':
            return game && manualTimeId != null
                ? buildManualTimeHref(game, manualTimeId)
                : null;
        case 'manual_time_deleted': {
            const ref = str(p.gameDisplay) ?? game;
            return ref ? `/games/${gameSegment(ref)}` : null;
        }
        case 'board_claim_approved':
        case 'board_claim_denied':
            return game ? buildManageHref(game) : null;
        case 'runs_off_board':
            return '/submissions';
        default:
            if (!game) return null;
            if (runId != null) return buildRunHref(game, runId);
            if (manualTimeId != null) {
                return buildManualTimeHref(game, manualTimeId);
            }
            return null;
    }
}
