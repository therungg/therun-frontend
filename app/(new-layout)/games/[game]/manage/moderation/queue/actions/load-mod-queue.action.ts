'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { listModQueue } from '~src/lib/moderation/mod-queue';
import type {
    ModQueueFilter,
    ModQueuePage,
} from '../../../../../../../../types/moderation.types';

export async function loadModQueueAction(
    gameSlug: string,
    filter: ModQueueFilter,
): Promise<{ ok: true; page: ModQueuePage } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        const page = await listModQueue(session.id, game.id, filter);
        return { ok: true, page };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to load the queue.' };
    }
}
