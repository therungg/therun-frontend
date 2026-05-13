'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import type { ResolvedCategory } from '../../../../../types/leaderboards.types';

interface Props {
    categories: ResolvedCategory[];
    selectedCategoryName: string;
}

const FALLBACK_VISIBLE_COUNT = 5;

export function CategoryPills({ categories, selectedCategoryName }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [expanded, setExpanded] = useState(false);

    const { visible, hiddenCount } = useMemo(() => {
        const mains = categories.filter((c) => c.isMain);
        const base =
            mains.length > 0
                ? mains
                : categories.slice(0, FALLBACK_VISIBLE_COUNT);
        const baseIds = new Set(base.map((c) => c.id));

        const selected = categories.find(
            (c) => c.name === selectedCategoryName,
        );
        const withSelected =
            selected && !baseIds.has(selected.id) ? [...base, selected] : base;
        const visibleIds = new Set(withSelected.map((c) => c.id));
        const hidden = categories.filter((c) => !visibleIds.has(c.id));

        return {
            visible: expanded ? categories : withSelected,
            hiddenCount: hidden.length,
        };
    }, [categories, selectedCategoryName, expanded]);

    const onSelect = (name: string) => {
        const sp = new URLSearchParams(searchParams.toString());
        sp.set('category', name);
        sp.delete('page');
        sp.delete('subcategory');
        for (const k of Array.from(sp.keys())) {
            if (k.startsWith('var_') || k.startsWith('subvar_')) sp.delete(k);
        }
        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`);
        });
    };

    if (categories.length <= 1) return null;

    return (
        <nav className="d-flex gap-2 flex-wrap mb-3" aria-label="Category">
            {visible.map((c) => {
                const active = c.name === selectedCategoryName;
                return (
                    <button
                        key={c.id}
                        type="button"
                        onClick={() => onSelect(c.name)}
                        disabled={isPending}
                        aria-pressed={active}
                        className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline-secondary'}`}
                    >
                        {c.display}
                    </button>
                );
            })}
            {hiddenCount > 0 && (
                <button
                    type="button"
                    onClick={() => setExpanded((e) => !e)}
                    className="btn btn-sm btn-link"
                >
                    {expanded
                        ? 'Show fewer'
                        : `Show ${hiddenCount} more categor${hiddenCount === 1 ? 'y' : 'ies'}`}
                </button>
            )}
        </nav>
    );
}
