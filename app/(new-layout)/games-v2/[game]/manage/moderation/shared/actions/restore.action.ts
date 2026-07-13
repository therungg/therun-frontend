'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { include } from '~src/lib/moderation/mass-mgmt';
import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    revalidateAffectedBoards,
    revalidateRunDetails,
} from '~src/lib/moderation/revalidate-boards';
import { applyVerdicts } from '~src/lib/moderation/verdicts';
import type { AffectedLeaderboard } from '../../../../../../../../types/moderation.types';

/**
 * Restore runs to the board: undo BOTH a quiet exclusion (include) and a loud
 * rejection (unreject) in one idempotent call. Both backend operations are
 * no-ops on a run that wasn't excluded / rejected, so calling both is safe.
 */
export async function restoreRunsAction(
    gameSlug: string,
    runIds: number[],
    reason: string,
): Promise<{ ok: true } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        // Undo a quiet exclusion first, then a loud rejection. Each is
        // idempotent; surface the first ModError rather than swallowing it.
        const includeResult = await include(session.id, game.id, {
            runIds,
            reason,
        });
        const verdictResult = await applyVerdicts(session.id, game.id, {
            action: 'unreject',
            runIds,
            reason,
        });

        // Revalidate the union of boards both operations touched.
        const seen = new Set<string>();
        const affected: AffectedLeaderboard[] = [];
        for (const lb of [
            ...includeResult.affectedLeaderboards,
            ...verdictResult.affectedLeaderboards,
        ]) {
            const k = `${lb.categoryId}:${lb.subcategoryKey}`;
            if (seen.has(k)) continue;
            seen.add(k);
            affected.push(lb);
        }
        await revalidateAffectedBoards(game.id, game.name, affected);
        revalidateRunDetails(runIds);

        return { ok: true };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to restore.' };
    }
}
