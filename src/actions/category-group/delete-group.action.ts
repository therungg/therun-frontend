'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { deleteGroup } from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    groupId: number;
}

export async function deleteGroupAction(
    input: Input,
): Promise<{ result: { deleted: boolean } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to manage category groups.' };
    }

    try {
        const result = await deleteGroup(user.id, input.gameId, input.groupId);
        revalidateTag(`game-cats:${input.gameId}`, 'minutes');
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to delete group.' };
    }
}
