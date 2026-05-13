'use server';

import { getSession } from '~src/actions/session.action';
import {
    CategoryVisibility,
    getCategoryVisibility,
} from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number;
}

export async function loadVisibilityAction(
    input: Input,
): Promise<{ result: CategoryVisibility } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized.' };
    }

    try {
        const settings = await getCategoryVisibility(
            input.gameId,
            input.categoryId,
        );
        if (!settings) return { error: 'Category not found.' };
        return { result: settings };
    } catch {
        return { error: 'Failed to load visibility settings.' };
    }
}
