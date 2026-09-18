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
 * Restore runs to the board: include the runs that were removed and unreject
 * the runs that were declined. The caller says which is which: include logs a
 * row for every run it is given, removed or not, so it only gets removed runs.
 */
export async function restoreRunsAction(
    gameSlug: string,
    runs: { include: number[]; unreject: number[] },
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
        // Undo a quiet exclusion first, then a loud rejection. Surface the
        // first ModError rather than swallowing it.
        const includeResult = runs.include.length
            ? await include(session.id, game.id, {
                  runIds: runs.include,
                  reason,
              })
            : null;
        const verdictResult = runs.unreject.length
            ? await applyVerdicts(session.id, game.id, {
                  action: 'unreject',
                  runIds: runs.unreject,
                  reason,
              })
            : null;

        // Revalidate the union of boards both operations touched.
        const seen = new Set<string>();
        const affected: AffectedLeaderboard[] = [];
        for (const lb of [
            ...(includeResult?.affectedLeaderboards ?? []),
            ...(verdictResult?.affectedLeaderboards ?? []),
        ]) {
            const k = `${lb.categoryId}:${lb.subcategoryKey}`;
            if (seen.has(k)) continue;
            seen.add(k);
            affected.push(lb);
        }
        await revalidateAffectedBoards(game.id, game.name, affected);
        revalidateRunDetails([...new Set([...runs.include, ...runs.unreject])]);

        return { ok: true };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to restore.' };
    }
}
