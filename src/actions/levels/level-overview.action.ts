'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { fetchLevelOverview } from '~src/lib/levels';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { LevelOverview } from '../../../types/levels.types';

interface Input {
    gameSlug: string;
    gameId: number;
}

export async function levelOverviewAction(
    input: Input,
): Promise<{ result: LevelOverview } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to manage category groups.' };
    }

    try {
        const result = await fetchLevelOverview(user.id, input.gameId);
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to load level overview.' };
    }
}
