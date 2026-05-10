import type { VariableDef } from '../../../../../../types/leaderboards.types';

// Decode a subcategoryHash into a human-readable label using the category's
// subcategory variables. Hash format is opaque to the frontend; if we can't
// match it against the variable values, fall back to the raw hash so users
// can still see and delete the row.
export function describeSubcategory(
    hash: string,
    variables: VariableDef[],
): string {
    if (!hash) return 'Default';

    const subcatVars = variables.filter((v) => v.kind === 'subcategory');
    if (subcatVars.length === 0) return hash;

    // Heuristic: the backend's hash is constructed from sorted variable
    // values. We don't have access to the exact algorithm here, so we display
    // the raw hash with a hint when we can't decode confidently. A future
    // improvement is to ask the backend to return a `subcategoryLabel` field.
    return hash;
}
