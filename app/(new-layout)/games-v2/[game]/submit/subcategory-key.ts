// Canonical subcategory key: sorted `name=value|...`. Mirrors
// `canonicalSubcategoryFragment` in src/lib/leaderboards-v1.ts (the board
// picker) so managed-combination validity — and the key a self-claim
// asserts against — matches the board exactly.
export function buildSubcategoryKey(values: Record<string, string>): string {
    return Object.keys(values)
        .sort()
        .map((k) => `${k}=${values[k]}`)
        .join('|');
}
