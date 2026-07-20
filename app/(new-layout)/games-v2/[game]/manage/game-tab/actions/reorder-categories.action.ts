'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { updateCategory } from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { ReorderChange } from '../reorder-changes';

interface Input {
    gameSlug: string;
    gameId: number;
    changes: ReorderChange[];
}

export async function reorderCategoriesAction(
    input: Input,
): Promise<{ result: { reordered: boolean } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }
    if (input.changes.length === 0) {
        return { result: { reordered: false } };
    }

    try {
        // Sequential on purpose: each PUT triggers a pageData rebuild
        // backend-side; parallel writes could interleave rebuilds.
        for (const change of input.changes) {
            await updateCategory(user.id, input.gameId, change.categoryId, {
                sortOrder: change.sortOrder,
            });
        }
        revalidateTag(`game-cats:${input.gameId}`, 'minutes');
        return { result: { reordered: true } };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to reorder categories.' };
    }
}
