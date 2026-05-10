'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export function ClearFiltersButton() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const onClick = () => {
        const sp = new URLSearchParams(searchParams.toString());
        sp.delete('subcategory');
        sp.delete('verified');
        sp.delete('page');
        for (const k of Array.from(sp.keys())) {
            if (k.startsWith('var_') || k.startsWith('subvar_')) sp.delete(k);
        }
        const qs = sp.toString();
        startTransition(() => {
            router.push(qs ? `${pathname}?${qs}` : pathname);
        });
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isPending}
            className="btn btn-sm btn-outline-secondary mt-2"
        >
            Clear filters
        </button>
    );
}
