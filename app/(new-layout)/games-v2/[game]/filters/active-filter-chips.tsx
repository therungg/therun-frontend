'use client';

import type { VariableDef } from '../../../../../types/leaderboards.types';
import styles from '../header/masthead.module.scss';
import { removeFilterValue } from './filter-values';
import { useFilterNav } from './use-filter-nav';

interface Props {
    defs: VariableDef[];
    selected: Record<string, string>;
}

/**
 * Echoes active variable (`role: 'filter'`) selections as removable chips in
 * the sub-band row, next to the subcategory pills — so a filter narrowing
 * the board is visible without opening the Filters popover. Removing a chip
 * clears exactly that value via the same URL mechanics the popover uses.
 */
export function ActiveFilterChips({ defs, selected }: Props) {
    const { setVarFilter, isPending } = useFilterNav();

    const chips = defs
        .filter((d) => d.role === 'filter')
        .flatMap((def) => {
            const values =
                selected[def.nameNormalized]?.split(',').filter(Boolean) ?? [];
            return values.map((value) => ({ def, value, values }));
        });

    if (chips.length === 0) return null;

    return (
        <div
            className={styles.block}
            role="group"
            aria-labelledby="active-filters-cap"
        >
            <span className={styles.endcap} id="active-filters-cap">
                Active
            </span>
            <div className={styles.well}>
                <div className={styles.chips}>
                    {chips.map(({ def, value, values }) => (
                        <button
                            key={`${def.nameNormalized}-${value}`}
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                                setVarFilter(
                                    def.nameNormalized,
                                    removeFilterValue(values, value),
                                )
                            }
                            className={`${styles.chip} ${styles.chipActive}`}
                            aria-label={`Remove ${def.name}: ${value} filter`}
                        >
                            {def.name}: {value}
                            <span aria-hidden="true"> ×</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
