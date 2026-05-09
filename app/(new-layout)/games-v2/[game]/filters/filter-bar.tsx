import type { VariableDef } from '../../../../../types/leaderboards.types';
import { SubcategoryPills } from './subcategory-pills';
import { VariablePill } from './variable-pill';
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
            {filterDefs.length > 0 && (
                <div className="d-flex gap-2 flex-wrap mb-2">
                    {filterDefs.map((def) => (
                        <VariablePill
                            key={def.name}
                            def={def}
                            selectedValues={
                                selectedVarFilters[def.name]
                                    ?.split(',')
                                    .filter(Boolean) ?? []
                            }
                        />
                    ))}
                </div>
            )}
            <VerifiedToggle verified={verified} />
        </div>
    );
}
