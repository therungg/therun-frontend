'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    type UpdateCategoryBody,
    updateCategory,
} from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { seedUpdateBody } from '../steps/category-seed';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number;
    active?: boolean;
    isMain?: boolean;
    groupId?: number | null;
    /**
     * Game-default timing + rules template to apply when this call features
     * a category (`isMain: true`). Only the setup wizard's feature-on
     * transition passes this — it's first-setup seeding, not curation, so
     * the console categories table always leaves it unset.
     */
    seed?: {
        primaryTiming: 'realtime' | 'gametime';
        rulesTemplate: string | null;
    };
    /** Whether the category's current rules were empty before this call — gates whether `seed.rulesTemplate` gets written. */
    currentRulesEmpty?: boolean;
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

        // Invalidate as soon as the first write lands, not after the seed
        // write too: the seed call below is a second, separate request, and
        // if it throws the first write must still not be left stale behind
        // the cache.
        updateTag(`game-cats:${input.gameId}`);

        if (input.isMain === true && input.seed) {
            const seedBody: UpdateCategoryBody = seedUpdateBody(
                input.seed,
                input.currentRulesEmpty ?? false,
            );
            await updateCategory(
                user.id,
                input.gameId,
                input.categoryId,
                seedBody,
            );
        }

        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to update category.' };
    }
}
