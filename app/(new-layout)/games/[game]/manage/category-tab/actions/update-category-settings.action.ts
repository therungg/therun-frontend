'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    type UpdateCategoryBody,
    updateCategory,
} from '~src/lib/category-mgmt';
import { millisecondsModeToBoolean } from '~src/lib/milliseconds-mode';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { MillisecondsMode } from '../../../../../../../types/leaderboards.types';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number;
    rules?: string | null;
    sortAscending?: boolean;
    millisecondsMode?: MillisecondsMode;
    showMilliseconds?: boolean;
    requireVideo?: boolean;
    requireVideoTopN?: number | null;
    imageUrl?: string | null;
}

export async function updateCategorySettingsAction(
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

    if (
        input.requireVideo === true &&
        input.requireVideoTopN !== undefined &&
        input.requireVideoTopN !== null &&
        (!Number.isInteger(input.requireVideoTopN) ||
            input.requireVideoTopN < 1)
    ) {
        return {
            error: 'Top-N value must be a positive integer.',
        };
    }

    if (
        input.imageUrl != null &&
        input.imageUrl !== '' &&
        !input.imageUrl.startsWith('https://')
    ) {
        return { error: 'Image URL must start with https://.' };
    }

    const body: UpdateCategoryBody = {};
    if (input.rules !== undefined) body.rules = input.rules;
    if (input.sortAscending !== undefined)
        body.sortAscending = input.sortAscending;
    // Both halves go out together: the backend keeps them in sync, but an
    // older deploy only reads the boolean, and a board set to break ties is
    // closer to rounded than to always-on there.
    if (input.millisecondsMode !== undefined) {
        body.millisecondsMode = input.millisecondsMode;
        body.showMilliseconds = millisecondsModeToBoolean(
            input.millisecondsMode,
        );
    } else if (input.showMilliseconds !== undefined)
        body.showMilliseconds = input.showMilliseconds;
    if (input.requireVideo !== undefined)
        body.requireVideo = input.requireVideo;
    if (input.requireVideoTopN !== undefined)
        body.requireVideoTopN = input.requireVideoTopN;
    if (input.imageUrl !== undefined) body.imageUrl = input.imageUrl;

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
        return { error: 'Failed to update category settings.' };
    }
}
