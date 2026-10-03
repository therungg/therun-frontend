'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { getManualTimeById } from '~src/lib/leaderboards-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { loadRunViewData, type RunViewData } from '../load-run-view';

// The moderator modal's read: the same data the run page renders, for the run
// the modal was opened on, and who is looking. Moderators of the game only.
export async function loadModRunViewAction(
    gameSlug: string,
    runId: number,
): Promise<
    | { ok: true; data: RunViewData; sessionUsername: string | null }
    | { error: string }
> {
    const session = await getSession();
    const game = await resolveGame(gameSlug).catch(() => null);
    if (!game || !canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }
    if (!Number.isSafeInteger(runId)) {
        return { error: 'This run could not be loaded.' };
    }
    const data = await loadRunViewData({ game, id: runId, session }).catch(
        () => null,
    );
    if (!data) return { error: 'This run could not be loaded.' };
    return { ok: true, data, sessionUsername: session.username || null };
}

/** An old `?manual=<id>` link: the run that manual time became, or null. */
export async function runIdForManualTimeAction(
    manualTimeId: number,
): Promise<number | null> {
    if (!Number.isSafeInteger(manualTimeId)) return null;
    return (await getManualTimeById(manualTimeId))?.runId ?? null;
}
