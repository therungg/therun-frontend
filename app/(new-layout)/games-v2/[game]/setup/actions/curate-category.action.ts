'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    type UpdateCategoryBody,
    updateCategory,
} from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { type CategorySeed, seedUpdateBody } from '../steps/category-seed';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number;
    active?: boolean;
    isMain?: boolean;
    groupId?: number | null;
    /** Board order within the category's Featured-group scope (1..N). */
    sortOrder?: number;
    /**
     * Game-default timing + rules template to apply when this call features
     * a category (`isMain: true`).
     *
     * Passed by the two deliberate feature-on paths: the setup wizard's step 2
     * and the console's add-to-board dialog. Both are the same act — putting a
     * cold category on the board, which should not land there with no timing
     * and no rules. (The rule this replaces said "console never seeds", back
     * when the console featured categories through a checkbox column over
     * every category the game had ever seen; that column is gone.)
     */
    seed?: CategorySeed;
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
    if (input.sortOrder !== undefined) {
        if (!Number.isInteger(input.sortOrder) || input.sortOrder < 1) {
            return { error: 'Invalid sort order.' };
        }
        body.sortOrder = input.sortOrder;
    }

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
