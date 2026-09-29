'use server';

import { getSession } from '~src/actions/session.action';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { updateManualTime } from '~src/lib/moderation/manual-times';
import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    revalidateAffectedBoards,
    revalidateBoardsForRuleScope,
    revalidateRunDetails,
} from '~src/lib/moderation/revalidate-boards';
import { editRun } from '~src/lib/moderation/run-edit';
import {
    getManualTimeByIdAsViewer,
    getRunByIdAsViewer,
} from '~src/lib/run-detail-viewer';
import type {
    RunSplit,
    VodReview,
    VodReviewPatch,
} from '../../../../../../types/leaderboards.types';
import type { AffectedLeaderboard } from '../../../../../../types/moderation.types';

type Fail = { error: string };

export type VodReviewTarget =
    | { kind: 'run'; runId: number }
    | { kind: 'manual'; manualTimeId: number; gameId: number };

const SAVE_REASON = 'Saved VOD review markers from the board mod drawer.';
const CLEAR_REASON = 'Cleared VOD review markers from the board mod drawer.';

function retimeReason(patch: VodReviewPatch): string {
    const start = patch.markers.find((m) => m.kind === 'start')?.frame ?? 0;
    const end = patch.markers.find((m) => m.kind === 'end')?.frame ?? 0;
    const offset = patch.offsetMs
        ? `, offset ${patch.offsetMs > 0 ? '+' : '−'}${(Math.abs(patch.offsetMs) / 1000).toFixed(3)} s`
        : '';
    return `Retimed from VOD: frames ${start}→${end} at ${patch.fps} fps${offset}.`;
}

async function gameVodFps(gameId: number): Promise<number> {
    const meta = await getGameMetadata(gameId).catch(() => null);
    return meta?.vodFps ?? 60;
}

/** The current review + what the retime line compares against. Uncached. */
export async function loadVodReviewAction(target: VodReviewTarget): Promise<
    | {
          ok: true;
          vodReview: VodReview | null;
          vodUrl: string | null;
          realTimeMs: number | null;
          timing: 'realtime' | 'gametime';
          splits: RunSplit[];
          /** The game's VOD frame rate, for a run with no review yet. */
          defaultFps: number;
      }
    | Fail
> {
    const session = await getSession();
    if (!session?.id) return { error: 'Not signed in.' };
    try {
        if (target.kind === 'run') {
            const d = await getRunByIdAsViewer(target.runId, session.id);
            if (!d) return { error: 'Run not found.' };
            return {
                defaultFps: await gameVodFps(d.gameId),
                ok: true,
                vodReview: d.vodReview ?? null,
                vodUrl: d.vodUrl,
                realTimeMs: d.realTime ?? d.time,
                timing: 'realtime',
                splits: d.splits ?? [],
            };
        }
        const d = await getManualTimeByIdAsViewer(
            target.manualTimeId,
            session.id,
        );
        if (!d) return { error: 'Set time not found.' };
        return {
            defaultFps: await gameVodFps(d.gameId),
            ok: true,
            vodReview: d.vodReview ?? null,
            vodUrl: d.evidenceUrl,
            realTimeMs: d.timing === 'realtime' ? d.timeMs : null,
            timing: d.timing,
            splits: [],
        };
    } catch {
        return { error: 'Could not load the review.' };
    }
}

export async function saveVodReviewAction(
    gameSlug: string,
    target: VodReviewTarget,
    patch: VodReviewPatch | null,
    /**
     * `reason`: the moderator's words, kept ahead of the frame line.
     * `board`: the entry's board, cleared after a retime; without it every
     * board of the game is.
     */
    opts: {
        applyRetimeMs?: number;
        /** Typed alongside a retime. The markers only measure real time; IGT
         *  and LRT are read off the game, never off the video. */
        gameTimeMs?: number;
        /** The entry's board clock. A manual time's `timeMs` is in it, so on
         *  a game-timed board the retimed real time is its second clock. */
        primaryTiming?: 'rt' | 'gt';
        reason?: string;
        board?: AffectedLeaderboard;
    } = {},
): Promise<{ ok: true } | Fail> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };
    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name))
        return { error: 'Not authorized to moderate this game.' };

    const reason =
        patch === null
            ? CLEAR_REASON
            : opts.applyRetimeMs != null
              ? opts.reason
                  ? `${opts.reason}${opts.reason.trimEnd().endsWith('.') ? '' : '.'} ${retimeReason(patch)}`
                  : retimeReason(patch)
              : SAVE_REASON;
    // The offset only moves the applied time; the stored review is markers.
    const stored =
        patch === null
            ? null
            : {
                  fps: patch.fps,
                  markers: patch.markers,
                  retimedMs: patch.retimedMs,
              };
    try {
        if (target.kind === 'run') {
            await editRun(session.id, target.runId, {
                vodReview: stored,
                ...(opts.applyRetimeMs != null
                    ? { time: opts.applyRetimeMs }
                    : {}),
                ...(opts.gameTimeMs != null
                    ? { gameTime: opts.gameTimeMs }
                    : {}),
                reason,
            });
            revalidateRunDetails([target.runId]);
        } else {
            await updateManualTime(
                session.id,
                target.gameId,
                target.manualTimeId,
                {
                    vodReview: stored,
                    ...(opts.applyRetimeMs == null
                        ? {}
                        : opts.primaryTiming === 'gt'
                          ? {
                                ...(opts.gameTimeMs != null
                                    ? { timeMs: opts.gameTimeMs }
                                    : {}),
                                secondary: {
                                    timing: 'realtime' as const,
                                    timeMs: opts.applyRetimeMs,
                                },
                            }
                          : { timeMs: opts.applyRetimeMs }),
                    reason,
                },
            );
            revalidateRunDetails([], [target.manualTimeId]);
        }
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Could not save the review. Please try again.' };
    }
    // A retime changes the time on the board; markers alone do not.
    if (opts.applyRetimeMs != null) {
        if (opts.board) {
            await revalidateAffectedBoards(game.id, game.name, [opts.board]);
        } else {
            await revalidateBoardsForRuleScope(game.id, game.name, null);
        }
    }
    return { ok: true };
}

const UNDO_RETIME_REASON = 'Undo of retime';

/**
 * Undoes the latest retime: the clocks and the moderator's markers go back
 * to what they were before it. The backend refuses when a clock changed after
 * the retime, and says so.
 */
export async function undoRetimeAction(
    gameSlug: string,
    target: VodReviewTarget,
    board?: AffectedLeaderboard,
): Promise<{ ok: true } | Fail> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };
    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name))
        return { error: 'Not authorized to moderate this game.' };
    try {
        if (target.kind === 'run') {
            await editRun(session.id, target.runId, {
                undoRetime: true,
                reason: UNDO_RETIME_REASON,
            });
            revalidateRunDetails([target.runId]);
        } else {
            await updateManualTime(
                session.id,
                target.gameId,
                target.manualTimeId,
                { undoRetime: true, reason: UNDO_RETIME_REASON },
            );
            revalidateRunDetails([], [target.manualTimeId]);
        }
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Could not undo the retime. Please try again.' };
    }
    if (board) {
        await revalidateAffectedBoards(game.id, game.name, [board]);
    } else {
        await revalidateBoardsForRuleScope(game.id, game.name, null);
    }
    return { ok: true };
}
