'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { applyDraftToParams, type FilterDraft } from './filter-draft';
import { useBoardNav } from './use-board-nav';

type BuiltinKey = 'verified' | 'video' | 'from' | 'to' | 'country' | 'playedon';

/**
 * Single URL-mutation path for the built-in filters (verified / video / date
 * range / country / played on) — the popover rows and the band's removable
 * chips both go through here so a chip "×" yields exactly the URL the popover
 * would.
 * Delegates the transition to `useBoardNav` for the shared pending/dim state.
 */
export function useBuiltinFilterNav() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { navigate, isPending, pendingKey } = useBoardNav();

    const push = (mutate: (sp: URLSearchParams) => void, key: string) => {
        const sp = new URLSearchParams(searchParams.toString());
        mutate(sp);
        sp.delete('page');
        const qs = sp.toString();
        navigate(qs ? `${pathname}?${qs}` : pathname, key);
    };

    const setBuiltin = (key: BuiltinKey, value: string | null) =>
        push((sp) => {
            if (value === null || value === '') sp.delete(key);
            else sp.set(key, value);
        }, `builtin:${key}`);

    const setRange = (from: string | null, to: string | null) =>
        push((sp) => {
            if (from) sp.set('from', from);
            else sp.delete('from');
            if (to) sp.set('to', to);
            else sp.delete('to');
        }, 'builtin:range');

    /** Multi-select, so it writes the whole list at once: an empty list
     * clears the param rather than leaving `playedon=`. */
    const setPlayedOn = (values: string[]) =>
        push((sp) => {
            if (values.length > 0) sp.set('playedon', values.join(','));
            else sp.delete('playedon');
        }, 'builtin:playedon');

    /**
     * The Filters sheet's one write: the whole draft — built-ins and the
     * category's own filter values — lands in a single navigation, so a
     * sheetful of changes costs one board fetch instead of six.
     */
    const applyFilters = (d: FilterDraft, variableKeys: string[]) =>
        push((sp) => applyDraftToParams(sp, d, variableKeys), 'builtin:apply');

    return {
        setBuiltin,
        setRange,
        setPlayedOn,
        applyFilters,
        isPending,
        pendingKey,
    };
}
