'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { markRuns } from '~src/lib/moderation/curation';
import { ModError } from '~src/lib/moderation/mod-fetch';

export async function markRunsAction(
    gameSlug: string,
    runIds: number[],
    marked: boolean,
): Promise<{ ok: true; updated: number } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        const result = await markRuns(session.id, game.id, { runIds, marked });
        return { ok: true, updated: result.updated };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to update mark.' };
    }
}
