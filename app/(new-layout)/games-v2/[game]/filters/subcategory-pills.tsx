'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { computeSubcategoryHash } from '~src/lib/leaderboard-hash';
import type { VariableDef } from '../../../../../types/leaderboards.types';

interface Props {
    defs: VariableDef[];
    selected: Record<string, string>;
}

export function SubcategoryPills({ defs, selected }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const subcatDefs = defs.filter((d) => d.kind === 'subcategory');
    if (subcatDefs.length === 0) return null;

    const onPick = (def: VariableDef, value: string) => {
        const next = { ...selected, [def.name]: value };
        let hash: string;
        try {
            hash = computeSubcategoryHash(defs, next);
        } catch {
            return; // required variable not yet selected; defensive refuse
        }
        const sp = new URLSearchParams(searchParams.toString());
        if (hash) sp.set('subcategory', hash);
        else sp.delete('subcategory');
        sp.delete('page');
        sp.set(`subvar_${def.name}`, value);
        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`);
        });
    };

    return (
        <div className="d-flex flex-column gap-2 mb-3">
            {subcatDefs.map((def) => (
                <div
                    key={def.name}
                    className="d-flex align-items-center gap-2 flex-wrap"
                >
                    <span className="small text-muted">{def.display}:</span>
                    {def.values.map((v) => {
                        const isActive =
                            (selected[def.name] ?? def.defaultValue) === v;
                        return (
                            <button
                                key={v}
                                type="button"
                                onClick={() => onPick(def, v)}
                                disabled={isPending}
                                aria-pressed={isActive}
                                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-secondary'}`}
                            >
                                {v}
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
