'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    type CombinationsResult,
    listCombinations,
} from '~src/lib/leaderboard-variables';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number | null;
}

export async function loadCombinationsAction(
    input: Input,
): Promise<{ result: CombinationsResult } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }

    try {
        const result = await listCombinations(
            user.id,
            input.gameId,
            input.categoryId,
        );
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to load combinations.' };
    }
}
