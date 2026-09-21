'use server';

import { writePlayersPolicyAction } from '../../manage/moderation/policies/actions/policies-actions.action';

interface Input {
    gameSlug: string;
    categoryId: number;
    /** Canonical `name=value|name=value` key of the slice being set. */
    subcategoryKey: string;
    /** null clears this slice's players policy, leaving the category's (or
     *  the game's) to apply. */
    value: { min: number; max: number | null } | null;
}

/**
 * Sets or clears the players policy of ONE board slice — a subcategory
 * value, or (for an existing exact-combination row) a full combination key.
 *
 * A thin wrapper around `writePlayersPolicyAction`, which does the actual
 * validation, default-collapsing and create/update/delete dispatch — kept as
 * its own action because callers (the subcategory dialog) pass a
 * subcategory-scoped shape, while the category-wide write in `standards.tsx`
 * calls `writePlayersPolicyAction` with `subcategoryKey: null` directly.
 */
export async function setSubcategoryPlayersAction(
    input: Input,
): Promise<{ ok: true; changed: boolean } | { error: string }> {
    if (!input.subcategoryKey) return { error: 'No subcategory selected.' };

    return writePlayersPolicyAction(
        input.gameSlug,
        input.categoryId,
        input.subcategoryKey,
        input.value,
    );
}
