'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { resolveCategory } from '~src/lib/games-v1';
import { deleteGameVariable } from '~src/lib/leaderboard-variables';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number;
    name: string;
}

export async function deleteVariableAction(
    input: Input,
): Promise<{ ok: true } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }

    try {
        await deleteGameVariable(user.id, input.gameId, {
            categoryId: input.categoryId,
            name: input.name,
        });
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to delete variable.' };
    }

    try {
        const { categories } = await resolveCategory(input.gameId);
        const target = categories.find((c) => c.id === input.categoryId);
        if (target) {
            revalidateTag(
                `game-vars:${input.gameSlug}:${target.name}`,
                'hours',
            );
        }
    } catch {
        // Best-effort.
    }

    return { ok: true };
}
