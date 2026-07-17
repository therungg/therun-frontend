import type { VariableDef } from '../../../../../types/leaderboards.types';
import styles from '../game-page.module.scss';
import { ActiveFilterChips } from './active-filter-chips';
import { SubcategoryPills } from './subcategory-pills';

interface Props {
    defs: VariableDef[];
    selectedSubcategoryValues: Record<string, string>;
    selectedVarFilters: Record<string, string>;
}

export function FilterBar({
    defs,
    selectedSubcategoryValues,
    selectedVarFilters,
}: Props) {
    const hasSubcategories = defs.some((d) => d.role === 'subcategory');
    const hasVarFilters = Object.keys(selectedVarFilters).length > 0;
    if (!hasSubcategories && !hasVarFilters) return null;

    return (
        <div className={`${styles.bandRow} ${styles.bandRowSub}`}>
            <SubcategoryPills
                defs={defs}
                selected={selectedSubcategoryValues}
            />
            <ActiveFilterChips defs={defs} selected={selectedVarFilters} />
        </div>
    );
}
