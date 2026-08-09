'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import type { VariableRow } from '../../../../../types/leaderboards.types';
import styles from '../header/masthead.module.scss';
import { useBoardNav } from './use-board-nav';

interface Props {
    defs: VariableRow[];
    selectedSubcategoryValues: Record<string, string>;
    selectedVarFilters: Record<string, string>;
    /** Rows on the board as currently narrowed. */
    totalItems: number;
}

/**
 * The right end of the filter tier: what the current selection actually
 * resolved to, and the way back out of it.
 *
 * Before this, the header stated the selection four times (one highlight per
 * row) and the *result* zero times — you had to scroll to the table to learn
 * whether narrowing had left you eight runners or eight hundred. The number
 * belongs next to the controls that produce it, and it is also the only place
 * that names the unit the bare chip counts are counting.
 */
export function TierSummary({
    defs,
    selectedSubcategoryValues,
    selectedVarFilters,
    totalItems,
}: Props) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { navigate, isPending } = useBoardNav();

    // "Narrowed" means narrowed away from what a first-time visitor sees:
    // any variable pinned in the URL, or any filter at all. A subcategory
    // sitting on its own default is not a filter the reader chose.
    const pinned = defs.filter(
        (d) =>
            d.role === 'subcategory' &&
            selectedSubcategoryValues[d.nameNormalized] != null,
    );
    const narrowed =
        pinned.length > 0 || Object.keys(selectedVarFilters).length > 0;

    const onReset = () => {
        const sp = new URLSearchParams(searchParams.toString());
        for (const d of defs) sp.delete(d.nameNormalized);
        sp.delete('page');
        sp.delete('combined');
        const qs = sp.toString();
        navigate(qs ? `${pathname}?${qs}` : pathname, 'subcat:reset');
    };

    return (
        <div className={styles.tierEnd}>
            <span className={styles.tierCount}>
                <strong>{totalItems.toLocaleString()}</strong>{' '}
                {totalItems === 1 ? 'runner' : 'runners'}
            </span>
            {narrowed && (
                <button
                    type="button"
                    onClick={onReset}
                    disabled={isPending}
                    className={styles.tierReset}
                >
                    Reset
                </button>
            )}
        </div>
    );
}
