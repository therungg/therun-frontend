'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { updateGame } from '~src/lib/game-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
}

export async function setGameConfiguredAction(
    input: Input,
): Promise<{ ok: true } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to finish setup.' };
    }

    try {
        await updateGame(user.id, input.gameId, { configured: true });
        updateTag(`game-meta:${input.gameId}`);
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to mark setup complete.' };
    }
}
