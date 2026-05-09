import type { VariableDef } from '../../../../../types/leaderboards.types';
import { SubcategoryPills } from './subcategory-pills';
import { VariablePills } from './variable-pills';
import { VerifiedToggle } from './verified-toggle';

interface Props {
    defs: VariableDef[];
    selectedSubcategoryValues: Record<string, string>;
    selectedVarFilters: Record<string, string>;
    verified: boolean;
}

export function FilterBar({
    defs,
    selectedSubcategoryValues,
    selectedVarFilters,
    verified,
}: Props) {
    const filterDefs = defs.filter((d) => d.kind === 'filter');

    return (
        <div className="mb-3">
            <SubcategoryPills
                defs={defs}
                selected={selectedSubcategoryValues}
            />
            <VariablePills defs={filterDefs} selected={selectedVarFilters} />
            <VerifiedToggle verified={verified} />
        </div>
    );
}
