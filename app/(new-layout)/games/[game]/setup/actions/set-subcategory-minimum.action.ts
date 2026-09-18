'use server';

import {
    findSubcategoryMinPolicy,
    minValueForTiming,
} from '~src/lib/setup/game-minimum';
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
    /** The category's own clock — a minimum is bound to one clock. */
    timing: 'rt' | 'gt';
    /** null clears this slice's minimum, leaving the category's to apply. */
    minMs: number | null;
}

/**
 * Sets or clears the minimum time of ONE board slice — a single subcategory
 * combination of a category.
 *
 * The category-scoped twin of `setCategoryMinimumAction`, and deliberately a
 * separate action rather than an optional argument on it: the fallback the
 * backend applies (slice, then category, then game) means these two writes
 * mean different things, and a caller that confuses them silently overwrites
 * every slice at once.
 */
export async function setSubcategoryMinimumAction(
    input: Input,
): Promise<{ ok: true } | { error: string }> {
    if (!input.subcategoryKey) return { error: 'No subcategory selected.' };

    const loaded = await loadStandardsAction(input.gameSlug, input.categoryId);
    if ('error' in loaded) return loaded;

    const existing = findSubcategoryMinPolicy(
        loaded.policies,
        input.categoryId,
        input.subcategoryKey,
    );

    if (input.minMs === null) {
        if (!existing) return { ok: true };
        const res = await deletePolicyAction(input.gameSlug, existing.id);
        return 'error' in res ? res : { ok: true };
    }

    // Only the key bound to this category's clock, same rule as the
    // category-scoped write — a category that later switches clocks must not
    // keep a stale minimum on the other one.
    const value = minValueForTiming(input.timing, input.minMs);

    if (existing) {
        const res = await updatePolicyAction(
            input.gameSlug,
            existing.id,
            value,
        );
        return 'error' in res ? res : { ok: true };
    }

    const res = await createPolicyAction(input.gameSlug, {
        policyType: 'min_time',
        value,
        categoryId: input.categoryId,
        subcategoryKey: input.subcategoryKey,
    });
    return 'error' in res ? res : { ok: true };
}
