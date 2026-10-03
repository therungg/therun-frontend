'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { writeVerifiedParam } from './builtin-params';
import styles from './clear-filters-button.module.scss';
import { useOptionalBoardNav } from './use-board-nav';

interface Props {
    /** The game's board default, so "all runs" is written the way it reads. */
    defaultVerified: boolean;
}

const PENDING_KEY = 'show-all-runs';

/**
 * Drops the Verified filter and nothing else — the way out of a board that
 * is empty only because its runs are still awaiting verification. Clear
 * filters can't be that way out on a game whose boards open verified: it
 * goes back to the default, which is the same empty board.
 */
export function ShowAllRunsButton({ defaultVerified }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    // Same split as ClearFiltersButton: the board's shared nav when there is
    // one, its own transition on the console's copy of the table.
    const nav = useOptionalBoardNav();
    const [ownPending, startOwn] = useTransition();
    const isPending = nav
        ? nav.isPending && nav.pendingKey === PENDING_KEY
        : ownPending;

    const onClick = () => {
        const sp = new URLSearchParams(searchParams.toString());
        writeVerifiedParam(sp, false, defaultVerified);
        sp.delete('page');
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
            {isPending ? 'Loading…' : 'Show all runs'}
            {isPending && <span aria-hidden className={styles.spinner} />}
        </button>
    );
}
