'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    type BulkCategoryFields,
    bulkUpdateCategories,
} from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryIds: number[];
    fields: BulkCategoryFields;
}

/**
 * "Apply to selected" from the step-4 matrix, and the write behind a single
 * cell edit (a selection of one).
 *
 * Unlike reorderCategoriesAction this does not loop per category: the backend
 * applies the whole set in one transaction, so there is no half-applied state
 * to reconcile and no fan-out of pageData rebuilds. A failure here means
 * nothing was written.
 */
export async function bulkUpdateCategoriesAction(
    input: Input,
): Promise<{ result: { updated: number } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }

    if (input.categoryIds.length === 0) {
        return { result: { updated: 0 } };
    }
    if (Object.keys(input.fields).length === 0) {
        return { result: { updated: 0 } };
    }

    try {
        const result = await bulkUpdateCategories(
            user.id,
            input.gameId,
            input.categoryIds,
            input.fields,
        );
        // updateTag, not revalidateTag: the matrix calls router.refresh()
        // as soon as this resolves and re-derives every cell's deviation
        // state from the same cached read. Under revalidateTag's
        // stale-while-revalidate that refresh would be served the pre-write
        // values, and the cells would snap back to their old state.
        updateTag(`game-cats:${input.gameId}`);
        return { result };
    } catch (e) {
        const message =
            e instanceof ApiError ? e.message : 'Failed to update categories.';
        return { error: message };
    }
}
