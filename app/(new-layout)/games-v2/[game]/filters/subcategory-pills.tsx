'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type { VariableDef } from '../../../../../types/leaderboards.types';

interface Props {
    defs: VariableDef[];
    selected: Record<string, string>;
}

function canonicalOf(def: VariableDef, idx: number): string {
    const bucket = def.values[idx];
    return bucket?.[0] ?? '';
}

export function SubcategoryPills({ defs, selected }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const subcatDefs = defs.filter((d) => d.role === 'subcategory');
    if (subcatDefs.length === 0) return null;

    const onPick = (def: VariableDef, value: string) => {
        const sp = new URLSearchParams(searchParams.toString());
        sp.set(def.nameNormalized, value);
        sp.delete('page');
        sp.delete('combined');
        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`);
        });
    };

    return (
        <div className="d-flex flex-column gap-2 mb-3">
            {subcatDefs.map((def) => {
                const defaultCanonical =
                    def.defaultValueIndex != null
                        ? canonicalOf(def, def.defaultValueIndex)
                        : '';
                const activeValue =
                    selected[def.nameNormalized] ?? defaultCanonical;
                return (
                    <div
                        key={def.nameNormalized}
                        className="d-flex align-items-center gap-2 flex-wrap"
                    >
                        <span className="small text-muted">{def.name}:</span>
                        {def.values.map((bucket, idx) => {
                            const canonical = bucket[0];
                            const isActive = activeValue === canonical;
                            return (
                                <button
                                    key={`${def.nameNormalized}-${idx}`}
                                    type="button"
                                    onClick={() => onPick(def, canonical)}
                                    disabled={isPending}
                                    aria-pressed={isActive}
                                    className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-secondary'}`}
                                    title={
                                        bucket.length > 1
                                            ? `Aliases: ${bucket.slice(1).join(', ')}`
                                            : undefined
                                    }
                                >
                                    {canonical}
                                </button>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}
