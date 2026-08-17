'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { updateManualTime } from '~src/lib/moderation/manual-times';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { revalidateRunDetails } from '~src/lib/moderation/revalidate-boards';
import { editRun } from '~src/lib/moderation/run-edit';
import {
    getManualTimeByIdAsViewer,
    getRunByIdAsViewer,
} from '~src/lib/run-detail-viewer';
import type {
    VodReview,
    VodReviewPatch,
} from '../../../../../../types/leaderboards.types';

type Fail = { error: string };

export type VodReviewTarget =
    | { kind: 'run'; runId: number }
    | { kind: 'manual'; manualTimeId: number; gameId: number };

const SAVE_REASON = 'Saved VOD review markers from the board mod drawer.';
const CLEAR_REASON = 'Cleared VOD review markers from the board mod drawer.';

function retimeReason(patch: VodReviewPatch): string {
    const start = patch.markers.find((m) => m.kind === 'start')?.frame ?? 0;
    const end = patch.markers.find((m) => m.kind === 'end')?.frame ?? 0;
    return `Retimed from VOD: frames ${start}→${end} at ${patch.fps} fps.`;
}

/** The current review + what the retime line compares against. Uncached. */
export async function loadVodReviewAction(target: VodReviewTarget): Promise<
    | {
          ok: true;
          vodReview: VodReview | null;
          vodUrl: string | null;
          realTimeMs: number | null;
          timing: 'realtime' | 'gametime';
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
                ok: true,
                vodReview: d.vodReview ?? null,
                vodUrl: d.vodUrl,
                realTimeMs: d.realTime ?? d.time,
                timing: 'realtime',
            };
        }
        const d = await getManualTimeByIdAsViewer(
            target.manualTimeId,
            session.id,
        );
        if (!d) return { error: 'Set time not found.' };
        return {
            ok: true,
            vodReview: d.vodReview ?? null,
            vodUrl: d.evidenceUrl,
            realTimeMs: d.timing === 'realtime' ? d.timeMs : null,
            timing: d.timing,
        };
    } catch {
        return { error: 'Could not load the review.' };
    }
}

export async function saveVodReviewAction(
    gameSlug: string,
    target: VodReviewTarget,
    patch: VodReviewPatch | null,
    opts: { applyRetimeMs?: number } = {},
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
              ? retimeReason(patch)
              : SAVE_REASON;
    try {
        if (target.kind === 'run') {
            await editRun(session.id, target.runId, {
                vodReview: patch,
                ...(opts.applyRetimeMs != null
                    ? { time: opts.applyRetimeMs }
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
                    vodReview: patch,
                    ...(opts.applyRetimeMs != null
                        ? { timeMs: opts.applyRetimeMs }
                        : {}),
                    reason,
                },
            );
            revalidateTag(`manual-time:${target.manualTimeId}`, 'minutes');
        }
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Could not save the review. Please try again.' };
    }
    return { ok: true };
}
