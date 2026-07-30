'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { reorderGroups } from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    groupIds: number[];
}

export async function reorderGroupsAction(
    input: Input,
): Promise<{ result: { reordered: boolean } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to manage category groups.' };
    }

    try {
        const result = await reorderGroups(
            user.id,
            input.gameId,
            input.groupIds,
        );
        // updateTag, not revalidateTag — same read-your-writes reasoning as
        // reorder-categories.action.ts: BoardCuration's group-nudge
        // router.refresh() re-derives order from this same cache entry.
        updateTag(`game-cats:${input.gameId}`);
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to reorder groups.' };
    }
}
