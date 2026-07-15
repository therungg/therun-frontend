'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    type UpdateCategoryBody,
    updateCategory,
} from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number;
    active?: boolean;
    isMain?: boolean;
    groupId?: number | null;
}

export async function curateCategoryAction(
    input: Input,
): Promise<{ result: { updated: boolean } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit categories.' };
    }

    const body: UpdateCategoryBody = {};
    if (input.active !== undefined) body.active = input.active;
    if (input.isMain !== undefined) body.isMain = input.isMain;
    if (input.groupId !== undefined) body.groupId = input.groupId;

    if (Object.keys(body).length === 0) {
        return { result: { updated: false } };
    }

    try {
        const result = await updateCategory(
            user.id,
            input.gameId,
            input.categoryId,
            body,
        );
        updateTag(`game-cats:${input.gameId}`);
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to update category.' };
    }
}
