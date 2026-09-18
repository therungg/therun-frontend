'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useBoardNav } from './use-board-nav';

/**
 * Single URL-mutation path for variable (`role: 'filter'`) params — used by
 * both the popover's dropdown and the band's removable chips so a chip
 * "remove" produces exactly the same URL a popover toggle would.
 *
 * Delegates the actual transition to `useBoardNav` (Task 13) so a filter
 * change shares the same in-flight/dim state as category/subcategory/
 * verified nav instead of owning a second, uncoordinated `useTransition`.
 */
export function useFilterNav() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { navigate, isPending } = useBoardNav();

    const setVarFilter = (key: string, nextValues: string[]) => {
        const sp = new URLSearchParams(searchParams.toString());
        if (nextValues.length === 0) sp.delete(key);
        else sp.set(key, nextValues.join(','));
        sp.delete('page');
        navigate(`${pathname}?${sp.toString()}`, `filter:${key}`);
    };

    return { setVarFilter, isPending };
}
