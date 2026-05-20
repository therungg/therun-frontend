'use client';

import { useState } from 'react';
import type { VariableDef } from '../../../../../types/leaderboards.types';
import { VariablePill } from './variable-pill';

interface Props {
    defs: VariableDef[];
    selected: Record<string, string>;
}

export function VariablePills({ defs, selected }: Props) {
    const [openName, setOpenName] = useState<string | null>(null);

    if (defs.length === 0) return null;

    return (
        <div className="d-flex gap-2 flex-wrap mb-2">
            {defs.map((def) => (
                <VariablePill
                    key={def.nameNormalized}
                    def={def}
                    selectedValues={
                        selected[def.nameNormalized]
                            ?.split(',')
                            .filter(Boolean) ?? []
                    }
                    isOpen={openName === def.nameNormalized}
                    onOpen={() => setOpenName(def.nameNormalized)}
                    onClose={() => setOpenName(null)}
                />
            ))}
        </div>
    );
}
