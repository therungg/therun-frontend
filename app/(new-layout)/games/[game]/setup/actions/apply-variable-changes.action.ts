'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    applyVariableChangeSet,
    previewVariableChangeSet,
    type VariableChangeInput,
} from '~src/lib/leaderboard-variables';
import type { VariablePreview } from '~src/lib/variables/consequences';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    changes: VariableChangeInput[];
    /**
     * Slugs of the categories the change set touches. Passed in rather than
     * re-resolved here because the caller already holds them, and the cache
     * tag for variables is per category (`game-vars:<game>:<category>`).
     */
    touchedCategorySlugs?: string[];
}

/**
 * Dry-run for a staged change set from the variable grid.
 *
 * The whole set is previewed at once, not change by change: subcategory
 * variables compose multiplicatively, so per-change previews would report
 * fewer moved runs than the moderator would actually get.
 */
export async function previewVariableChangesAction(
    input: Input,
): Promise<{ preview: VariablePreview } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit variables for this game.' };
    }
    if (input.changes.length === 0) {
        return { preview: { moved: 0, unresolved: 0, categories: [] } };
    }

    try {
        const preview = await previewVariableChangeSet(
            user.id,
            input.gameId,
            input.changes,
        );
        return { preview };
    } catch (e) {
        const message =
            e instanceof ApiError
                ? e.message
                : 'Could not work out what this change would do.';
        return { error: message };
    }
}

/**
 * Applies the staged set. One transaction backend-side, one cache
 * invalidation, one rebuild per touched category — so a grid full of cell
 * toggles is a single logical edit rather than N independent ones.
 */
export async function applyVariableChangesAction(
    input: Input,
): Promise<{ result: { applied: number } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit variables for this game.' };
    }
    if (input.changes.length === 0) {
        return { result: { applied: 0 } };
    }

    try {
        const result = await applyVariableChangeSet(
            user.id,
            input.gameId,
            input.changes,
        );
        // updateTag, not revalidateTag: the grid calls router.refresh() as
        // soon as this resolves and re-derives every cell from the same cached
        // read. Under stale-while-revalidate that refresh would be served the
        // pre-write rows and the cells would snap back.
        for (const slug of input.touchedCategorySlugs ?? []) {
            updateTag(`game-vars:${input.gameSlug}:${slug}`);
        }
        updateTag(`game-cats:${input.gameId}`);
        return { result };
    } catch (e) {
        const message =
            e instanceof ApiError ? e.message : 'Failed to apply the changes.';
        return { error: message };
    }
}
