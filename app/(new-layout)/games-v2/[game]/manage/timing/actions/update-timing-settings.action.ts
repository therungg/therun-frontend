'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    PrimaryTiming,
    UpdateCategoryBody,
    updateCategory,
} from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number;
    primaryTiming?: PrimaryTiming;
    hideRealTime?: boolean;
    hideGameTime?: boolean;
}

export async function updateTimingSettingsAction(
    input: Input,
): Promise<{ result: { updated: boolean } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }

    if (input.hideRealTime === true && input.hideGameTime === true) {
        return {
            error: 'Cannot hide both real time and game time.',
        };
    }

    const body: UpdateCategoryBody = {};
    if (input.primaryTiming !== undefined)
        body.primaryTiming = input.primaryTiming;
    if (input.hideRealTime !== undefined)
        body.hideRealTime = input.hideRealTime;
    if (input.hideGameTime !== undefined)
        body.hideGameTime = input.hideGameTime;

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
        return { error: 'Failed to update timing settings.' };
    }
}
