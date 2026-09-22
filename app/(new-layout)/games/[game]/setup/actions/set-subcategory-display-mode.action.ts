'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    applyVariableChangeSet,
    type VariableChangeInput,
} from '~src/lib/leaderboard-variables';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type {
    CategoryDisplayMode,
    VariableRow,
} from '../../../../../../types/leaderboards.types';

interface Input {
    gameSlug: string;
    gameId: number;
    /**
     * Every row that carries this subcategory — one per category it splits.
     * A variable is stored per category, so the board-level choice fans back
     * out as one write each, in a single change set.
     */
    rows: VariableRow[];
    /** The slug of each row's category, keyed by category id, for its cache tag. */
    categorySlugById: Record<number, string>;
    /**
     * How the board header draws this subcategory's values. 'auto' decides
     * from how many values there are — which is why it is a stated choice
     * here rather than the absence of one.
     */
    displayMode: CategoryDisplayMode;
}

/**
 * One subcategory's display mode, on every category it splits.
 *
 * The upsert replaces the whole row, so each write carries the variable as it
 * stands with only the mode changed. Nothing moves between boards — the values
 * are untouched — so this writes straight through with no consequence preview.
 */
export async function setSubcategoryDisplayModeAction(
    input: Input,
): Promise<{ result: { applied: number } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit this board.' };
    }

    const changes: VariableChangeInput[] = input.rows
        .filter((row) => (row.displayMode ?? null) !== input.displayMode)
        .map((row) => ({
            categoryId: row.categoryId,
            input: {
                name: row.name,
                nameNormalized: row.nameNormalized,
                role: row.role,
                values: row.values,
                defaultValueIndex: row.defaultValueIndex,
                sortOrder: row.sortOrder,
                description: row.description,
                showValueOnBoard: row.showValueOnBoard ?? false,
                displayMode: input.displayMode,
            },
        }));
    if (changes.length === 0) return { result: { applied: 0 } };

    try {
        const result = await applyVariableChangeSet(
            user.id,
            input.gameId,
            changes,
        );
        // updateTag, not revalidateTag: the table re-reads through the same
        // cached fetch as soon as this resolves, and stale-while-revalidate
        // would hand it back the mode as it was.
        for (const change of changes) {
            const slug = input.categorySlugById[change.categoryId];
            if (slug) updateTag(`game-vars:${input.gameSlug}:${slug}`);
        }
        updateTag(`game-cats:${input.gameId}`);
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to update the subcategory.' };
    }
}
