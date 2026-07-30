'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { setBoardOverride } from '~src/lib/moderation/curation';
import { ModError } from '~src/lib/moderation/mod-fetch';

/**
 * Sets (or, with `target: null`, clears) a run's board-assignment override —
 * the mechanism behind Move-to and its undo/clear affordances. Same
 * request/auth mold as `markRunsAction`: no `revalidateAffectedBoards` call,
 * since `setBoardOverride` returns a bare `{ updated: boolean }` with no
 * `affectedLeaderboards` list to invalidate against. Board curation's own
 * view refreshes via `reload()` (the roster re-fetch), not the Next cache
 * tags those other mutations invalidate.
 */
export async function moveRunAction(
    gameSlug: string,
    runId: number,
    target: { categoryId: number; subcategoryKey: string } | null,
): Promise<{ ok: true } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        await setBoardOverride(session.id, game.id, runId, target);
        return { ok: true };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to move run.' };
    }
}
