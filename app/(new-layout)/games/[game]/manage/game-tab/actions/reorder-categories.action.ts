'use server';

import { updateTag } from 'next/cache';
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
    if (
        input.changes.some(
            (c) => !Number.isInteger(c.sortOrder) || c.sortOrder < 1,
        )
    ) {
        return { error: 'Invalid sort order.', applied: [] };
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
        // updateTag, not revalidateTag: BoardCuration's reorder nudges call
        // router.refresh() right after this resolves, and re-derive display
        // order from the same cached read. revalidateTag's
        // stale-while-revalidate would hand that refresh the pre-write
        // order, making the first nudge look like a no-op.
        updateTag(`game-cats:${input.gameId}`);
        return { result: { reordered: true } };
    } catch (e) {
        // Writes that landed before the failure are real — report them so
        // the caller can reconcile local state instead of blind-reverting.
        if (applied.length > 0) {
            updateTag(`game-cats:${input.gameId}`);
        }
        const message =
            e instanceof ApiError ? e.message : 'Failed to reorder categories.';
        return { error: message, applied };
    }
}
