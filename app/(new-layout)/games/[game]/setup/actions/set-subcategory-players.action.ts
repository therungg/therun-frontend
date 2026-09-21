'use server';

import { findSubcategoryPlayersPolicy } from '~src/lib/setup/game-minimum';
import { loadStandardsAction } from '../../manage/moderation/configure/actions/standards.action';
import {
    createPolicyAction,
    deletePolicyAction,
    updatePolicyAction,
} from '../../manage/moderation/policies/actions/policies-actions.action';

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
 * Sets or clears the players policy of ONE board slice — a single
 * subcategory combination of a category.
 *
 * The category-scoped twin of the players write in `standards.tsx`, and
 * deliberately a separate action rather than an optional argument on
 * `setSubcategoryMinimumAction`: the fallback the backend applies (slice,
 * then category, then game) means these two writes mean different things,
 * and the value shapes don't match either (min/max vs minTimeMs).
 */
export async function setSubcategoryPlayersAction(
    input: Input,
): Promise<{ ok: true } | { error: string }> {
    if (!input.subcategoryKey) return { error: 'No subcategory selected.' };

    const loaded = await loadStandardsAction(input.gameSlug, input.categoryId);
    if ('error' in loaded) return loaded;

    const existing = findSubcategoryPlayersPolicy(
        loaded.policies,
        input.categoryId,
        input.subcategoryKey,
    );

    if (input.value === null) {
        if (!existing) return { ok: true };
        const res = await deletePolicyAction(input.gameSlug, existing.id);
        return 'error' in res ? res : { ok: true };
    }

    if (existing) {
        const res = await updatePolicyAction(
            input.gameSlug,
            existing.id,
            input.value,
        );
        return 'error' in res ? res : { ok: true };
    }

    const res = await createPolicyAction(input.gameSlug, {
        policyType: 'players',
        value: input.value,
        categoryId: input.categoryId,
        subcategoryKey: input.subcategoryKey,
    });
    return 'error' in res ? res : { ok: true };
}
