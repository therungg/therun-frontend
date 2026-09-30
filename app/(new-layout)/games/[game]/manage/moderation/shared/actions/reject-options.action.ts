'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { getRejectOptions } from '~src/lib/moderation/reject-options';
import type {
    RejectOptions,
    RejectWithout,
} from '../../../../../../../../types/reject-options.types';

export async function loadRejectOptionsAction(
    gameSlug: string,
    runId: number,
    without: RejectWithout,
): Promise<{ ok: true; options: RejectOptions } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };
    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }
    try {
        return {
            ok: true,
            options: await getRejectOptions(
                session.id,
                game.id,
                runId,
                without,
            ),
        };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: "Couldn't load other options." };
    }
}
