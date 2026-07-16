'use client';

import { useState, useTransition } from 'react';
import type { LeaderboardQuery } from '~src/lib/leaderboards-v1';
import type {
    LeaderboardEntry,
    LeaderboardResponse,
} from '../../../../../types/leaderboards.types';
import { fetchLeaderboardPage } from '../actions/fetch-page.action';
import styles from './leaderboard.module.scss';
import { LeaderboardTable } from './leaderboard-table';
import { mergeEntries } from './merge-entries';

interface Props {
    initial: LeaderboardResponse;
    query: Omit<LeaderboardQuery, 'page'>;
    sessionUsername: string | null;
    canManage: boolean;
    gameSlug: string;
    variableKeys: string[];
}

/**
 * Client accumulator around the SSR'd page: "Show more" appends the
 * next page, "Show previous" prepends (deep links land mid-board).
 * The URL's ?page= tracks the highest loaded page via replaceState
 * so refresh/share keeps a valid deep link. Parent must key this
 * component by the filter signature so state resets on any change.
 */
export function LeaderboardPager({
    initial,
    query,
    sessionUsername,
    canManage,
    gameSlug,
    variableKeys,
}: Props) {
    const [pages, setPages] = useState<LeaderboardEntry[][]>([initial.entries]);
    const [minPage, setMinPage] = useState(initial.page);
    const [maxPage, setMaxPage] = useState(initial.page);
    const [isPending, startTransition] = useTransition();
    // No pages loaded beyond the SSR'd one yet: this is the initial
    // navigation into this instance, so rows stagger in. Once a
    // "Show more"/"Show previous" appends/prepends a page, this stays
    // false for the lifetime of the instance (a filter change remounts
    // via the parent `key`, resetting it).
    const stagger = pages.length === 1;

    const load = (page: number, position: 'before' | 'after') => {
        startTransition(async () => {
            const res = await fetchLeaderboardPage({ ...query, page });
            if (!res) return;
            setPages((prev) =>
                position === 'after'
                    ? [...prev, res.entries]
                    : [res.entries, ...prev],
            );
            if (position === 'after') setMaxPage(page);
            else setMinPage(page);
            const sp = new URLSearchParams(window.location.search);
            const highest = position === 'after' ? page : maxPage;
            if (highest === 1) sp.delete('page');
            else sp.set('page', String(highest));
            const qs = sp.toString();
            window.history.replaceState(
                null,
                '',
                qs
                    ? `${window.location.pathname}?${qs}`
                    : window.location.pathname,
            );
        });
    };

    const merged = mergeEntries(pages);
    const shownThrough = Math.min(
        maxPage * initial.pageSize,
        initial.totalItems,
    );

    return (
        <div className={stagger ? styles.boardStagger : styles.boardFade}>
            {minPage > 1 && (
                <div className={styles.showMoreBar}>
                    <button
                        type="button"
                        className={styles.showMoreBtn}
                        disabled={isPending}
                        onClick={() => load(minPage - 1, 'before')}
                    >
                        Show previous
                    </button>
                </div>
            )}
            <LeaderboardTable
                leaderboard={{ ...initial, entries: merged }}
                sessionUsername={sessionUsername}
                canManage={canManage}
                gameSlug={gameSlug}
                variableKeys={variableKeys}
            />
            {maxPage < initial.totalPages && (
                <div className={styles.showMoreBar}>
                    <button
                        type="button"
                        className={styles.showMoreBtn}
                        disabled={isPending}
                        onClick={() => load(maxPage + 1, 'after')}
                    >
                        {isPending ? 'Loading…' : 'Show more'}
                    </button>
                    <span className={styles.showMoreMeta}>
                        <span>{shownThrough.toLocaleString()}</span> of{' '}
                        <span>{initial.totalItems.toLocaleString()}</span>
                    </span>
                </div>
            )}
        </div>
    );
}
