import type { VariableRow } from '../../../../../types/leaderboards.types';
import styles from '../header/masthead.module.scss';
import { ActiveFilterChips } from './active-filter-chips';
import { SubcategoryPills } from './subcategory-pills';
import { TierSummary } from './tier-summary';

interface Props {
    defs: VariableRow[];
    selectedSubcategoryValues: Record<string, string>;
    selectedVarFilters: Record<string, string>;
    /** `nameNormalized -> canonicalValue -> runners`; see GamePageData. */
    subcategoryValueCounts: Record<string, Record<string, number>>;
    totalItems: number;
}

/**
 * One line, however many variables the game defines: the controls flow left,
 * the resolved count and Reset sit against the right edge. The old tier grew
 * a full labeled row per variable, so a game with four axes pushed the board
 * itself below the fold before a single run was visible.
 */
export function FilterBar({
    defs,
    selectedSubcategoryValues,
    selectedVarFilters,
    subcategoryValueCounts,
    totalItems,
}: Props) {
    const hasSubcategories = defs.some((d) => d.role === 'subcategory');
    const hasVarFilters = Object.keys(selectedVarFilters).length > 0;
    if (!hasSubcategories && !hasVarFilters) return null;

    return (
        <div className={styles.tier}>
            <div className={styles.tierControls}>
                <SubcategoryPills
                    defs={defs}
                    selected={selectedSubcategoryValues}
                    counts={subcategoryValueCounts}
                />
                <ActiveFilterChips defs={defs} selected={selectedVarFilters} />
            </div>
            <TierSummary
                defs={defs}
                selectedSubcategoryValues={selectedSubcategoryValues}
                selectedVarFilters={selectedVarFilters}
                totalItems={totalItems}
            />
        </div>
    );
}
