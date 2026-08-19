'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { updateLevel } from '~src/lib/levels';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    groupId: number;
    name?: string;
    rules?: string | null;
}

export async function updateLevelAction(
    input: Input,
): Promise<{ result: void } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to manage category groups.' };
    }

    const { gameSlug: _gameSlug, gameId, groupId, ...body } = input;

    try {
        const result = await updateLevel(user.id, gameId, groupId, body);
        updateTag(`game-cats:${gameId}`);
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to update level.' };
    }
}
