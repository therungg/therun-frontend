'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { getCategoryRoster } from '~src/lib/moderation/mass-mgmt';
import { ModError } from '~src/lib/moderation/mod-fetch';
import type {
    LeaderboardRosterRow,
    RosterFilter,
} from '../../../../../../../../types/moderation.types';

export async function loadRosterAction(
    gameSlug: string,
    categoryId: number,
    filter: RosterFilter,
): Promise<{ ok: true; rows: LeaderboardRosterRow[] } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        const rows = await getCategoryRoster(
            session.id,
            game.id,
            categoryId,
            filter,
        );
        return { ok: true, rows };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to load roster.' };
    }
}
