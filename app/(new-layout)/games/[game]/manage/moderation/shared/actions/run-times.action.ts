'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    revalidateAffectedBoards,
    revalidateRunDetails,
} from '~src/lib/moderation/revalidate-boards';
import { editRun } from '~src/lib/moderation/run-edit';
import type { AffectedLeaderboard } from '../../../../../../../../types/moderation.types';

/**
 * Correct the clocks on a finished run.
 *
 * Set time used to file a manual time next to the run instead. A manual time
 * competes with the run rather than replacing it — the board keeps whichever
 * is faster — so correcting a run to a *slower* time left the board showing
 * the old one, which read as the verb doing nothing at all. The times on a
 * run belong to the run, so they are edited there; the previous value is kept
 * server-side as `originalTime` and in the mod log either way.
 */
export async function setRunTimesAction(
    gameSlug: string,
    runId: number,
    times: { time?: number; gameTime?: number },
    reason: string,
    board: AffectedLeaderboard,
): Promise<{ ok: true } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        await editRun(session.id, runId, { ...times, reason });
        await revalidateAffectedBoards(game.id, game.name, [board]);
        revalidateRunDetails([runId]);
        return { ok: true };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Could not set the time.' };
    }
}
