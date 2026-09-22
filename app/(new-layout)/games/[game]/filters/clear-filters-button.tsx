'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { BUILTIN_PARAM_KEYS } from './builtin-params';
import styles from './clear-filters-button.module.scss';
import { useOptionalBoardNav } from './use-board-nav';

interface Props {
    variableKeys: string[];
}

const PENDING_KEY = 'clear-filters';

export function ClearFiltersButton({ variableKeys }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    // The board page's shared nav, so clearing dims the board and raises the
    // top bar like every other control that rebuilds it. Optional because
    // the console renders this same table (and so this same button) on a page
    // that has no board nav — there it keeps its own transition.
    const nav = useOptionalBoardNav();
    const [ownPending, startOwn] = useTransition();
    const isPending = nav
        ? nav.isPending && nav.pendingKey === PENDING_KEY
        : ownPending;

    const onClick = () => {
        const sp = new URLSearchParams(searchParams.toString());
        for (const k of BUILTIN_PARAM_KEYS) sp.delete(k);
        sp.delete('page');
        sp.delete('combined');
        for (const k of variableKeys) sp.delete(k);
        const qs = sp.toString();
        const url = qs ? `${pathname}?${qs}` : pathname;
        if (nav) {
            nav.navigate(url, PENDING_KEY);
            return;
        }
        startOwn(() => {
            router.push(url);
        });
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isPending}
            aria-busy={isPending || undefined}
            className={styles.clearBtn}
        >
            {isPending ? 'Clearing…' : 'Clear filters'}
            {isPending && <span aria-hidden className={styles.spinner} />}
        </button>
    );
}
