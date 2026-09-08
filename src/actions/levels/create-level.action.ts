'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { createLevel, ensureLevelGroup } from '~src/lib/levels';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    display: string;
    /** The levels section. Omit to create it on first use. */
    groupId?: number;
    rules?: string | null;
    sortOrder?: number;
}

/**
 * A level is a category in the game's levels section. It carries the game's
 * variants from the moment it exists — the backend seeds them — so there is
 * nothing to materialise here.
 */
export async function createLevelAction(
    input: Input,
): Promise<{ result: { id: number } } | { error: string }> {
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
        const section = groupId ?? (await ensureLevelGroup(user.id, gameId)).id;
        const result = await createLevel(user.id, gameId, {
            ...body,
            groupId: section,
        });
        updateTag(`game-cats:${gameId}`);
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to create level.' };
    }
}
