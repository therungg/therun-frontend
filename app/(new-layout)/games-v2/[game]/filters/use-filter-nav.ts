'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

/**
 * Single URL-mutation path for variable (`role: 'filter'`) params — used by
 * both the popover's dropdown and the band's removable chips so a chip
 * "remove" produces exactly the same URL a popover toggle would.
 */
export function useFilterNav() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const setVarFilter = (key: string, nextValues: string[]) => {
        const sp = new URLSearchParams(searchParams.toString());
        if (nextValues.length === 0) sp.delete(key);
        else sp.set(key, nextValues.join(','));
        sp.delete('page');
        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`);
        });
    };

    return { setVarFilter, isPending };
}
