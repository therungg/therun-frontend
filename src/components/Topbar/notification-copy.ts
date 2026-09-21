import {
    buildManageHref,
    buildManualTimeHref,
    buildRunHref,
    gameSegment,
} from '~src/lib/board-url';
import { runnerProfileHref } from '~src/lib/runner-profile-href';
import type { NotificationRow } from '../../../types/moderation.types';

function str(v: unknown): string | null {
    return typeof v === 'string' && v.length > 0 ? v : null;
}

/** Names of a `left` array entry — masked already, render as-is. */
function leftNames(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    const names: string[] = [];
    for (const entry of v) {
        if (
            entry &&
            typeof entry === 'object' &&
            typeof (entry as Record<string, unknown>).name === 'string'
        ) {
            names.push((entry as Record<string, unknown>).name as string);
        }
    }
    return names;
}

/** "X" / "X and Y" / "X, Y, and Z" — several departures read naturally. */
function joinNames(names: string[]): string {
    if (names.length === 0) return 'A runner';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

/** "{gameDisplay} — {categoryDisplay} run" / "{gameDisplay} run" / "run" —
 * the co-op notices' shared subject line. */
function coopRunLabel(
    gameDisplay: string | null,
    categoryDisplay: string | null,
): string {
    if (gameDisplay && categoryDisplay) {
        return `${gameDisplay} — ${categoryDisplay} run`;
    }
    if (gameDisplay) return `${gameDisplay} run`;
    return 'run';
}

/** "this board credits 2–4 runners" / "2 runners" / "2 or more runners" —
 * only when `players` is present (guide §4). */
function playersRangeSentence(v: unknown): string | null {
    if (!v || typeof v !== 'object') return null;
    const { min, max } = v as { min?: unknown; max?: unknown };
    if (typeof min !== 'number') return null;
    if (max == null) return `This board credits ${min} or more runners.`;
    if (typeof max === 'number' && max === min) {
        return `This board credits ${min} runners.`;
    }
    if (typeof max === 'number') {
        return `This board credits ${min}–${max} runners.`;
    }
    return null;
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
            return `Your application to moderate ${gameDisplay ?? 'this game'} was approved. Set up your board`;
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
        case 'run_participant_added': {
            // addedByName is already masked (guide §4) — render it as-is,
            // never resolve addedByUserId to a name.
            const addedByName = str(p.addedByName) ?? 'A runner';
            if (gameDisplay && categoryDisplay) {
                return `${addedByName} credited you on a ${gameDisplay} — ${categoryDisplay} run.`;
            }
            if (gameDisplay) {
                return `${addedByName} credited you on a ${gameDisplay} run.`;
            }
            return `${addedByName} credited you on a run.`;
        }
        case 'run_roster_incomplete': {
            const reason = str(p.reason) ?? 'participants_incomplete';
            const runLabel = coopRunLabel(gameDisplay, categoryDisplay);
            const has = gameDisplay || categoryDisplay;
            const left = leftNames(p.left);
            let sentence: string;
            if (reason === 'participants_too_many') {
                // Never the "filled in" line here — nobody is missing.
                sentence = has
                    ? `Your ${runLabel} credits more runners than this board does.`
                    : 'One of your runs credits more runners than its board does.';
            } else if (left.length > 0) {
                const names = joinNames(left);
                const verb = left.length === 1 ? 'is' : 'are';
                sentence = has
                    ? `${names} ${verb} no longer credited, and your ${runLabel} is off the board until its runners are filled in.`
                    : `${names} ${verb} no longer credited, and one of your runs is off the board until its runners are filled in.`;
            } else {
                sentence = has
                    ? `Your ${runLabel} is off the board until its runners are filled in.`
                    : 'One of your runs is off the board until its runners are filled in.';
            }
            const range = playersRangeSentence(p.players);
            return range ? `${sentence} ${range}` : sentence;
        }
        case 'run_participant_left': {
            const left = leftNames(p.left);
            const names = joinNames(left);
            const runLabel = coopRunLabel(gameDisplay, categoryDisplay);
            const removedByName = str(p.removedByName);
            if (removedByName) {
                return `${removedByName} took ${names} off your ${runLabel}.`;
            }
            const verb = left.length === 1 ? 'is' : 'are';
            return `${names} ${verb} no longer credited on your ${runLabel}.`;
        }
        case 'run_participant_removed': {
            const removedByName = str(p.removedByName) ?? 'A moderator';
            if (gameDisplay && categoryDisplay) {
                return `${removedByName} took you off a ${gameDisplay} — ${categoryDisplay} run.`;
            }
            if (gameDisplay) {
                return `${removedByName} took you off a ${gameDisplay} run.`;
            }
            return `${removedByName} took you off a run.`;
        }
        case 'runs_imported_credit': {
            // Not documented in docs/frontend-guide-co-op-runs.md as of this
            // pass — the exact payload shape is unconfirmed; this reads the
            // standard board fields plus a `runs` count every notification
            // row can carry (see `runs_off_board` above), and degrades to a
            // generic sentence when neither is present.
            const count =
                typeof p.runs === 'number' && p.runs > 0 ? p.runs : null;
            if (gameDisplay && count != null) {
                return count === 1
                    ? `The importer credited you on a ${gameDisplay} run.`
                    : `The importer credited you on ${count} ${gameDisplay} runs.`;
            }
            if (gameDisplay) {
                return `The importer credited you on ${gameDisplay} runs.`;
            }
            if (count != null) {
                return count === 1
                    ? 'The importer credited you on a run.'
                    : `The importer credited you on ${count} runs.`;
            }
            return 'The importer credited you on some of your runs.';
        }
        case 'runs_off_board': {
            const count =
                typeof p.runs === 'number' && p.runs > 0 ? p.runs : null;
            const game = gameDisplay ?? 'a game';
            if (count === null) {
                return `Some of your runs for ${game} came off the board: they're not on the game's official leaderboard.`;
            }
            if (count === 1) {
                return `Your run for ${game} came off the board: it's not on the game's official leaderboard.`;
            }
            return `${count} of your runs for ${game} came off the board: they're not on the game's official leaderboard.`;
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
        case 'run_participant_added':
        case 'run_roster_incomplete':
        case 'run_participant_left':
        case 'run_participant_removed':
            // Same run link the existing run notifications build — subcategoryKey
            // (`""` on a plain category board) plays no part in it. There is no
            // route for a run by id alone (every run page is scoped under its
            // game's slug) — a payload with a null/absent gameSlug (a deleted
            // game) leaves this row without a link, same as it always has.
            return game && runId != null ? buildRunHref(game, runId) : null;
        case 'runs_imported_credit': {
            // Covers many runs, not one — links to the runner's own
            // leaderboards profile instead of any single run (see the brief:
            // this type isn't in the guide, and the payload field it reads,
            // `runnerName`, is inferred).
            const name = str(p.runnerName);
            return name ? runnerProfileHref(name) : null;
        }
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
