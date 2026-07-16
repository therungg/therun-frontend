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

// Module-level flag (not state): the parent keys this component by the
// filter signature, so every category/filter change remounts it. The
// very first-ever mount of a pager on the page staggers its rows in;
// every later remount (a category/filter swap) gets the quick 120ms
// fade instead. Because this lives outside the component, it survives
// across those remounts while still being fixed for the lifetime of
// any single instance (Show more/previous never touch it).
let hasAnimatedFirstBoard = false;

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
    // Frozen for the lifetime of this instance so the wrapper's entry
    // animation never re-fires when "Show more"/"Show previous" appends
    // a page — only the initial mount decides stagger vs. fade. Server
    // always emits stagger (module scope persists across requests, so
    // mutating the flag during SSR would desync from a fresh client);
    // a fresh client computes stagger on hydration too (match). Only
    // client-side remounts (filter swaps) get the fade.
    const [entryClass] = useState(() => {
        if (typeof window === 'undefined') return styles.boardStagger;
        const cls = hasAnimatedFirstBoard
            ? styles.boardFade
            : styles.boardStagger;
        hasAnimatedFirstBoard = true;
        return cls;
    });

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

    return (
        <div className={entryClass}>
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
                        <span>{merged.length.toLocaleString()}</span> of{' '}
                        <span>{initial.totalItems.toLocaleString()}</span>
                    </span>
                </div>
            )}
        </div>
    );
}
