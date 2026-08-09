'use client';

import type { VariableRow } from '../../../../../types/leaderboards.types';
import styles from '../header/masthead.module.scss';
import { removeFilterValue } from './filter-values';
import { useFilterNav } from './use-filter-nav';

interface Props {
    defs: VariableRow[];
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

    // No label column: an active filter chip already says its own variable
    // name, so an "ACTIVE" endcap in front of it was a whole grid gutter
    // spent restating the obvious. The chips join the tier's control flow.
    return (
        <div
            className={styles.control}
            role="group"
            aria-label="Active filters"
        >
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
                    className={styles.activeChip}
                    aria-label={`Remove ${def.name}: ${value} filter`}
                >
                    <span className={styles.activeChipKey}>{def.name}</span>
                    {value}
                    <span aria-hidden="true" className={styles.activeChipX}>
                        ×
                    </span>
                </button>
            ))}
        </div>
    );
}
