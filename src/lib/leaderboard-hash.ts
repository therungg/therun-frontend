import { createHash } from 'node:crypto';
import type { VariableDef } from '../../types/leaderboards.types';

export class MissingRequiredVariableError extends Error {
    constructor(name: string) {
        super(`Missing required subcategory variable: ${name}`);
    }
}

/**
 * Mirrors the backend computeSubcategoryHash algorithm:
 *   1. Filter to subcategory-typed variables only.
 *   2. Sort by name alphabetically.
 *   3. For each: use the user's selected value, or fall back to defaultValue.
 *   4. If a variable is required and has no value or default, throw.
 *   5. Build "name1=value1|name2=value2|...".
 *   6. SHA-256, truncate to 16 hex chars.
 *
 * Returns "" if no subcategory variables exist or all are unset.
 */
export function computeSubcategoryHash(
    defs: VariableDef[],
    selected: Record<string, string | undefined>,
): string {
    const subcategoryDefs = defs
        .filter((d) => d.kind === 'subcategory')
        .sort((a, b) => a.name.localeCompare(b.name));

    if (subcategoryDefs.length === 0) return '';

    const parts: string[] = [];
    for (const def of subcategoryDefs) {
        const value = selected[def.name] ?? def.defaultValue ?? undefined;
        if (value === undefined || value === null || value === '') {
            if (def.required) throw new MissingRequiredVariableError(def.name);
            continue;
        }
        parts.push(`${def.name}=${value}`);
    }

    if (parts.length === 0) return '';

    return createHash('sha256')
        .update(parts.join('|'))
        .digest('hex')
        .slice(0, 16);
}
