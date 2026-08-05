'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { setBoardOverride } from '~src/lib/moderation/curation';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { revalidateAffectedBoards } from '~src/lib/moderation/revalidate-boards';
import type { AffectedLeaderboard } from '../../../../../../../../types/moderation.types';

/**
 * Sets (or, with `target: null`, clears) a run's board-assignment override —
 * the mechanism behind Move-to and its undo/clear affordances.
 *
 * `setBoardOverride` itself returns a bare `{ updated: boolean }` with no
 * `affectedLeaderboards` list the way exclude/manual-time mutations do, so
 * the caller passes the pairs it already knows from its own props/state
 * (mirrors `excludeAction`'s `revalidateAffectedBoards` call, just sourced
 * from the caller instead of the response body). Board curation's own view
 * still refreshes via `reload()` regardless — this only clears the public
 * leaderboard read's cache tags so those pages don't serve stale data until
 * their TTL catches up.
 */
export async function moveRunAction(
    gameSlug: string,
    runId: number,
    target: { categoryId: number; subcategoryKey: string } | null,
    affected: AffectedLeaderboard[],
    /** Required by the backend when `target` is set — min 10 characters. */
    reason?: string,
): Promise<{ ok: true } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        await setBoardOverride(session.id, game.id, runId, target, reason);
        await revalidateAffectedBoards(game.id, game.name, affected);
        return { ok: true };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to move run.' };
    }
}
