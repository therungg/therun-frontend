'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { selfAnonymizeStateAction } from '~src/actions/run-user-actions.action';
import type { LeaderboardQuery } from '~src/lib/leaderboards-v1';
import { normalizeVariableName } from '~src/lib/variables/keys';
import type {
    BoardFacets,
    LeaderboardEntry,
    LeaderboardResponse,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import type { SelfAnonymizeState } from '../../../../../types/moderation.types';
import {
    fetchLeaderboardPage,
    findRunnerPage,
} from '../actions/fetch-page.action';
import type { BuiltinFilterState } from '../filters/builtin-params';
import { FiltersPopover } from '../filters/filters-popover';
import { isSameRunner } from '../shared/is-same-runner';
import { OwnerHideIdentityDialog } from '../shared/owner-hide-identity-dialog';
import { computeBoardRange } from './board-range';
import { BoardBulkBar } from './bulk-bar';
import { ExportButton } from './export-button';
import styles from './leaderboard.module.scss';
import { YOU_ROW_ID } from './leaderboard-row';
import { LeaderboardTable } from './leaderboard-table';
import { ManualInspector } from './manual-inspector';
import { paginationItems } from './pagination-items';
import { RunInspector } from './run-inspector';
import { type BoardSelectionKey, entrySelectionKey } from './selection';
import type { TimingKey } from './timing-columns';

interface Props {
    initial: LeaderboardResponse;
    query: Omit<LeaderboardQuery, 'page'>;
    sessionUsername: string | null;
    canManage: boolean;
    canSiteBan?: boolean;
    gameSlug: string;
    /** Numeric game id — the owner-mode verbs are game-scoped `/v1/me/*` calls. */
    gameId: number;
    /** Human game name, for the owner hide-identity copy. */
    gameDisplay: string;
    /**
     * The signed-in visitor's own anonymize state in this game, read
     * server-side (`GET /v1/me/anonymize`). Null when signed out.
     *
     * This is the ONLY carrier of the un-hide path. A hidden runner's row
     * comes back from the backend redacted — placeholder name, `userId`
     * nulled — so `isSameRunner` can't recognise it and the row's own
     * "Manage" button is gone. Without a board-level affordance, hiding your
     * identity would be a one-way door from this page.
     */
    selfHidden?: SelfAnonymizeState | null;
    variableKeys: string[];
    primaryTiming: TimingKey;
    /** What the board calls its game-time clock. Display only. */
    gameTimeLabel?: 'igt' | 'lrt';
    filtersActive: boolean;
    /** category.showMilliseconds ?? true — precision the board is configured for. */
    showMilliseconds: boolean;
    /** Active category slug — carried into entry-point submit/claim links. */
    categorySlug: string;
    /** The category's display name — what a human calls this board. The mod
     * drawer shows it, and matches the runner's other runs against it (the
     * eligible-runs read keys categories by display, not slug). */
    categoryDisplay: string;
    /** The category's id — the row's Remove needs it to offer "every run this
     *  runner has on this board", which is a rule written against a category. */
    categoryId?: number;
    /** category.requireVideo — a run with no VOD on such a board is a
     * blocking fact the mod drawer states outright. */
    requireVideo?: boolean;
    /** Active subcategory key — carried into entry-point submit/claim links. */
    subcategoryKey: string;
    /** Subcategory-role variable names, for building a row's own subcategory key from `entry.variables`. */
    subcategoryDefKeys: string[];
    /** All variable defs — the meta bar's Filters popover needs the filter-role ones. */
    variableDefs: VariableRow[];
    /** Active filter-variable selections, keyed by `nameNormalized`. */
    selectedVarFilters: Record<string, string>;
    /** Applied built-in filters — the Filters sheet seeds its draft from these. */
    builtins: BuiltinFilterState;
    /** Countries present on this board + its earliest run date, for the sheet's controls. */
    facets: BoardFacets;
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
    gameId,
    gameDisplay,
    selfHidden = null,
    variableKeys,
    primaryTiming,
    gameTimeLabel = 'igt',
    filtersActive,
    showMilliseconds,
    categorySlug,
    categoryDisplay,
    categoryId,
    requireVideo = false,
    subcategoryKey,
    subcategoryDefKeys,
    variableDefs,
    selectedVarFilters,
    builtins,
    facets,
    rtaFallback = false,
}: Props) {
    // Variables (either role) the moderator opted into showing as their own
    // board column. Keyed by nameNormalized, which is how a runner's value is
    // stored on each entry (entry.variables[key]). A subcategory's value is
    // constant on a single split board and only varies on the combined view.
    //
    // `display` maps every accepted spelling (lowercased) to its bucket's
    // canonical label: entries store normalized values ("solo"), the def's
    // buckets carry the display form ("Solo").
    //
    // `altKey` is the display name normalized — the resolver accepts a
    // LiveSplit variable named after either the key or the display name, so
    // the row's "did the runner actually set this?" check must look for both
    // in the entry's rawVariables.
    const valueColumns = variableDefs
        .filter((d) => d.showValueOnBoard === true)
        .map((d) => {
            const display: Record<string, string> = {};
            for (const bucket of d.values) {
                for (const spelling of bucket) {
                    display[spelling.trim().toLowerCase()] = bucket[0];
                }
            }
            return {
                key: d.nameNormalized,
                altKey: normalizeVariableName(d.name),
                label: d.name,
                display,
            };
        });

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
    // 'searching' drives the Find me button's in-flight label. A miss is
    // authoritative — the backend locates the runner against the whole
    // board for the current view — so it resolves to one sticky note
    // (rather than resetting to idle, which would invite endless
    // re-clicking of a button that will keep saying no).
    const [findMeStatus, setFindMeStatus] = useState<
        'idle' | 'searching' | 'not-found'
    >('idle');
    // Bumped after a successful find to (re-)trigger the scroll+focus
    // effect even if the row was already on-screen from a prior search.
    const [highlightToken, setHighlightToken] = useState(0);
    // Bulk selection (mods only — the checkbox column itself only renders
    // when `canManage`, so a non-mod never populates this). Keys are
    // `r:<runId>` / `m:<manualTimeId>` (see selection.ts) so manual set
    // times are selectable alongside runs. Page-scoped: navigating clears
    // it, since acting on rows you can no longer see is exactly the
    // mistake a selection UI exists to prevent.
    const [selectedKeys, setSelectedKeys] = useState<Set<BoardSelectionKey>>(
        new Set(),
    );
    // Shift-click range-select anchor — the last row clicked without
    // shift, or the most recent shift-click's endpoint.
    const lastClickedRef = useRef<BoardSelectionKey | null>(null);
    // Run / set-time inspector (mods only) — tracked by id, not entry
    // reference, so a page refetch after a verdict re-derives the fresh row.
    const [inspectRunId, setInspectRunId] = useState<number | null>(null);
    const [inspectManualId, setInspectManualId] = useState<number | null>(null);
    // Verb the inspector opens onto (the row's Remove/`x` path). Cleared on
    // close and on j/k stepping — a stale 'remove' must not re-expand the
    // form on every step.
    const [inspectVerb, setInspectVerb] = useState<'remove' | null>(null);
    // Board-level "you are hidden here" state, seeded server-side and
    // re-read after the dialog acts. Lives here rather than on the row
    // because a hidden runner has no recognisable row — see the prop doc.
    const [hiddenState, setHiddenState] = useState<SelfAnonymizeState | null>(
        selfHidden,
    );
    const [hideIdentityOpen, setHideIdentityOpen] = useState(false);
    // The prop is the server's answer; local state exists only so an action
    // taken here can update it without a round trip through the route. When
    // the server sends a fresh one (router.refresh, a soft navigation that
    // keeps this component mounted), the server wins — a `useState` initial
    // value would otherwise pin the first answer for the whole session.
    useEffect(() => {
        setHiddenState(selfHidden);
    }, [selfHidden]);

    /**
     * Re-read "am I hidden in this game" after anything that could have
     * changed it.
     *
     * Load-bearing in one specific way: hiding your identity from the run
     * drawer redacts your row, which removes the drawer's own entry point —
     * so if this state didn't refresh, the meta-bar note (the ONLY remaining
     * un-hide control) would not appear until the next full page load. That
     * is exactly the one-way door the note exists to prevent.
     */
    const refreshSelfHidden = () => {
        if (sessionUsername == null) return;
        selfAnonymizeStateAction(gameId)
            .then((res) => {
                if ('ok' in res) setHiddenState(res.state);
            })
            .catch(() => {
                // Best-effort refresh; a failure here just leaves the note
                // showing whatever it showed before.
            });
    };

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
        setSelectedKeys(new Set());
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

    // ---- Run / set-time inspector (mods only) ----------------------------
    // j/k step through the page's rows of the same kind (real runs for the
    // run inspector, set times for the set-time inspector).
    const runEntries = entries.filter((e) => e.runId != null);
    const inspectIndex =
        inspectRunId == null
            ? -1
            : runEntries.findIndex((e) => e.runId === inspectRunId);
    const inspectEntry = inspectIndex >= 0 ? runEntries[inspectIndex] : null;

    const manualEntries = entries.filter((e) => e.manualTimeId != null);
    const inspectManualIndex =
        inspectManualId == null
            ? -1
            : manualEntries.findIndex(
                  (e) => e.manualTimeId === inspectManualId,
              );
    const inspectManualEntry =
        inspectManualIndex >= 0 ? manualEntries[inspectManualIndex] : null;

    // A refetch or page navigation can drop the inspected row off the page
    // (quiet removal, verified filter) — close rather than show stale data.
    useEffect(() => {
        if (inspectRunId != null && inspectEntry == null) {
            setInspectRunId(null);
        }
    }, [inspectRunId, inspectEntry]);
    useEffect(() => {
        if (inspectManualId != null && inspectManualEntry == null) {
            setInspectManualId(null);
        }
    }, [inspectManualId, inspectManualEntry]);

    const boardRefresh = () => startRefetch(refetchCurrentPage);

    /**
     * Is this row the signed-in visitor's own? Drives owner mode.
     *
     * The name match is necessary but nowhere near sufficient. `isSameRunner`
     * is a case-insensitive string compare, and three kinds of row can carry
     * a name that isn't the account it looks like:
     *  - a guest submission, whose runner name is self-reported free text;
     *  - a row with no `userId` at all (nothing to own it);
     *  - an anonymized row, whose placeholder ("Anonymous runner #3") is a
     *    name a real runner may legitimately have — the type explicitly
     *    warns about this.
     * Every owner verb is a `/v1/me/*` route resolved from the session, so a
     * mismatch fails server-side rather than escalating, but the drawer must
     * not open on someone else's run in the first place.
     */
    const isOwnEntry = (entry: LeaderboardEntry) =>
        isSameRunner(sessionUsername, entry.runnerName) &&
        entry.userId != null &&
        !entry.isGuest &&
        entry.anonymized !== true;
    // Which surface the drawer opens with. A moderator always gets the mod
    // one — including on their own run, since it is a superset of the
    // owner's and downgrading it would take verbs away from someone who has
    // them.
    const inspectorMode = canManage ? 'mod' : 'owner';

    // Route the row's Moderate/Remove to the matching inspector, and never
    // open both at once. `verb` pre-expands that verb's form in the drawer.
    const openModerate = (entry: LeaderboardEntry, verb?: 'remove') => {
        // Non-mods reach this only through their own row's Manage button.
        // Re-checked here rather than trusted from the row: this callback is
        // handed to every row, and the drawer it opens performs mutations.
        // A non-mod's own row is allowed through as long as it carries SOME
        // id to inspect (a real run OR a set time) — both RunInspector and
        // ManualInspector have an owner mode; there is simply nothing to
        // open for a row with neither.
        if (
            !canManage &&
            (!isOwnEntry(entry) ||
                (entry.runId == null && entry.manualTimeId == null))
        )
            return;
        setInspectVerb(verb ?? null);
        if (entry.runId != null) {
            setInspectManualId(null);
            setInspectRunId(entry.runId);
        } else if (entry.manualTimeId != null) {
            setInspectRunId(null);
            setInspectManualId(entry.manualTimeId);
        }
    };

    // ---- Bulk selection (mods only) --------------------------------------
    const selectableKeys = entries
        .map(entrySelectionKey)
        .filter((key): key is BoardSelectionKey => key != null);

    const toggleSelect = (key: BoardSelectionKey, shiftKey: boolean) => {
        // Anchor bookkeeping stays outside the updater: StrictMode
        // double-invokes updaters, and a ref mutation inside meant the
        // second run saw the anchor already moved to the clicked row,
        // collapsing every shift-range to a single row.
        const anchorKey = lastClickedRef.current;
        lastClickedRef.current = key;
        setSelectedKeys((prev) => {
            const next = new Set(prev);
            if (shiftKey && anchorKey != null) {
                const anchor = selectableKeys.indexOf(anchorKey);
                const target = selectableKeys.indexOf(key);
                if (anchor !== -1 && target !== -1) {
                    const [start, end] =
                        anchor < target ? [anchor, target] : [target, anchor];
                    const shouldSelect = !prev.has(key);
                    for (const k of selectableKeys.slice(start, end + 1)) {
                        if (shouldSelect) next.add(k);
                        else next.delete(k);
                    }
                    return next;
                }
            }
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleAllVisible = () => {
        setSelectedKeys((prev) => {
            const allSelected =
                selectableKeys.length > 0 &&
                selectableKeys.every((key) => prev.has(key));
            if (allSelected) return new Set();
            return new Set(selectableKeys);
        });
    };

    const clearSelection = () => setSelectedKeys(new Set());

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
            // One round trip: the backend locates the runner on the current
            // view (same filters/verified/timing) and returns their page.
            const res = await findRunnerPage(query, sessionUsername);
            if (!res) {
                setNavError(board.page);
                setFindMeStatus('idle');
                return;
            }
            setNavError(null);
            if (!res.findRunnerFound) {
                // Authoritative: the backend scanned the whole board.
                setFindMeStatus('not-found');
                return;
            }
            showPage(res, res.page);
            setFindMeStatus('idle');
            setHighlightToken((t) => t + 1);
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
            {/* The un-hide path. Stated as a fact about this board ("you're
                shown as …") rather than a verb, because the runner may be
                looking straight at the placeholder row and not know it is
                theirs. The button only appears for a rule the runner applied
                themselves — a moderator's rule is not theirs to lift, and the
                dialog says so.

                Deliberately a SIBLING of the meta bar, not a control inside
                it: the meta bar is suppressed on an empty, unfiltered board,
                and "no runs on this subcategory yet" is exactly a board a
                hidden runner can land on. Inheriting that condition would
                hide the only un-hide control on the page. */}
            {hiddenState?.hidden && (
                <p className={styles.selfHiddenNote}>
                    You&apos;re shown on this board as{' '}
                    {hiddenState.displayName ?? 'an anonymous run'}
                    {hiddenState.selfApplied && (
                        <button
                            type="button"
                            className={styles.selfHiddenBtn}
                            onClick={() => setHideIdentityOpen(true)}
                        >
                            Unhide…
                        </button>
                    )}
                </p>
            )}
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
                            builtins={builtins}
                            facets={facets}
                        />
                    </span>
                </div>
            )}
            <LeaderboardTable
                leaderboard={board}
                sessionUsername={sessionUsername}
                canManage={canManage}
                gameSlug={gameSlug}
                variableKeys={variableKeys}
                valueColumns={valueColumns}
                primaryTiming={primaryTiming}
                gameTimeLabel={gameTimeLabel}
                filtersActive={filtersActive}
                showMilliseconds={showMilliseconds}
                categorySlug={categorySlug}
                subcategoryKey={subcategoryKey}
                subcategoryDefKeys={subcategoryDefKeys}
                rtaFallback={rtaFallback}
                selectedKeys={selectedKeys}
                onToggleSelect={toggleSelect}
                onToggleAllVisible={toggleAllVisible}
                // Handed to signed-in visitors too: every row gets the
                // callback, but only the visitor's own row renders a control
                // that calls it (and `openModerate` re-checks anyway).
                onModerate={
                    canManage || sessionUsername != null
                        ? openModerate
                        : undefined
                }
                onBoardRefresh={canManage ? boardRefresh : undefined}
            />
            {/* Un-hide lives out here, not on a row: a hidden runner's row is
                a placeholder nobody can recognise as theirs. */}
            {/* Mounted on open, not on `hidden`: a successful lift flips
                `hiddenState.hidden` to false, and a `hidden`-keyed guard
                would tear the dialog off screen mid-read — including the
                case where it has to say the runner is still hidden by a
                moderator's overlapping rule. */}
            {hideIdentityOpen && (
                <OwnerHideIdentityDialog
                    open
                    onClose={() => setHideIdentityOpen(false)}
                    onDone={() => {
                        // Re-read rather than assume: a lift can leave an
                        // overlapping moderator rule standing, in which case
                        // the runner is still hidden and the note must stay.
                        refreshSelfHidden();
                        boardRefresh();
                    }}
                    gameId={gameId}
                    gameSlug={gameSlug}
                    gameDisplay={gameDisplay}
                />
            )}
            {(canManage ||
                (inspectEntry != null && isOwnEntry(inspectEntry))) &&
                inspectEntry != null && (
                    <RunInspector
                        entry={inspectEntry}
                        gameSlug={gameSlug}
                        gameId={gameId}
                        gameDisplay={gameDisplay}
                        mode={inspectorMode}
                        // The drawer asks; this component owns the dialog.
                        // Hiding your identity from inside the drawer redacts
                        // your own row, which fails `isOwnEntry` on the next
                        // refetch and unmounts the drawer — a dialog rendered
                        // in there would go with it, mid-read. Up here it
                        // survives the refetch and keeps showing the result,
                        // and it is the same instance the board-level note
                        // opens.
                        onOpenHideIdentity={() => setHideIdentityOpen(true)}
                        categorySlug={categorySlug}
                        rtaFallback={rtaFallback}
                        categoryDisplay={categoryDisplay}
                        categoryId={categoryId}
                        requireVideo={requireVideo}
                        primaryTiming={primaryTiming}
                        subcategoryDefKeys={subcategoryDefKeys}
                        gameTimeLabel={gameTimeLabel}
                        showMilliseconds={showMilliseconds}
                        onClose={() => {
                            setInspectRunId(null);
                            setInspectVerb(null);
                        }}
                        onMutated={boardRefresh}
                        initialVerb={inspectVerb ?? undefined}
                        // Stepping is a moderator's sweep through a page of other
                        // people's runs. An owner has exactly one run in scope —
                        // j/k would walk them straight onto a stranger's row with
                        // owner verbs pointed at it.
                        onPrev={
                            canManage && inspectIndex > 0
                                ? () => {
                                      setInspectVerb(null);
                                      setInspectRunId(
                                          runEntries[inspectIndex - 1].runId ??
                                              null,
                                      );
                                  }
                                : undefined
                        }
                        onNext={
                            canManage && inspectIndex < runEntries.length - 1
                                ? () => {
                                      setInspectVerb(null);
                                      setInspectRunId(
                                          runEntries[inspectIndex + 1].runId ??
                                              null,
                                      );
                                  }
                                : undefined
                        }
                    />
                )}
            {(canManage ||
                (inspectManualEntry != null &&
                    isOwnEntry(inspectManualEntry))) &&
                inspectManualEntry != null && (
                    <ManualInspector
                        entry={inspectManualEntry}
                        gameSlug={gameSlug}
                        gameId={gameId}
                        mode={inspectorMode}
                        categorySlug={categorySlug}
                        subcategoryDefKeys={subcategoryDefKeys}
                        gameTimeLabel={gameTimeLabel}
                        showMilliseconds={showMilliseconds}
                        onClose={() => {
                            setInspectManualId(null);
                            setInspectVerb(null);
                        }}
                        onMutated={boardRefresh}
                        initialVerb={inspectVerb ?? undefined}
                        // Stepping is a moderator's sweep through a page of
                        // other people's set times. An owner has exactly one
                        // set time in scope — see the matching note on
                        // RunInspector's onPrev/onNext above.
                        onPrev={
                            canManage && inspectManualIndex > 0
                                ? () => {
                                      setInspectVerb(null);
                                      setInspectManualId(
                                          manualEntries[inspectManualIndex - 1]
                                              .manualTimeId ?? null,
                                      );
                                  }
                                : undefined
                        }
                        onNext={
                            canManage &&
                            inspectManualIndex < manualEntries.length - 1
                                ? () => {
                                      setInspectVerb(null);
                                      setInspectManualId(
                                          manualEntries[inspectManualIndex + 1]
                                              .manualTimeId ?? null,
                                      );
                                  }
                                : undefined
                        }
                    />
                )}
            {canManage && selectedKeys.size > 0 && (
                <BoardBulkBar
                    gameSlug={gameSlug}
                    categorySlug={categorySlug}
                    canSiteBan={canSiteBan}
                    subcategoryDefKeys={subcategoryDefKeys}
                    entries={entries}
                    selectedKeys={selectedKeys}
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
