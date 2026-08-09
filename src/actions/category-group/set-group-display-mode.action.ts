'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { updateGroup } from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { CategoryDisplayMode } from '../../../types/leaderboards.types';

interface Input {
    gameSlug: string;
    gameId: number;
    groupId: number;
    /**
     * How this group draws its categories on the public page. `null` clears
     * the override so the group follows the game's default again — which is
     * why this is nullable rather than defaulting to 'auto': "follow the
     * board" and "decide by count" are different answers.
     */
    displayMode: CategoryDisplayMode | null;
}

export async function setGroupDisplayModeAction(
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

    try {
        const result = await updateGroup(user.id, input.gameId, input.groupId, {
            displayMode: input.displayMode,
        });
        revalidateTag(`game-cats:${input.gameId}`, 'minutes');
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to update the group.' };
    }
}
