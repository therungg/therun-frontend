'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { deleteExclusionRule } from '~src/lib/moderation/mass-mgmt';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { revalidateAffectedBoards } from '~src/lib/moderation/revalidate-boards';
import type { DeleteRuleResult } from '../../../../../../../../types/moderation.types';

export async function deleteRuleAction(
    gameSlug: string,
    ruleId: number,
    reason: string,
): Promise<{ ok: true; result: DeleteRuleResult } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        const result = await deleteExclusionRule(
            session.id,
            game.id,
            ruleId,
            reason,
        );
        await revalidateAffectedBoards(
            game.id,
            game.name,
            result.affectedLeaderboards,
        );
        return { ok: true, result };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to delete rule.' };
    }
}
