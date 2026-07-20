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
): Promise<
    | { result: { reordered: boolean } }
    | { error: string; applied: ReorderChange[] }
> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return {
            error: 'Not authorized to edit category settings.',
            applied: [],
        };
    }
    if (input.changes.length === 0) {
        return { result: { reordered: false } };
    }

    const applied: ReorderChange[] = [];
    try {
        // Sequential on purpose: each PUT triggers a pageData rebuild
        // backend-side; parallel writes could interleave rebuilds.
        for (const change of input.changes) {
            await updateCategory(user.id, input.gameId, change.categoryId, {
                sortOrder: change.sortOrder,
            });
            applied.push(change);
        }
        revalidateTag(`game-cats:${input.gameId}`, 'minutes');
        return { result: { reordered: true } };
    } catch (e) {
        // Writes that landed before the failure are real — report them so
        // the caller can reconcile local state instead of blind-reverting.
        if (applied.length > 0) {
            revalidateTag(`game-cats:${input.gameId}`, 'minutes');
        }
        const message =
            e instanceof ApiError ? e.message : 'Failed to reorder categories.';
        return { error: message, applied };
    }
}
