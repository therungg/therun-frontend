import type { VariableDef } from '../../../../../types/leaderboards.types';
import styles from '../game-page.module.scss';
import { SubcategoryPills } from './subcategory-pills';

interface Props {
    defs: VariableDef[];
    selectedSubcategoryValues: Record<string, string>;
}

export function FilterBar({ defs, selectedSubcategoryValues }: Props) {
    const hasSubcategories = defs.some((d) => d.role === 'subcategory');
    if (!hasSubcategories) return null;

    return (
        <div className={`${styles.bandRow} ${styles.bandRowSub}`}>
            <SubcategoryPills
                defs={defs}
                selected={selectedSubcategoryValues}
            />
        </div>
    );
}
