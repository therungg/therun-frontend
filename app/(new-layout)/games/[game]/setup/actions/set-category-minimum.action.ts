'use server';

import {
    findCategoryMinPolicy,
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
    /** The category's own clock — a minimum is bound to one clock. */
    timing: 'rt' | 'gt';
    /** null clears the category's own minimum, leaving the board's to apply. */
    minMs: number | null;
}

/**
 * Sets or clears ONE category's minimum time from a matrix cell.
 *
 * A minimum is a min_time board policy, not a category column, so this is
 * create / update / delete against the policy list rather than a category
 * write. That is also why the minimum column is the one thing on this screen a
 * bulk apply cannot land in a single request — see the note in BulkBar.
 *
 * Auth and the policy read both come from the existing standards actions, so
 * this shares their permission model rather than growing a second one.
 */
export async function setCategoryMinimumAction(
    input: Input,
): Promise<{ ok: true } | { error: string }> {
    const loaded = await loadStandardsAction(input.gameSlug, input.categoryId);
    if ('error' in loaded) return loaded;

    const existing = findCategoryMinPolicy(loaded.policies, input.categoryId);

    if (input.minMs === null) {
        if (!existing) return { ok: true };
        const res = await deletePolicyAction(input.gameSlug, existing.id);
        return 'error' in res ? res : { ok: true };
    }

    // The value carries ONLY the key bound to this category's clock — the same
    // rule the Standards editor follows, so a category that later switches
    // clocks cannot keep a stale minimum on the other one.
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
    });
    return 'error' in res ? res : { ok: true };
}
