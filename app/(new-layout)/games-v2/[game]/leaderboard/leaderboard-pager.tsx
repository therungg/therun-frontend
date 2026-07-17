'use client';

import { useEffect, useState, useTransition } from 'react';
import type { LeaderboardQuery } from '~src/lib/leaderboards-v1';
import type {
    LeaderboardEntry,
    LeaderboardResponse,
} from '../../../../../types/leaderboards.types';
import { fetchLeaderboardPage } from '../actions/fetch-page.action';
import { computeBoardRange } from './board-range';
import styles from './leaderboard.module.scss';
import { YOU_ROW_ID } from './leaderboard-row';
import { LeaderboardTable } from './leaderboard-table';
import { mergeEntries } from './merge-entries';
import type { TimingKey } from './timing-columns';

// "Find me" fallback: the board API has no rank/user lookup that accounts
// for the current filter state (subcategory, varFilters, verified,
// combined — see getUserRankingsByName in src/lib/leaderboards-v1.ts,
// which only returns a fixed default-board rank), so we page forward
// looking for the session user's row instead of jumping straight there.
// Capped so a genuinely-absent user doesn't trigger unbounded fetching.
const MAX_FIND_ME_PAGES = 10;

interface Props {
    initial: LeaderboardResponse;
    query: Omit<LeaderboardQuery, 'page'>;
    sessionUsername: string | null;
    canManage: boolean;
    gameSlug: string;
    variableKeys: string[];
    primaryTiming: TimingKey;
    filtersActive: boolean;
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
    primaryTiming,
    filtersActive,
}: Props) {
    const [pages, setPages] = useState<LeaderboardEntry[][]>([initial.entries]);
    const [minPage, setMinPage] = useState(initial.page);
    const [maxPage, setMaxPage] = useState(initial.page);
    const [isPending, startTransition] = useTransition();
    // Which direction's fetch last failed, if any — drives the inline
    // error under that direction's bar and lets Retry redo the same load.
    const [error, setError] = useState<'before' | 'after' | null>(null);
    // 'searching' drives the Find me button's in-flight label; 'not-found'
    // replaces it with a quiet note once the forward search exhausts its
    // cap (or the board is fully loaded) without a match — sticky for the
    // rest of this mount so a miss doesn't invite endless re-clicking.
    const [findMeStatus, setFindMeStatus] = useState<
        'idle' | 'searching' | 'not-found'
    >('idle');
    // Bumped after a successful find to (re-)trigger the scroll+focus
    // effect even if the row was already on-screen from a prior search.
    const [highlightToken, setHighlightToken] = useState(0);
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

    // Keeps the URL's ?page= in sync with the highest loaded page so
    // refresh/share lands on a valid deep link.
    const setUrlPage = (highest: number) => {
        const sp = new URLSearchParams(window.location.search);
        if (highest === 1) sp.delete('page');
        else sp.set('page', String(highest));
        const qs = sp.toString();
        window.history.replaceState(
            null,
            '',
            qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
        );
    };

    const load = (page: number, position: 'before' | 'after') => {
        startTransition(async () => {
            const res = await fetchLeaderboardPage({ ...query, page });
            if (!res) {
                setError(position);
                return;
            }
            setError(null);
            setPages((prev) =>
                position === 'after'
                    ? [...prev, res.entries]
                    : [res.entries, ...prev],
            );
            if (position === 'after') setMaxPage(page);
            else setMinPage(page);
            setUrlPage(position === 'after' ? page : maxPage);
        });
    };

    const merged = mergeEntries(pages);
    const isCurrentUserVisible =
        sessionUsername !== null &&
        merged.some((e) => e.runnerName === sessionUsername);
    const showFindMe =
        sessionUsername !== null &&
        !isCurrentUserVisible &&
        findMeStatus !== 'not-found' &&
        initial.totalItems > 0;

    const findMe = () => {
        if (!sessionUsername || isCurrentUserVisible) return;
        setFindMeStatus('searching');
        startTransition(async () => {
            const fetchedPages: LeaderboardEntry[][] = [];
            let cursor = maxPage;
            let found = false;
            let failed = false;
            while (
                !found &&
                !failed &&
                fetchedPages.length < MAX_FIND_ME_PAGES &&
                cursor < initial.totalPages
            ) {
                const nextPage = cursor + 1;
                const res = await fetchLeaderboardPage({
                    ...query,
                    page: nextPage,
                });
                if (!res) {
                    failed = true;
                    break;
                }
                fetchedPages.push(res.entries);
                cursor = nextPage;
                found = res.entries.some(
                    (e) => e.runnerName === sessionUsername,
                );
            }
            if (fetchedPages.length > 0) {
                setPages((prev) => [...prev, ...fetchedPages]);
                setMaxPage(cursor);
                setUrlPage(cursor);
            }
            if (failed) {
                setError('after');
                setFindMeStatus('idle');
                return;
            }
            setError(null);
            setFindMeStatus(found ? 'idle' : 'not-found');
            if (found) setHighlightToken((t) => t + 1);
        });
    };

    // Scroll to and focus the current user's row after a successful find.
    // Focus (not just a background flash) is the accessible marker — it
    // works for anyone regardless of color perception.
    useEffect(() => {
        if (highlightToken === 0) return;
        const row = document.getElementById(YOU_ROW_ID);
        if (!row) return;
        const reduceMotion =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        row.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            block: 'center',
        });
        row.focus({ preventScroll: true });
        row.classList.add(styles.youRowFlash);
        const timer = setTimeout(() => {
            row.classList.remove(styles.youRowFlash);
        }, 1600);
        return () => clearTimeout(timer);
    }, [highlightToken]);

    const range = computeBoardRange(
        minPage,
        initial.pageSize,
        merged.length,
        initial.totalItems,
    );

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
                        {isPending ? 'Loading…' : 'Show previous'}
                    </button>
                    {error === 'before' && (
                        <div className={styles.pagerError}>
                            <span>Couldn't load more runs.</span>
                            <button
                                type="button"
                                className={styles.pagerErrorRetry}
                                onClick={() => load(minPage - 1, 'before')}
                            >
                                Retry
                            </button>
                        </div>
                    )}
                </div>
            )}
            {(range || showFindMe || findMeStatus === 'not-found') && (
                <div className={styles.boardMetaBar}>
                    {range && (
                        <span className={styles.rangeIndicator}>
                            Showing{' '}
                            <span>
                                {range.first.toLocaleString()}–
                                {range.last.toLocaleString()}
                            </span>{' '}
                            of <span>{range.total.toLocaleString()}</span>
                        </span>
                    )}
                    {showFindMe && (
                        <button
                            type="button"
                            className={styles.findMeBtn}
                            disabled={isPending}
                            onClick={findMe}
                        >
                            {findMeStatus === 'searching'
                                ? 'Finding…'
                                : 'Find me'}
                        </button>
                    )}
                    {findMeStatus === 'not-found' && (
                        <span className={styles.notFoundNote}>
                            Not on this board yet
                        </span>
                    )}
                </div>
            )}
            <LeaderboardTable
                leaderboard={{ ...initial, entries: merged }}
                sessionUsername={sessionUsername}
                canManage={canManage}
                gameSlug={gameSlug}
                variableKeys={variableKeys}
                primaryTiming={primaryTiming}
                filtersActive={filtersActive}
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
                    {error === 'after' && (
                        <div className={styles.pagerError}>
                            <span>Couldn't load more runs.</span>
                            <button
                                type="button"
                                className={styles.pagerErrorRetry}
                                onClick={() => load(maxPage + 1, 'after')}
                            >
                                Retry
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
