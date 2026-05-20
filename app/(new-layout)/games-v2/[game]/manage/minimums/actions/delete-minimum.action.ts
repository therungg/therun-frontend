'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { deleteMinimumTime } from '~src/lib/leaderboard-minimums';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { DeleteMinimumTimeResult } from '../../../../../../../types/leaderboard-minimums.types';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number;
    subcategoryKey: string;
}

export async function deleteMinimumAction(
    input: Input,
): Promise<{ result: DeleteMinimumTimeResult } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }

    try {
        const result = await deleteMinimumTime(
            user.id,
            input.gameId,
            input.categoryId,
            input.subcategoryKey,
        );
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to delete minimum time.' };
    }
}
