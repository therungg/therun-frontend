import type { VariableDef } from '../../../../../../types/leaderboards.types';

/**
 * Decode a plain-text `subcategoryKey` ("platform=n64|region=us") into a
 * human-readable label using the category's subcategory variable defs.
 * Falls back to the raw key if decoding fails so admins always have
 * something to click.
 */
export function describeSubcategory(
    subcategoryKey: string,
    variables: VariableDef[],
): string {
    if (!subcategoryKey) return 'Default';

    const subcatVars = new Map(
        variables
            .filter((v) => v.role === 'subcategory')
            .map((v) => [v.nameNormalized, v]),
    );
    if (subcatVars.size === 0) return subcategoryKey;

    const parts = subcategoryKey.split('|').map((pair) => {
        const eq = pair.indexOf('=');
        if (eq < 0) return pair;
        const key = pair.slice(0, eq);
        const value = pair.slice(eq + 1);
        const def = subcatVars.get(key);
        if (!def) return `${key}=${value}`;
        const bucket = def.values.find((b) =>
            b.some((alias) => alias.toLowerCase() === value.toLowerCase()),
        );
        const display = bucket?.[0] ?? value;
        return `${def.name}: ${display}`;
    });

    return parts.join(' · ');
}
