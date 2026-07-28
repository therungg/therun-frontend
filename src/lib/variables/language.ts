/**
 * The words this surface uses, in one place.
 *
 * Mods do not read `subcategory`, `bucket`, `nameNormalized` or "re-resolve
 * worker". They read what a thing does. The console, the wizard and the
 * in-effect panel all import from here so they cannot describe the same
 * concept three different ways — which is exactly how this surface got
 * confusing in the first place.
 */

export type VariableRoleId = 'subcategory' | 'filter';

export const ROLE_LABEL: Record<VariableRoleId, string> = {
    subcategory: 'splits this board',
    filter: 'filter only',
};

/** Row-level label, e.g. "splits this board into 4". */
export function boardCountLabel(
    role: VariableRoleId,
    valueCount: number,
): string {
    if (role === 'filter') return ROLE_LABEL.filter;
    return `${ROLE_LABEL.subcategory} into ${valueCount}`;
}

/** Live sentence under the role choice — what this decision actually does. */
export function roleConsequence(input: {
    role: VariableRoleId;
    variableName: string;
    categoryDisplay: string;
    valueCount: number;
}): string {
    const { role, variableName, categoryDisplay, valueCount } = input;

    if (role === 'filter') {
        return `${categoryDisplay} stays one leaderboard. Runners can filter by ${variableName}.`;
    }
    if (valueCount === 0) return 'Add at least one value.';
    if (valueCount === 1) {
        return `${categoryDisplay} stays one leaderboard until you add a second value.`;
    }
    return `${categoryDisplay} becomes ${valueCount} separate leaderboards, each with its own world record.`;
}
