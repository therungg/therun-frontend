'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import type { VariableDef } from '../../../../../types/leaderboards.types';
import styles from '../game-page.module.scss';
import { useBoardNav } from './use-board-nav';

interface Props {
    defs: VariableDef[];
    selected: Record<string, string>;
}

function canonicalOf(def: VariableDef, idx: number): string {
    const bucket = def.values[idx];
    return bucket?.[0] ?? '';
}

function pendingKeyFor(def: VariableDef, value: string): string {
    return `subcat:${def.nameNormalized}:${value}`;
}

export function SubcategoryPills({ defs, selected }: Props) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { navigate, isPending, pendingKey } = useBoardNav();

    const subcatDefs = defs.filter((d) => d.role === 'subcategory');
    if (subcatDefs.length === 0) return null;

    const onPick = (def: VariableDef, value: string) => {
        const sp = new URLSearchParams(searchParams.toString());
        sp.set(def.nameNormalized, value);
        sp.delete('page');
        sp.delete('combined');
        navigate(`${pathname}?${sp.toString()}`, pendingKeyFor(def, value));
    };

    return (
        <div
            className="d-flex flex-column gap-1"
            aria-busy={isPending || undefined}
        >
            {subcatDefs.map((def) => {
                const defaultCanonical =
                    def.defaultValueIndex != null
                        ? canonicalOf(def, def.defaultValueIndex)
                        : '';
                const activeValue =
                    selected[def.nameNormalized] ?? defaultCanonical;
                // Optimistic selection: while this def's value-swap nav is
                // in flight, the clicked value pill renders active
                // immediately, and the previous value's pill drops to rest
                // (req 2) — an in-flight nav for a *different* def leaves
                // this row's own activeValue untouched.
                const pendingValue = def.values
                    .map((bucket) => bucket[0])
                    .find(
                        (canonical) =>
                            isPending &&
                            pendingKey === pendingKeyFor(def, canonical),
                    );
                const optimisticActiveValue = pendingValue ?? activeValue;
                return (
                    <div
                        key={def.nameNormalized}
                        className="d-flex align-items-center gap-2 flex-wrap"
                    >
                        <span className={styles.groupLabel}>{def.name}</span>
                        {def.values.map((bucket, idx) => {
                            const canonical = bucket[0];
                            const isActive =
                                optimisticActiveValue === canonical;
                            return (
                                <button
                                    key={`${def.nameNormalized}-${idx}`}
                                    type="button"
                                    onClick={() => onPick(def, canonical)}
                                    aria-pressed={isActive}
                                    className={`${styles.pill} ${isActive ? styles.pillActive : ''}`}
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
