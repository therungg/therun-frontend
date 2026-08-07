'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { LeaderboardQuery } from '~src/lib/leaderboards-v1';
import type {
    LeaderboardEntry,
    LeaderboardResponse,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import { fetchLeaderboardPage } from '../actions/fetch-page.action';
import { FiltersPopover } from '../filters/filters-popover';
import { VerifiedToggle } from '../filters/verified-toggle';
import { isSameRunner } from '../shared/is-same-runner';
import { computeBoardRange } from './board-range';
import { BoardBulkBar } from './bulk-bar';
import { ExportButton } from './export-button';
import { planFindMeSearch } from './find-me-plan';
import styles from './leaderboard.module.scss';
import { YOU_ROW_ID } from './leaderboard-row';
import { LeaderboardTable } from './leaderboard-table';
import { paginationItems } from './pagination-items';
import type { TimingKey } from './timing-columns';

/** Same runner-grouping key leaderboard-row.tsx uses for "select all runs by …". */
function runnerKeyOf(entry: LeaderboardEntry): string {
    return entry.userId != null ? `u:${entry.userId}` : `g:${entry.runnerName}`;
}

// "Find me" fallback: the board API has no rank/user lookup that accounts
// for the current filter state (subcategory, varFilters, verified,
// combined — see getUserRankingsByName in src/lib/leaderboards-v1.ts,
// which only returns a fixed default-board rank), so we page forward from
// the current page, then (if still not found and budget remains) backward
// toward page 1, looking for the session user's row instead of jumping
// straight there. Capped so a genuinely-absent user doesn't trigger
// unbounded fetching — see find-me-plan.ts.
const MAX_FIND_ME_PAGES = 10;

interface Props {
    initial: LeaderboardResponse;
    query: Omit<LeaderboardQuery, 'page'>;
    sessionUsername: string | null;
    canManage: boolean;
    canSiteBan?: boolean;
    gameSlug: string;
    variableKeys: string[];
    primaryTiming: TimingKey;
    /** What the board calls its game-time clock. Display only. */
    gameTimeLabel?: 'igt' | 'lrt';
    filtersActive: boolean;
    /** category.showMilliseconds ?? true — precision the board is configured for. */
    showMilliseconds: boolean;
    /** Active category slug — carried into entry-point submit/claim links. */
    categorySlug: string;
    /** Active subcategory key — carried into entry-point submit/claim links. */
    subcategoryKey: string;
    /** Subcategory-role variable names, for building a row's own subcategory key from `entry.variables`. */
    subcategoryDefKeys: string[];
    /** All variable defs — the meta bar's Filters popover needs the filter-role ones. */
    variableDefs: VariableRow[];
    /** Active filter-variable selections, keyed by `nameNormalized`. */
    selectedVarFilters: Record<string, string>;
    /** category.rtaFallback — GT board ranks RTA-only runs by real time. */
    rtaFallback?: boolean;
}

// Module-level flag (not state): the parent keys this component by the
// filter signature, so every category/filter change remounts it. The
// very first-ever mount of a pager on the page staggers its rows in;
// every later remount (a category/filter swap) gets the quick 120ms
// fade instead. Because this lives outside the component, it survives
// across those remounts while still being fixed for the lifetime of
// any single instance (page navigation never touches it).
let hasAnimatedFirstBoard = false;

/**
 * Client pagination around the SSR'd page: real numbered pages, one page
 * of rows in the DOM at a time. The URL's ?page= tracks the current page
 * via replaceState so refresh/share keeps a valid deep link. Parent must
 * key this component by the filter signature so state resets on any
 * change.
 */
export function LeaderboardPager({
    initial,
    query,
    sessionUsername,
    canManage,
    canSiteBan = false,
    gameSlug,
    variableKeys,
    primaryTiming,
    gameTimeLabel = 'igt',
    filtersActive,
    showMilliseconds,
    categorySlug,
    subcategoryKey,
    subcategoryDefKeys,
    variableDefs,
    selectedVarFilters,
    rtaFallback = false,
}: Props) {
    // The whole viewed page, response-shaped: entries plus the page/total
    // bookkeeping every control below derives from. Navigation swaps it
    // wholesale, so totals stay honest if the board changes size under us.
    const [board, setBoard] = useState<LeaderboardResponse>(initial);
    // Board's top edge — page navigation scrolls this back into view so a
    // "next page" click never leaves the viewport stranded mid-table, and a
    // deep link straight to ?page=N gets anchored on mount.
    const boardTopRef = useRef<HTMLDivElement>(null);
    const [isPending, startTransition] = useTransition();
    // Page whose fetch last failed, if any — drives the inline error under
    // the pagination bar and lets Retry redo the same navigation.
    const [navError, setNavError] = useState<number | null>(null);
    // 'searching' drives the Find me button's in-flight label. A miss
    // resolves to one of two sticky notes (so it doesn't invite endless
    // re-clicking) depending on how much of the board was actually
    // searched: 'not-found' when the search covered the *entire* board
    // (honest "not on this board"), 'partial-miss' when the budget ran
    // out before every page was checked (honest "couldn't find in the
    // pages searched" — the user's row may still be further out).
    const [findMeStatus, setFindMeStatus] = useState<
        'idle' | 'searching' | 'not-found' | 'partial-miss'
    >('idle');
    // Bumped after a successful find to (re-)trigger the scroll+focus
    // effect even if the row was already on-screen from a prior search.
    const [highlightToken, setHighlightToken] = useState(0);
    // Bulk selection (mods only — the checkbox column itself only renders
    // when `canManage`, so a non-mod never populates this). Page-scoped:
    // navigating clears it, since acting on rows you can no longer see is
    // exactly the mistake a selection UI exists to prevent.
    const [selectedRunIds, setSelectedRunIds] = useState<Set<number>>(
        new Set(),
    );
    // Shift-click range-select anchor — the last row clicked without
    // shift, or the most recent shift-click's endpoint.
    const lastClickedRef = useRef<number | null>(null);

    const [entryClass] = useState(() => {
        if (typeof window === 'undefined') return styles.boardStagger;
        const cls = hasAnimatedFirstBoard
            ? styles.boardFade
            : styles.boardStagger;
        hasAnimatedFirstBoard = true;
        return cls;
    });

    // Keeps the URL's ?page= in sync with the viewed page so refresh/share
    // lands on the same page. replaceState, not pushState: this component
    // has no popstate handling, so history entries the back button can't
    // actually restore would be a lie.
    const setUrlPage = (page: number) => {
        const sp = new URLSearchParams(window.location.search);
        if (page === 1) sp.delete('page');
        else sp.set('page', String(page));
        const qs = sp.toString();
        window.history.replaceState(
            null,
            '',
            qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
        );
    };

    const showPage = (res: LeaderboardResponse, page: number) => {
        setNavError(null);
        setBoard(res);
        setSelectedRunIds(new Set());
        lastClickedRef.current = null;
        setUrlPage(page);
    };

    const goTo = (page: number) => {
        if (page < 1 || page > board.totalPages || page === board.page) return;
        startTransition(async () => {
            const res = await fetchLeaderboardPage({ ...query, page });
            if (!res) {
                setNavError(page);
                return;
            }
            showPage(res, page);
            boardTopRef.current?.scrollIntoView({ block: 'start' });
        });
    };

    // Read-your-writes for the bulk bar's own mutations: the backend's cache
    // tags now invalidate immediately (updateTag — see revalidate-boards.ts),
    // but this component's `board` client state was seeded once from
    // `initial` and won't pick up a re-render's fresh server props on its
    // own. Re-fetching the viewed page and swapping it in is the
    // client-side half of "the mod sees the result immediately".
    const [isRefetching, startRefetch] = useTransition();
    const refetchCurrentPage = async () => {
        const res = await fetchLeaderboardPage({ ...query, page: board.page });
        if (res) setBoard(res);
    };

    const entries = board.entries;

    // ---- Bulk selection (mods only) --------------------------------------
    const selectableRunIds = entries
        .map((e) => e.runId)
        .filter((id): id is number => id != null);

    const toggleSelect = (runId: number, shiftKey: boolean) => {
        setSelectedRunIds((prev) => {
            const next = new Set(prev);
            if (shiftKey && lastClickedRef.current != null) {
                const anchor = selectableRunIds.indexOf(lastClickedRef.current);
                const target = selectableRunIds.indexOf(runId);
                if (anchor !== -1 && target !== -1) {
                    const [start, end] =
                        anchor < target ? [anchor, target] : [target, anchor];
                    const shouldSelect = !prev.has(runId);
                    for (const id of selectableRunIds.slice(start, end + 1)) {
                        if (shouldSelect) next.add(id);
                        else next.delete(id);
                    }
                    lastClickedRef.current = runId;
                    return next;
                }
            }
            if (next.has(runId)) next.delete(runId);
            else next.add(runId);
            lastClickedRef.current = runId;
            return next;
        });
    };

    const toggleAllVisible = () => {
        setSelectedRunIds((prev) => {
            const allSelected =
                selectableRunIds.length > 0 &&
                selectableRunIds.every((id) => prev.has(id));
            if (allSelected) return new Set();
            return new Set(selectableRunIds);
        });
    };

    const selectRunner = (runnerKey: string) => {
        setSelectedRunIds((prev) => {
            const next = new Set(prev);
            for (const e of entries) {
                if (e.runId != null && runnerKeyOf(e) === runnerKey) {
                    next.add(e.runId);
                }
            }
            return next;
        });
    };

    const clearSelection = () => setSelectedRunIds(new Set());

    const handleBulkMutated = () => {
        clearSelection();
        startRefetch(refetchCurrentPage);
    };

    // No verified/pending counts exist on LeaderboardResponse, so this is
    // derived from the viewed page: honest ("includes"), never a count.
    const hasPendingLoaded =
        !query.verified &&
        entries.some(
            (e) => e.source !== 'manual' && e.verificationStatus === 'pending',
        );
    const isCurrentUserVisible =
        sessionUsername !== null &&
        entries.some((e) => isSameRunner(e.runnerName, sessionUsername));
    const showFindMe =
        sessionUsername !== null &&
        !isCurrentUserVisible &&
        findMeStatus !== 'not-found' &&
        findMeStatus !== 'partial-miss' &&
        board.totalItems > 0;

    const findMe = () => {
        if (
            !sessionUsername ||
            isCurrentUserVisible ||
            findMeStatus === 'searching'
        )
            return;
        setFindMeStatus('searching');
        startTransition(async () => {
            const plan = planFindMeSearch(
                board.page,
                board.page,
                board.totalPages,
                MAX_FIND_ME_PAGES,
            );
            for (const page of plan) {
                const res = await fetchLeaderboardPage({ ...query, page });
                if (!res) {
                    setNavError(page);
                    setFindMeStatus('idle');
                    return;
                }
                if (
                    res.entries.some((e) =>
                        isSameRunner(e.runnerName, sessionUsername),
                    )
                ) {
                    // Found: real pagination means we JUMP to that page
                    // rather than growing a window toward it.
                    showPage(res, page);
                    setFindMeStatus('idle');
                    setHighlightToken((t) => t + 1);
                    return;
                }
            }
            setNavError(null);
            // The plan covers every page but the current one when it fits
            // the budget — only then is a miss a verdict about the board.
            const searchedWholeBoard = plan.length >= board.totalPages - 1;
            setFindMeStatus(searchedWholeBoard ? 'not-found' : 'partial-miss');
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

    // Deep-link scroll anchor (G17): a fresh page load at ?page=N > 1 only
    // renders that page — jump the board's top edge into view on mount so
    // scroll restoration never strands the viewport above content that
    // isn't there. Mount-only; goTo does its own anchoring (empty deps).
    useEffect(() => {
        if (initial.page > 1) {
            boardTopRef.current?.scrollIntoView({ block: 'start' });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const range = computeBoardRange(
        board.page,
        board.pageSize,
        entries.length,
        board.totalItems,
    );

    return (
        <div className={entryClass} ref={boardTopRef}>
            {(board.totalItems > 0 || filtersActive) && (
                <div className={styles.boardMetaBar}>
                    <span className={styles.metaLead}>
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
                        {hasPendingLoaded && (
                            <span className={styles.pendingNote}>
                                Includes runs awaiting verification
                            </span>
                        )}
                        {findMeStatus === 'not-found' && (
                            <span className={styles.notFoundNote}>
                                {query.verified
                                    ? 'Not on this board — pending runs are hidden by the Verified filter.'
                                    : 'Not on this board yet'}
                            </span>
                        )}
                        {findMeStatus === 'partial-miss' && (
                            <span className={styles.notFoundNote}>
                                Couldn't find your run in the pages searched
                            </span>
                        )}
                    </span>
                    <span className={styles.metaControls}>
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
                        <VerifiedToggle verified={query.verified ?? false} />
                        <ExportButton
                            query={query}
                            gameSlug={gameSlug}
                            categorySlug={categorySlug}
                            subcategoryKey={subcategoryKey}
                            showMilliseconds={showMilliseconds}
                        />
                        <FiltersPopover
                            defs={variableDefs}
                            selectedVarFilters={selectedVarFilters}
                        />
                    </span>
                </div>
            )}
            <LeaderboardTable
                leaderboard={board}
                sessionUsername={sessionUsername}
                canManage={canManage}
                canSiteBan={canSiteBan}
                gameSlug={gameSlug}
                variableKeys={variableKeys}
                primaryTiming={primaryTiming}
                gameTimeLabel={gameTimeLabel}
                filtersActive={filtersActive}
                showMilliseconds={showMilliseconds}
                categorySlug={categorySlug}
                subcategoryKey={subcategoryKey}
                subcategoryDefKeys={subcategoryDefKeys}
                rtaFallback={rtaFallback}
                selectedRunIds={selectedRunIds}
                onToggleSelect={toggleSelect}
                onSelectRunner={selectRunner}
                onToggleAllVisible={toggleAllVisible}
            />
            {canManage && selectedRunIds.size > 0 && (
                <BoardBulkBar
                    gameSlug={gameSlug}
                    categorySlug={categorySlug}
                    canSiteBan={canSiteBan}
                    subcategoryDefKeys={subcategoryDefKeys}
                    entries={entries}
                    selectedRunIds={selectedRunIds}
                    onClear={clearSelection}
                    onMutated={handleBulkMutated}
                    busy={isRefetching}
                />
            )}
            {board.totalPages > 1 && (
                <nav
                    className={styles.paginationBar}
                    aria-label="Leaderboard pages"
                >
                    <button
                        type="button"
                        className={styles.pageBtn}
                        disabled={isPending || board.page === 1}
                        onClick={() => goTo(board.page - 1)}
                    >
                        ‹ Previous
                    </button>
                    {paginationItems(board.page, board.totalPages).map(
                        (item, i) =>
                            item === 'gap' ? (
                                <span
                                    // eslint-disable-next-line react/no-array-index-key
                                    key={`gap-${i}`}
                                    className={styles.pageGap}
                                    aria-hidden
                                >
                                    …
                                </span>
                            ) : (
                                <button
                                    key={item}
                                    type="button"
                                    className={
                                        item === board.page
                                            ? `${styles.pageBtn} ${styles.pageBtnCurrent}`
                                            : styles.pageBtn
                                    }
                                    aria-current={
                                        item === board.page ? 'page' : undefined
                                    }
                                    disabled={isPending}
                                    onClick={() => goTo(item)}
                                >
                                    {item.toLocaleString()}
                                </button>
                            ),
                    )}
                    <button
                        type="button"
                        className={styles.pageBtn}
                        disabled={isPending || board.page === board.totalPages}
                        onClick={() => goTo(board.page + 1)}
                    >
                        Next ›
                    </button>
                </nav>
            )}
            {navError != null && (
                <div className={`${styles.pagerError} ${styles.pagerErrorBar}`}>
                    <span>Couldn't load page {navError}.</span>
                    <button
                        type="button"
                        className={styles.pagerErrorRetry}
                        onClick={() => goTo(navError)}
                    >
                        Retry
                    </button>
                </div>
            )}
        </div>
    );
}
