'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    createPolicy,
    deletePolicy,
    updatePolicy,
} from '~src/lib/moderation/policies';
import type {
    BoardPolicyRow,
    CreatePolicyInput,
} from '../../../../../../../../types/moderation.types';

export async function createPolicyAction(
    gameSlug: string,
    input: CreatePolicyInput,
): Promise<{ ok: true; policy: BoardPolicyRow } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        const policy = await createPolicy(session.id, game.id, input);
        return { ok: true, policy };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to create policy.' };
    }
}

export async function updatePolicyAction(
    gameSlug: string,
    id: number,
    value: Record<string, unknown>,
    reason: string,
): Promise<{ ok: true; policy: BoardPolicyRow } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        const policy = await updatePolicy(session.id, game.id, id, {
            value,
            reason,
        });
        return { ok: true, policy };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to update policy.' };
    }
}

export async function deletePolicyAction(
    gameSlug: string,
    id: number,
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
        await deletePolicy(session.id, game.id, id, reason);
        return { ok: true };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to delete policy.' };
    }
}
