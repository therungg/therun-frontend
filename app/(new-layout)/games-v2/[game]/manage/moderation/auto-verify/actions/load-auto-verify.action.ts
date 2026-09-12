'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { listPolicies } from '~src/lib/moderation/policies';
import type { BoardPolicyRow } from '../../../../../../../../types/moderation.types';

/** Load the game's auto_verify policies (game-wide row + per-category
 *  overrides) — the Auto-verify pane reads these. */
export async function loadAutoVerifyAction(
    gameSlug: string,
): Promise<
    { ok: true; gameId: number; policies: BoardPolicyRow[] } | { error: string }
> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        const policies = await listPolicies(session.id, game.id);
        return {
            ok: true,
            gameId: game.id,
            policies: policies.filter((p) => p.policyType === 'auto_verify'),
        };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to load auto-verify settings.' };
    }
}
