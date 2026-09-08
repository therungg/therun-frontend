'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { setLevelVariants } from '~src/lib/levels';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number;
    variants: string[];
}

/** Assign this level's subcategories — the matrix's only write. */
export async function setLevelVariantsAction(
    input: Input,
): Promise<{ result: unknown } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to manage category groups.' };
    }

    try {
        const result = await setLevelVariants(
            user.id,
            input.gameId,
            input.categoryId,
            input.variants,
        );
        updateTag(`game-cats:${input.gameId}`);
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to set the level’s subcategories.' };
    }
}
