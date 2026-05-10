'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type { ResolvedCategory } from '../../../../../types/leaderboards.types';

interface Props {
    categories: ResolvedCategory[];
    selectedCategoryName: string;
}

export function CategoryPills({ categories, selectedCategoryName }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

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
            {categories.map((c) => {
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
        </nav>
    );
}
