import type { BoardPolicyRow } from '../../../types/moderation.types';
import { normalizeVariableName, parseSubcategoryKey } from '../variables/keys';

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

// There is deliberately NO game-scoped players finder, unlike min_time above.
// The backend resolver still honours a game-wide row if one exists, but
// nothing in the product writes one: the importer always names a category, and
// the console offers category and subcategory only. A finder for a scope
// nothing creates is a dead path that can only ever make this console claim to
// resolve a policy the board is not enforcing.

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

/**
 * Does a stored subcategory key name exactly ONE variable=value pair, and is
 * it this one? Used to find a value's own single-pair players policy —
 * `mode=co-op` on its own, not `mode=co-op|platform=pc`.
 *
 * Compares by normalized name/value rather than raw string equality: the
 * server canonicalizes a stored key (normalized halves, a canonical alias),
 * and a key built here from a display value must still find the row the
 * server wrote even if the two don't happen to be byte-identical.
 */
export function matchesSingleValueKey(
    key: string,
    name: string,
    value: string,
): boolean {
    const pairs = parseSubcategoryKey(key);
    if (pairs.length !== 1) return false;
    return (
        normalizeVariableName(pairs[0].name) === name &&
        normalizeVariableName(pairs[0].value) === value
    );
}

/**
 * A category's players policies no per-value row claimed as its own —
 * an exact-combination row (`mode=co-op|platform=pc`), or an orphan: a
 * single-pair row a value editor no longer finds because the value's first
 * alias was renamed or the value itself removed. Both are invisible and
 * unremovable anywhere else, and an orphan still makes its board read as
 * configured for co-op, so the caller lists them read-only-with-delete
 * rather than silently dropping them. `claimedIds` is the set of policy ids
 * the caller already matched to a value row (via `findValuePlayersPolicy`)
 * — computed by the caller since it already does that lookup once per row.
 */
export function unclaimedPlayersPolicies(
    policies: BoardPolicyRow[],
    categoryId: number,
    claimedIds: ReadonlySet<number>,
): BoardPolicyRow[] {
    return policies.filter(
        (p) =>
            p.policyType === 'players' &&
            p.categoryId === categoryId &&
            p.subcategoryKey != null &&
            !claimedIds.has(p.id),
    );
}

/** The single-value players policy for exactly `name=value`, if one is
 *  stored — addressed by the server's own canonical key, not one rebuilt
 *  from display strings. */
export function findValuePlayersPolicy(
    policies: BoardPolicyRow[],
    categoryId: number,
    name: string,
    value: string,
): BoardPolicyRow | undefined {
    return policies.find(
        (p) =>
            p.policyType === 'players' &&
            p.categoryId === categoryId &&
            p.subcategoryKey != null &&
            matchesSingleValueKey(p.subcategoryKey, name, value),
    );
}

/**
 * Is this range the permissive default — the one a board carries when nobody
 * configured it?
 *
 * It matters that a default is never STORED. An unconfigured board and a board
 * storing `{min:1,max:null}` resolve to the same limits, but only the second
 * reads as configured, which is what turns co-op controls on. So a moderator
 * who blanks the fields, or types a minimum of one and no maximum, must end up
 * with no row at all rather than a row that says nothing.
 */
export function isDefaultPlayersRange(draft: {
    min: number | null;
    max: number | null;
}): boolean {
    return (draft.min === null || draft.min === 1) && draft.max === null;
}

/**
 * What is wrong with this range, in a sentence, or null when nothing is.
 *
 * Checked before `isDefaultPlayersRange`, and that order is the point: a
 * minimum of `0` is not a default and must not be treated as one. The number
 * input's `min={1}` stops the spinner, not the keyboard, so a typed `0` or
 * `-2` reaches here and would otherwise satisfy "min <= 1, no max" and
 * silently DELETE the board's policy under a success message.
 *
 * The server validates the same things; this exists so the form never sends a
 * request it knows will be refused, and never mistakes bad input for a clear.
 */
export function playersRangeError(draft: {
    min: number | null;
    max: number | null;
}): string | null {
    const { min, max } = draft;
    if (min !== null && (!Number.isInteger(min) || min < 1)) {
        return 'Minimum runners must be a whole number, 1 or more.';
    }
    if (max !== null) {
        if (!Number.isInteger(max) || max < 1) {
            return 'Maximum runners must be a whole number, 1 or more.';
        }
        if (max < (min ?? 1)) {
            return 'Maximum runners cannot be lower than the minimum.';
        }
    }
    return null;
}
