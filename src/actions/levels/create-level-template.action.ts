'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { createLevelTemplate } from '~src/lib/levels';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    display: string;
    isMain?: boolean;
    sortOrder?: number;
}

/**
 * Add a variant every level has. The definition is not a board: creating it
 * writes its name as a value of every level's subcategory variable, so a level
 * that exists already picks it up without a push.
 */
export async function createLevelTemplateAction(
    input: Input,
): Promise<{ result: { id: number; levels: number } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to manage category groups.' };
    }

    const { gameSlug: _gameSlug, gameId, ...body } = input;

    try {
        const result = await createLevelTemplate(user.id, gameId, body);
        updateTag(`game-cats:${gameId}`);
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to create level category.' };
    }
}
