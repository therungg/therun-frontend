import type { BoardPolicyRow } from '../../../types/moderation.types';

/** The categoryId-null min_time policy, if set. */
export function findGameMinPolicy(
    policies: BoardPolicyRow[],
): BoardPolicyRow | undefined {
    return policies.find(
        (p) =>
            p.policyType === 'min_time' &&
            p.categoryId === null &&
            p.subcategoryKey === null,
    );
}

/** Category-scoped min_time policy for one category. */
export function findCategoryMinPolicy(
    policies: BoardPolicyRow[],
    categoryId: number,
): BoardPolicyRow | undefined {
    return policies.find(
        (p) =>
            p.policyType === 'min_time' &&
            p.categoryId === categoryId &&
            p.subcategoryKey === null,
    );
}

/** Subcategory-scoped min_time policy for one exact (categoryId, subcategoryKey) slice. */
export function findSubcategoryMinPolicy(
    policies: BoardPolicyRow[],
    categoryId: number,
    subcategoryKey: string,
): BoardPolicyRow | undefined {
    return policies.find(
        (p) =>
            p.policyType === 'min_time' &&
            p.categoryId === categoryId &&
            p.subcategoryKey === subcategoryKey,
    );
}

/**
 * The policy that actually governs a board slice, honoring the same
 * fallback the backend applies at enforcement time: subcategory-scoped,
 * then category-scoped, then the game-wide floor.
 */
export function resolveMinPolicy(
    policies: BoardPolicyRow[],
    categoryId: number,
    subcategoryKey: string | null,
): BoardPolicyRow | undefined {
    if (subcategoryKey) {
        const sub = findSubcategoryMinPolicy(
            policies,
            categoryId,
            subcategoryKey,
        );
        if (sub) return sub;
    }
    return (
        findCategoryMinPolicy(policies, categoryId) ??
        findGameMinPolicy(policies)
    );
}

/** Timing-bound value: rt -> { minTimeMs }, gt -> { minGameTimeMs }. Never both. */
export function minValueForTiming(
    timing: 'rt' | 'gt',
    ms: number,
): { minTimeMs: number } | { minGameTimeMs: number } {
    if (timing === 'rt') {
        return { minTimeMs: ms };
    }
    return { minGameTimeMs: ms };
}

/** The ms shown in an input for a policy, honoring the timing binding. */
export function minMsFromPolicy(
    policy: BoardPolicyRow | undefined,
    timing: 'rt' | 'gt',
): number | null {
    if (!policy) {
        return null;
    }

    const value = policy.value as Record<string, unknown>;
    if (timing === 'rt') {
        const ms = value.minTimeMs;
        return typeof ms === 'number' ? ms : null;
    }

    const ms = value.minGameTimeMs;
    return typeof ms === 'number' ? ms : null;
}
