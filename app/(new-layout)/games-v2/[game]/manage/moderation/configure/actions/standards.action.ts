'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import {
    listExclusionRules,
    listModActions,
} from '~src/lib/moderation/mass-mgmt';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { listPolicies } from '~src/lib/moderation/policies';
import type {
    BoardPolicyRow,
    GameExclusionRuleRow,
    ModActionRow,
} from '../../../../../../../../types/moderation.types';

/** Load the board policies for a single category (Standards reads these). */
export async function loadStandardsAction(
    gameSlug: string,
    categoryId: number,
): Promise<{ ok: true; policies: BoardPolicyRow[] } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        const policies = await listPolicies(session.id, game.id, categoryId);
        return { ok: true, policies };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to load standards.' };
    }
}

/** Load the standing exclusion rules (Active bans reads these). */
export async function loadBansAction(
    gameSlug: string,
): Promise<{ ok: true; rules: GameExclusionRuleRow[] } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        const rules = await listExclusionRules(session.id, game.id);
        return { ok: true, rules };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to load active bans.' };
    }
}

/** Load the recent mod-action feed (History drawer reads this). */
export async function loadHistoryAction(
    gameSlug: string,
): Promise<{ ok: true; actions: ModActionRow[] } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        const actions = await listModActions(session.id, game.id, { days: 90 });
        return { ok: true, actions };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to load history.' };
    }
}
