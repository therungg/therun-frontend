'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { createLevelOnlyBoard } from '~src/lib/levels';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    display: string;
    groupId: number;
}

export async function createLevelBoardAction(
    input: Input,
): Promise<{ result: { id: number; created: number } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to manage category groups.' };
    }
    try {
        const result = await createLevelOnlyBoard(user.id, input.gameId, {
            display: input.display,
            groupId: input.groupId,
        });
        updateTag(`game-cats:${input.gameId}`);
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to create level board.' };
    }
}
