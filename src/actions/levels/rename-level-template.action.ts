'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { updateLevelTemplate } from '~src/lib/levels';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    templateId: number;
    display: string;
}

/** Rename a subcategory on every level at once. */
export async function renameLevelTemplateAction(
    input: Input,
): Promise<{ result: { updated: boolean } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to manage category groups.' };
    }

    const display = input.display.trim();
    if (!display) return { error: 'Subcategory name is required.' };

    try {
        const result = await updateLevelTemplate(
            user.id,
            input.gameId,
            input.templateId,
            { display },
        );
        updateTag(`game-cats:${input.gameId}`);
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to rename the subcategory.' };
    }
}
