'use server';

import { minValueForTiming } from '~src/lib/setup/game-minimum';
import {
    createPolicyAction,
    deletePolicyAction,
    updatePolicyAction,
} from '../../manage/moderation/policies/actions/policies-actions.action';

interface Input {
    gameSlug: string;
    /** The board's own clock — a minimum is bound to one clock. */
    timing: 'rt' | 'gt';
    /** null clears the board minimum; categories keep their own. */
    minMs: number | null;
    /** Id of the existing game-scoped min_time policy, if there is one. */
    policyId?: number | null;
}

/**
 * Sets or clears the BOARD minimum — the `categoryId: null` min_time policy
 * every category's minimum cell is measured against.
 *
 * The category-level twin is `setCategoryMinimumAction`; this differs only in
 * scope. It takes the existing policy id from the caller rather than re-reading
 * the policy list, because the wizard already holds it (`WizardData.policies`)
 * and the matrix refreshes from the server the moment this resolves.
 */
export async function setBoardMinimumAction(
    input: Input,
): Promise<{ ok: true } | { error: string }> {
    if (input.minMs === null) {
        if (!input.policyId) return { ok: true };
        const res = await deletePolicyAction(input.gameSlug, input.policyId);
        return 'error' in res ? res : { ok: true };
    }

    // The value carries ONLY the key bound to the board's clock, so a board
    // that later switches clocks cannot keep a stale minimum on the other one.
    const value = minValueForTiming(input.timing, input.minMs);

    if (input.policyId) {
        const res = await updatePolicyAction(
            input.gameSlug,
            input.policyId,
            value,
        );
        return 'error' in res ? res : { ok: true };
    }

    const res = await createPolicyAction(input.gameSlug, {
        policyType: 'min_time',
        value,
    });
    return 'error' in res ? res : { ok: true };
}
