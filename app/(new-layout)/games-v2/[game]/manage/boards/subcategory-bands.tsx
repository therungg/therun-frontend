'use client';

import {
    type EffectiveVariable,
    toEffective,
} from '~src/lib/variables/effective';
import type { VariableRow } from '../../../../../../types/leaderboards.types';
import styles from './board-curation.module.scss';

/** Published subcategory-role variables in scope for a category, honoring
 * shadowing so a category-scoped variable that replaces a shared one
 * doesn't render two bands for the same name (see `toEffective`). Mirrors
 * `effectiveVariableCount` in `src/lib/setup/category-status.ts`, but needs
 * the rows themselves rather than just a count.
 *
 * Shared by `BoardCuration`'s own bands and `RowActions`' Move-to target
 * bands (Task 11) — one place computing "what bands does category X show",
 * so the two can never drift on the shadowing rule. */
export function subcategoryVariablesFor(
    categoryId: number,
    variables: VariableRow[],
): EffectiveVariable[] {
    const gameWide = variables.filter((v) => v.categoryId === null);
    const categoryScoped = variables.filter((v) => v.categoryId === categoryId);
    const tagged = toEffective([...gameWide, ...categoryScoped], gameWide);
    const shadowedNames = new Set(
        tagged
            .filter((v) => v.source === 'category-overrides-shared')
            .map((v) => v.nameNormalized),
    );
    return tagged.filter(
        (v) =>
            v.role === 'subcategory' &&
            v.published &&
            !(v.source === 'shared' && shadowedNames.has(v.nameNormalized)),
    );
}

function canonicalOf(v: VariableRow, idx: number): string {
    return v.values[idx]?.[0] ?? '';
}

export function defaultCanonicalOf(v: VariableRow): string {
    return v.defaultValueIndex != null
        ? canonicalOf(v, v.defaultValueIndex)
        : '';
}

export interface SubcategoryBandsProps {
    variables: EffectiveVariable[];
    selectedValues: Record<string, string>;
    onSelect: (nameNormalized: string, canonical: string) => void;
    /** Distinguishes DOM ids between simultaneous renders of the same
     * category's bands (e.g. the board's own bands + a Move-to popover
     * targeting the same category) so `aria-labelledby` never points two
     * elements at the same id. */
    idPrefix?: string;
}

/** Renders one row of pill "bands" per published subcategory variable —
 * the masthead rail's chip vocabulary, shared between `BoardCuration`'s own
 * subcategory picker and the Move-to popover's target-subcategory picker. */
export function SubcategoryBands({
    variables,
    selectedValues,
    onSelect,
    idPrefix = 'board-curation',
}: SubcategoryBandsProps) {
    if (variables.length === 0) return null;

    return (
        <div className={styles.subcategoryBands}>
            {variables.map((v) => {
                const active =
                    selectedValues[v.nameNormalized] ?? defaultCanonicalOf(v);
                return (
                    <div
                        key={v.id}
                        className={styles.block}
                        role="group"
                        aria-labelledby={`${idPrefix}-var-${v.id}`}
                    >
                        <span
                            id={`${idPrefix}-var-${v.id}`}
                            className={styles.endcap}
                        >
                            {v.name}
                        </span>
                        <div className={styles.well}>
                            <div className={styles.chips}>
                                {v.values.map((bucket, i) => {
                                    const canonical = bucket[0];
                                    const isActive = active === canonical;
                                    return (
                                        <button
                                            key={`${v.id}-${i}`}
                                            type="button"
                                            aria-pressed={isActive}
                                            className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
                                            onClick={() =>
                                                onSelect(
                                                    v.nameNormalized,
                                                    canonical,
                                                )
                                            }
                                        >
                                            {canonical}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
