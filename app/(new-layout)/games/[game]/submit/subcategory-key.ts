import { normalizeVariableName } from '~src/lib/variables/keys';

// Canonical subcategory key: sorted `name=value|...`. Mirrors
// `canonicalSubcategoryFragment` in src/lib/leaderboards-v1.ts (the board
// picker) so managed-combination validity — and the key a self-claim
// asserts against — matches the board exactly.
//
// Both halves of each pair are normalized, because the backend normalizes
// both before a key ever reaches a board: a run's key is built from
// `normalizeVariableString(bucket[0])`, not from the bucket's display label.
// Building `console/emu=Console|difficulty=Easy` where the board asks for
// `console/emu=console|difficulty=easy` files the entry on a slice no board
// serves — the board matches the key with `=`, so the time is simply never
// seen. The pickers hand over display labels ("Console", "Switch 1"), so the
// normalization has to happen here.
export function buildSubcategoryKey(values: Record<string, string>): string {
    return Object.entries(values)
        .map(
            ([name, value]) =>
                [
                    normalizeVariableName(name),
                    normalizeVariableName(value),
                ] as const,
        )
        .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .map(([name, value]) => `${name}=${value}`)
        .join('|');
}
