'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { getBoardPage } from '~src/lib/moderation/mass-mgmt';
import { ModError } from '~src/lib/moderation/mod-fetch';
import type {
    BoardPage,
    BoardPageFilter,
} from '../../../../../../../types/moderation.types';

export async function loadBoardPageAction(
    gameSlug: string,
    categoryId: number,
    filter: BoardPageFilter,
): Promise<({ ok: true } & BoardPage) | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        const page = await getBoardPage(
            session.id,
            game.id,
            categoryId,
            filter,
        );
        return { ok: true, ...page };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to load board.' };
    }
}
