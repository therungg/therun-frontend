'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { loadRunViewData, type RunViewData } from '../load-run-view';

// The moderator modal's read: the same data the run page renders, for a run
// or manual time the modal was opened on, and who is looking. Moderators of
// the game only.
export async function loadModRunViewAction(
    gameSlug: string,
    kind: 'run' | 'manual',
    id: number,
): Promise<
    | { ok: true; data: RunViewData; sessionUsername: string | null }
    | { error: string }
> {
    const session = await getSession();
    const game = await resolveGame(gameSlug).catch(() => null);
    if (!game || !canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }
    if ((kind !== 'run' && kind !== 'manual') || !Number.isSafeInteger(id)) {
        return { error: 'This run could not be loaded.' };
    }
    const data = await loadRunViewData({ game, kind, id, session }).catch(
        () => null,
    );
    if (!data) return { error: 'This run could not be loaded.' };
    return { ok: true, data, sessionUsername: session.username || null };
}
