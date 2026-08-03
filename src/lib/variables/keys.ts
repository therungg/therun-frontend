// Subcategory key parsing/building shared across board curation UI (Tasks
// 9-12), combinations management, and board URL helpers. A subcategory key
// is a canonical `name=value|name=value` string identifying a board slice.
//
// Ordering is load-bearing: the backend builds these keys by sorting
// subcategory-variable pairs alphabetically by `nameNormalized` (see
// `resolve-run-variables.ts` and `build-leaderboard-query.ts` in the
// therun-backend repo, both `subcatParts.sort((a, b) => (a[0] < b[0] ? -1 :
// a[0] > b[0] ? 1 : 0))`). `buildSubcategoryKey` mirrors that ordering so a
// key built here always matches the one the backend would produce for the
// same parts.

export interface SubcategoryKeyPart {
    name: string;
    value: string;
}

/**
 * Same normalization the backend applies to names and values before they
 * enter a key (see normalizeVariableString): lowercase, whitespace stripped,
 * `=` and `|` removed.
 */
export function normalizeVariableName(raw: string): string {
    return raw.trim().toLowerCase().replace(/\s+/g, '').replace(/[=|]/g, '');
}

/** Parses a `name=value|name=value` subcategory key into ordered pairs. */
export function parseSubcategoryKey(key: string): SubcategoryKeyPart[] {
    if (!key) return [];
    return key.split('|').map((pair) => {
        const eq = pair.indexOf('=');
        return eq < 0
            ? { name: pair, value: '' }
            : { name: pair.slice(0, eq), value: pair.slice(eq + 1) };
    });
}

/**
 * Builds a subcategory key from parts, sorted alphabetically by `name` to
 * match the backend's canonical ordering (see module comment above).
 */
export function buildSubcategoryKey(parts: SubcategoryKeyPart[]): string {
    return [...parts]
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
        .map(({ name, value }) => `${name}=${value}`)
        .join('|');
}
