'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { resolveCategory } from '~src/lib/games-v1';
import {
    type UpsertVariableInput,
    upsertGameVariable,
} from '~src/lib/leaderboard-variables';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';

interface Input {
    gameSlug: string;
    gameId: number;
    body: UpsertVariableInput;
}

export async function createVariableAction(
    input: Input,
): Promise<{ result: VariableRow } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }

    try {
        const result = await upsertGameVariable(
            user.id,
            input.gameId,
            input.body,
        );
        await invalidateVariableTags(input.gameSlug, input.gameId, result);
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to create variable.' };
    }
}

async function invalidateVariableTags(
    gameSlug: string,
    gameId: number,
    row: VariableRow,
) {
    try {
        const { categories } = await resolveCategory(gameId);
        const targets =
            row.categoryId == null
                ? categories
                : categories.filter((c) => c.id === row.categoryId);
        for (const cat of targets) {
            revalidateTag(`game-vars:${gameSlug}:${cat.name}`, 'hours');
        }
    } catch {
        // Best-effort.
    }
}
