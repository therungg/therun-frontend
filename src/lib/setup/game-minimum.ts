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

// ── players (how many runners a board credits) ─────────────────────────────
// Same three scopes and the same most-specific-wins fallback as min_time
// above, kept as separate functions rather than a `policyType` parameter on
// the min_time ones: the two policy types have different value shapes
// (minTimeMs/minGameTimeMs vs min/max) and different callers, and a shared
// signature would just push that branching onto every call site.

/** The categoryId-null players policy, if set. */
export function findGamePlayersPolicy(
    policies: BoardPolicyRow[],
): BoardPolicyRow | undefined {
    return policies.find(
        (p) =>
            p.policyType === 'players' &&
            p.categoryId === null &&
            p.subcategoryKey === null,
    );
}

/** Category-scoped players policy for one category. */
export function findCategoryPlayersPolicy(
    policies: BoardPolicyRow[],
    categoryId: number,
): BoardPolicyRow | undefined {
    return policies.find(
        (p) =>
            p.policyType === 'players' &&
            p.categoryId === categoryId &&
            p.subcategoryKey === null,
    );
}

/** Subcategory-scoped players policy for one exact (categoryId, subcategoryKey) slice. */
export function findSubcategoryPlayersPolicy(
    policies: BoardPolicyRow[],
    categoryId: number,
    subcategoryKey: string,
): BoardPolicyRow | undefined {
    return policies.find(
        (p) =>
            p.policyType === 'players' &&
            p.categoryId === categoryId &&
            p.subcategoryKey === subcategoryKey,
    );
}

/**
 * The players policy that actually governs a board slice, honoring the same
 * fallback the backend applies at enforcement time: subcategory-scoped, then
 * category-scoped, then the game-wide default.
 */
export function resolvePlayersPolicy(
    policies: BoardPolicyRow[],
    categoryId: number,
    subcategoryKey: string | null,
): BoardPolicyRow | undefined {
    if (subcategoryKey) {
        const sub = findSubcategoryPlayersPolicy(
            policies,
            categoryId,
            subcategoryKey,
        );
        if (sub) return sub;
    }
    return (
        findCategoryPlayersPolicy(policies, categoryId) ??
        findGamePlayersPolicy(policies)
    );
}

/**
 * The { min, max } shown in the editor for a players policy, or `null` when
 * no policy exists at this exact scope. `max` is always present (never
 * `undefined`) here, unlike the optional wire shape in `PlayersPolicyValue`,
 * so callers can compare/render it without an extra `?? null`.
 */
export function playersValueFromPolicy(
    policy: BoardPolicyRow | undefined,
): { min: number; max: number | null } | null {
    if (!policy) return null;
    const value = policy.value as Record<string, unknown>;
    const min = typeof value.min === 'number' ? value.min : 1;
    const max = typeof value.max === 'number' ? value.max : null;
    return { min, max };
}
