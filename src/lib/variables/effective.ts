import type { VariableRow } from '../../../types/leaderboards.types';

export type VariableSource =
    | 'shared'
    | 'category'
    | 'category-overrides-shared';

export interface EffectiveVariable extends VariableRow {
    source: VariableSource;
}

/**
 * Same normalization the backend applies (see normalizeVariableString): the
 * override rule keys on it, so a mismatch here would report the wrong source.
 */
export function normalizeVariableName(raw: string): string {
    return raw.trim().toLowerCase().replace(/\s+/g, '').replace(/[=|]/g, '');
}

/**
 * Tag each row of the merged list with where it came from.
 *
 * `merged` is what the public endpoint returns for one category — already
 * merged, already published-only. `gameWide` is the admin list for
 * categoryId=null, which is what tells us whether a category row is a plain
 * category variable or one that shadows a shared one. That distinction is the
 * whole point: today a mod can replace a shared variable's values and default
 * for one category without ever being told.
 */
export function toEffective(
    merged: VariableRow[],
    gameWide: VariableRow[],
): EffectiveVariable[] {
    const sharedNames = new Set(gameWide.map((v) => v.nameNormalized));
    return [...merged]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((v) => ({
            ...v,
            source:
                v.categoryId == null
                    ? ('shared' as const)
                    : sharedNames.has(v.nameNormalized)
                      ? ('category-overrides-shared' as const)
                      : ('category' as const),
        }));
}

export function describeSource(
    source: VariableSource,
    categoryDisplay: string,
    variableName: string,
): string {
    switch (source) {
        case 'shared':
            return 'Shared by all categories';
        case 'category':
            return `${categoryDisplay} only`;
        case 'category-overrides-shared':
            return `${categoryDisplay} only — replaces the shared ${variableName}`;
    }
}

/** The game-wide row a new category-scoped name would shadow, if any. */
export function findShadowed(
    name: string,
    gameWide: VariableRow[],
): VariableRow | undefined {
    const normalized = normalizeVariableName(name);
    return gameWide.find((v) => v.nameNormalized === normalized);
}
