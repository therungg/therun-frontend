'use client';

import { useSearchParams } from 'next/navigation';
import {
    useEffect,
    useEffectEvent,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';
import { X } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import { gameBackLink } from '~src/lib/board-url';
import { formatDuration } from '~src/lib/duration';
import { normalizeVariableName } from '~src/lib/variables/keys';
import type {
    AllRunsApiQuery,
    AllRunsCounts,
    AllRunsPage,
    AllRunsRow,
    AllRunsViewCounts,
    RunnerSuggestion,
} from '../../../../../../../types/all-runs.types';
import type {
    ResolvedCategory,
    ResolvedGroup,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import { RunnerAvatar } from '../../../leaderboard/runner-avatar';
import type { EmulatorPolicy } from '../../../rules/rules-panel';
import { RunReviewModal } from '../../../run-view/mod/run-review-modal';
import {
    type ReviewTarget,
    useRunParam,
} from '../../../run-view/mod/use-run-param';
import { BackLink } from '../../../shared/back-link';
import { ModeratePanel } from '../moderate/moderate-panel';
import type { SheetContext } from '../moderate/subject';
import { fireUndoToast } from '../shared/undo-toast';
import {
    loadAllRunsAction,
    loadAllRunsCountsAction,
    loadAllRunsViewsAction,
    loadRunnerSuggestionsAction,
} from './actions/all-runs.action';
import styles from './all-runs-pane.module.scss';
import {
    type AllRunsQuery,
    type AllRunsSort,
    activeView,
    oneCategory,
    parseQuery,
    toApi,
    toCountsApi,
    toSearch,
    VIEWS,
    type ViewId,
    viewQuery,
    withCategories,
} from './all-runs-params';
import {
    type CategoryGroup,
    FilterRail,
    POSITIONS,
    SOURCES,
    VERIFICATIONS,
} from './filter-rail';
import { rowBoard, rowEntry } from './row-entry';
import { HELD_LABELS, RunsTable } from './runs-table';

interface Props {
    gameSlug: string;
    gameId: number;
    gameDisplay: string;
    boardsVisible?: boolean;
    categories: Array<{ id: number; display: string }>;
    boardCategories: ResolvedCategory[];
    variables: VariableRow[];
    canSiteBan: boolean;
    gameRules?: string | null;
    emulatorPolicy?: EmulatorPolicy;
    boardGroups?: ResolvedGroup[];
}

const RUNNER_DEBOUNCE_MS = 300;

const DEFAULT_DIR: Record<AllRunsSort, 'asc' | 'desc'> = {
    arrived: 'desc',
    date: 'desc',
    runner: 'asc',
    category: 'asc',
    time: 'asc',
};

const EMPTY_SELECTION = new Set<number>();

// 'decided' has no game-wide total from the backend (no sort by decided-at
// either — see the view's own note), so it shows no tab count, same as
// 'recent'.
const VIEW_COUNT_KEY: Partial<Record<ViewId, keyof AllRunsViewCounts>> = {
    pending: 'pending',
    'needs-video': 'needsVideo',
    held: 'held',
    rejected: 'rejected',
};

interface Chip {
    key: string;
    label: string;
    next: AllRunsQuery;
}

export function AllRunsPane({
    gameSlug,
    gameId,
    gameDisplay,
    boardsVisible = false,
    categories,
    boardCategories,
    variables,
    canSiteBan,
    gameRules,
    emulatorPolicy,
    boardGroups,
}: Props) {
    const backLink = gameBackLink(
        { name: gameSlug, display: gameDisplay },
        boardsVisible,
    );
    const searchParams = useSearchParams();
    const query = useMemo(() => parseQuery(searchParams), [searchParams]);
    // Shallow: useSearchParams follows replaceState, and the manage page's
    // server payload doesn't depend on these params, so no refetch.
    const setQuery = (next: AllRunsQuery) =>
        window.history.replaceState(null, '', `?${toSearch(next)}`);

    // The boards the backend searches: featured or level, not archived.
    const searchedCategories = useMemo(() => {
        const levelGroups = new Set(
            (boardGroups ?? [])
                .filter((g) => g.kind === 'level')
                .map((g) => g.id),
        );
        const searched = new Set(
            boardCategories
                .filter(
                    (c) =>
                        !c.archived &&
                        ((c.isMain ?? false) ||
                            (c.groupId != null && levelGroups.has(c.groupId))),
                )
                .map((c) => c.id),
        );
        return categories.filter((c) => searched.has(c.id));
    }, [categories, boardCategories, boardGroups]);

    // The rail lists them under their category group: ungrouped boards
    // first, then groups in their own order, level groups last.
    const categoryGroups = useMemo((): CategoryGroup[] => {
        const groupOf = new Map(
            boardCategories.map((c) => [c.id, c.groupId ?? null]),
        );
        const groups = [...(boardGroups ?? [])].sort(
            (a, b) =>
                Number(a.kind === 'level') - Number(b.kind === 'level') ||
                a.sortOrder - b.sortOrder,
        );
        const buckets: CategoryGroup[] = [
            { id: null, name: null, categories: [] },
            ...groups.map((g) => ({
                id: g.id,
                name: g.name,
                categories: [] as CategoryGroup['categories'],
            })),
        ];
        for (const c of searchedCategories) {
            const gid = groupOf.get(c.id) ?? null;
            (buckets.find((b) => b.id === gid) ?? buckets[0]).categories.push(
                c,
            );
        }
        return buckets.filter((b) => b.categories.length > 0);
    }, [searchedCategories, boardCategories, boardGroups]);

    // The review target lives in the URL (`?run=`), same as the queue and
    // the board — a deep link or a share keeps working.
    const [runTarget, setRunTarget] = useRunParam();
    const [openRunner, setOpenRunner] = useState<{
        userId: number;
        runnerName: string;
    } | null>(null);
    const [bulkOpen, setBulkOpen] = useState(false);

    // Bumped after a Moderate verb so both reads run again for the same query.
    const [tick, setTick] = useState(0);

    // Game-wide totals for the view tabs; they move only when a verb does.
    const [viewCounts, setViewCounts] = useState<AllRunsViewCounts | null>(
        null,
    );
    useEffect(() => {
        let live = true;
        loadAllRunsViewsAction(gameSlug)
            .then((res) => {
                if (live && 'ok' in res) setViewCounts(res.views);
            })
            .catch(() => setViewCounts(null));
        return () => {
            live = false;
        };
    }, [gameSlug, tick]);
    const reload = () => setTick((t) => t + 1);

    // Table. Each read takes a ticket; only the newest may write.
    const tableKey = JSON.stringify(toApi(query));
    const tableTicket = `${tableKey}#${tick}`;
    const tableSeq = useRef(0);
    const [table, setTable] = useState<{
        ticket: string;
        page: AllRunsPage | null;
        error: string | null;
    } | null>(null);
    // A verb can empty the last page; step back to the new last one.
    const stepToLastPage = useEffectEvent((loaded: AllRunsPage) => {
        const lastPage = Math.max(
            1,
            Math.ceil(loaded.total / (loaded.pageSize || 50)),
        );
        setQuery({ ...query, page: lastPage });
    });
    useEffect(() => {
        const seq = ++tableSeq.current;
        const ticket = `${tableKey}#${tick}`;
        const requested = JSON.parse(tableKey) as AllRunsApiQuery;
        loadAllRunsAction(gameSlug, requested)
            .catch(() => ({ error: 'Failed to load runs.' }))
            .then((res) => {
                if (seq !== tableSeq.current) return;
                if ('error' in res) {
                    setRunTarget(null);
                    setTable((prev) => ({
                        ticket,
                        page: prev?.page ?? null,
                        error: res.error,
                    }));
                    return;
                }
                if (
                    res.page.runs.length === 0 &&
                    res.page.total > 0 &&
                    Number(requested.page ?? 1) > 1
                ) {
                    stepToLastPage(res.page);
                    return;
                }
                setTable({ ticket, page: res.page, error: null });
            });
    }, [gameSlug, tableKey, tick]);

    // Counts ignore sort and page, so those don't refetch them.
    const countsKey = JSON.stringify(toCountsApi(query));
    const countsSeq = useRef(0);
    // Held per key: a reload of the same key (after a verb) keeps the old
    // counts on screen instead of flashing dashes.
    const [countsState, setCountsState] = useState<{
        key: string;
        counts: AllRunsCounts | null;
        failed: boolean;
    } | null>(null);
    useEffect(() => {
        const seq = ++countsSeq.current;
        const key = countsKey;
        loadAllRunsCountsAction(
            gameSlug,
            JSON.parse(countsKey) as AllRunsApiQuery,
        )
            .catch(() => ({ error: 'Failed to load counts.' }))
            .then((res) => {
                if (seq !== countsSeq.current) return;
                setCountsState((prev) => {
                    if (!('error' in res)) {
                        return { key, counts: res.counts, failed: false };
                    }
                    const kept = prev?.key === key ? prev.counts : null;
                    return { key, counts: kept, failed: kept == null };
                });
            });
    }, [gameSlug, countsKey, tick]);

    const loading = table?.ticket !== tableTicket;
    const page = table?.page ?? null;
    const rows = page?.runs ?? null;
    const error = !loading ? (table?.error ?? null) : null;
    const counts = countsState?.key === countsKey ? countsState.counts : null;
    const countsFailed = countsState?.key === countsKey && countsState.failed;

    // Selection belongs to one category and one page. Rows still on screen
    // from the previous query can belong to other boards: nothing is
    // pickable while loading, and only this category's rows count.
    const oneCat = oneCategory(query);
    const selectable = oneCat != null;
    const pickable = selectable && !loading;
    const inScope = (r: AllRunsRow) => r.categoryId === oneCat;
    const selectionScope = `${oneCat}|${query.page}`;
    const [selection, setSelection] = useState<{
        scope: string;
        ids: Set<number>;
    }>({ scope: '', ids: EMPTY_SELECTION });
    // Leaving the scope drops the picks, so coming back doesn't revive them.
    if (selection.scope !== selectionScope && selection.ids.size > 0) {
        setSelection({ scope: selectionScope, ids: EMPTY_SELECTION });
    }
    const selected =
        selectable && selection.scope === selectionScope
            ? selection.ids
            : EMPTY_SELECTION;
    const setSelected = (ids: Set<number>) =>
        setSelection({ scope: selectionScope, ids });
    const clearSelection = () => setSelected(EMPTY_SELECTION);
    const toggleOne = (id: number) => {
        if (!pickable) return;
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    };
    const togglePage = () => {
        if (!pickable) return;
        const ids = rows?.filter(inScope).map((r) => r.id) ?? [];
        const all = ids.length > 0 && ids.every((id) => selected.has(id));
        setSelected(all ? EMPTY_SELECTION : new Set(ids));
    };
    const selectedRows =
        rows?.filter((r) => inScope(r) && selected.has(r.id)) ?? [];
    const bulkBoard =
        oneCat != null
            ? rowBoard(
                  { categoryId: oneCat, subcategoryKey: '' },
                  boardCategories,
              )
            : null;

    // Every All Runs row is a finished run (the backend has no separate
    // manual-time id space here, unlike the queue's self-claims).
    const rowTarget = (row: AllRunsRow): ReviewTarget => ({
        kind: 'run',
        id: row.id,
    });

    const openRow = (row: AllRunsRow) => {
        if (!rowBoard(row, boardCategories)) {
            toast.error(
                "This run's board isn't in this console's list. Open it from the run page.",
            );
            return;
        }
        setOpenRunner(null);
        setBulkOpen(false);
        setRunTarget(rowTarget(row));
    };
    const openRunnerSheet = (row: AllRunsRow) => {
        if (row.userId == null) return;
        setRunTarget(null);
        setBulkOpen(false);
        setOpenRunner({ userId: row.userId, runnerName: row.runnerName });
    };

    const openIndex =
        runTarget == null || runTarget.kind !== 'run' || rows == null
            ? -1
            : rows.findIndex((r) => r.id === runTarget.id);
    const stepTo = (index: number) => {
        const row = rows?.[index];
        if (row && rowBoard(row, boardCategories)) setRunTarget(rowTarget(row));
    };

    const sheetContext: SheetContext = {
        gameSlug,
        gameId,
        gameDisplay,
        categories: boardCategories,
        variables,
        canSiteBan,
        gameRules,
        emulatorPolicy,
        groups: boardGroups,
        boardsVisible,
    };

    const onSort = (sort: AllRunsSort) =>
        setQuery({
            ...query,
            sort,
            dir:
                query.sort === sort
                    ? query.dir === 'asc'
                        ? 'desc'
                        : 'asc'
                    : DEFAULT_DIR[sort],
            page: 1,
        });

    const view = activeView(query);
    const clearable = view !== 'recent';
    const clearFilters = () => setQuery(viewQuery('recent'));
    const chips = activeChips(query, categories, categoryGroups, variables);
    const [railOpen, setRailOpen] = useState(false);

    const pageSize = page?.pageSize ?? 50;
    const total = page?.total ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const first = total === 0 ? 0 : (query.page - 1) * pageSize + 1;
    const last = Math.min(total, query.page * pageSize);

    return (
        <div className={consoleStyles.surface}>
            <div className={consoleStyles.paneHeader}>
                <div>
                    <div className={consoleStyles.paneEyebrow}>Moderation</div>
                    <h2 className={consoleStyles.paneTitle}>All runs</h2>
                </div>
                <div className={consoleStyles.paneActions}>
                    <BackLink {...backLink} />
                </div>
            </div>

            <div className={styles.views}>
                {VIEWS.map((v) => (
                    <button
                        key={v.id}
                        type="button"
                        aria-pressed={view === v.id}
                        className={
                            view === v.id
                                ? `${styles.view} ${styles.viewActive}`
                                : styles.view
                        }
                        onClick={() =>
                            view === v.id ? reload() : setQuery(viewQuery(v.id))
                        }
                    >
                        {v.label}
                        {viewCounts && VIEW_COUNT_KEY[v.id] && (
                            <span className={styles.viewCount}>
                                {viewCounts[
                                    VIEW_COUNT_KEY[
                                        v.id
                                    ] as keyof AllRunsViewCounts
                                ].toLocaleString()}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <button
                type="button"
                className={styles.filtersToggle}
                aria-expanded={railOpen}
                aria-controls="all-runs-filters"
                onClick={() => setRailOpen((o) => !o)}
            >
                Filters
            </button>

            <div className={styles.layout}>
                <div
                    id="all-runs-filters"
                    className={
                        railOpen
                            ? `${styles.rail} ${styles.railOpen}`
                            : styles.rail
                    }
                >
                    <FilterRail
                        query={query}
                        counts={counts}
                        countsFailed={countsFailed}
                        categoryGroups={categoryGroups}
                        variables={variables}
                        onChange={setQuery}
                    />
                </div>

                <div className={styles.main}>
                    <div className={styles.toolbar}>
                        <RunnerSearch
                            gameSlug={gameSlug}
                            value={query.runner}
                            onApply={(runner) =>
                                setQuery({ ...query, runner, page: 1 })
                            }
                        />
                        {page && !error && (
                            <span className={styles.total}>
                                {total.toLocaleString()}{' '}
                                {total === 1 ? 'run' : 'runs'}
                            </span>
                        )}
                        {!error && pageCount > 1 && (
                            <nav className={styles.topPager} aria-label="Pages">
                                {query.page > 1 && (
                                    <button
                                        type="button"
                                        className={styles.topPagerBtn}
                                        aria-label="Previous page"
                                        disabled={loading}
                                        onClick={() =>
                                            setQuery({
                                                ...query,
                                                page: query.page - 1,
                                            })
                                        }
                                    >
                                        ‹
                                    </button>
                                )}
                                <span className={styles.pagerRange}>
                                    {first.toLocaleString()}–
                                    {last.toLocaleString()}
                                </span>
                                {query.page < pageCount && (
                                    <button
                                        type="button"
                                        className={styles.topPagerBtn}
                                        aria-label="Next page"
                                        disabled={loading}
                                        onClick={() =>
                                            setQuery({
                                                ...query,
                                                page: query.page + 1,
                                            })
                                        }
                                    >
                                        ›
                                    </button>
                                )}
                            </nav>
                        )}
                    </div>

                    {chips.length > 0 && (
                        <div className={styles.chips}>
                            {chips.map((c) => (
                                <button
                                    key={c.key}
                                    type="button"
                                    className={styles.chip}
                                    aria-label={`Remove filter: ${c.label}`}
                                    onClick={() => setQuery(c.next)}
                                >
                                    {c.label}
                                    <X aria-hidden size={14} />
                                </button>
                            ))}
                            {clearable && (
                                <button
                                    type="button"
                                    className={styles.clear}
                                    onClick={clearFilters}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    )}

                    {error ? (
                        <div className={styles.state}>
                            <p className={styles.errorText} role="alert">
                                {error}
                            </p>
                            {clearable && (
                                <button
                                    type="button"
                                    className={styles.clear}
                                    onClick={clearFilters}
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : rows != null && rows.length === 0 && !loading ? (
                        <div className={styles.state}>
                            <p className={styles.stateTitle}>
                                No runs match these filters
                            </p>
                            {clearable && (
                                <button
                                    type="button"
                                    className={styles.clear}
                                    onClick={clearFilters}
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <div
                            className={
                                loading && rows != null
                                    ? styles.stale
                                    : undefined
                            }
                            aria-busy={loading}
                        >
                            <RunsTable
                                rows={rows}
                                query={query}
                                variables={variables}
                                selectable={selectable}
                                pickable={pickable}
                                selected={selected}
                                onToggle={toggleOne}
                                onTogglePage={togglePage}
                                onSort={onSort}
                                onOpenRun={openRow}
                                onOpenRunner={openRunnerSheet}
                            />
                        </div>
                    )}

                    {!error && pageCount > 1 && (
                        <nav className={styles.pager} aria-label="Pages">
                            <span className={styles.pagerRange}>
                                {first.toLocaleString()}–{last.toLocaleString()}{' '}
                                of {total.toLocaleString()}
                            </span>
                            {query.page > 1 && (
                                <button
                                    type="button"
                                    className={styles.pagerBtn}
                                    disabled={loading}
                                    onClick={() =>
                                        setQuery({
                                            ...query,
                                            page: query.page - 1,
                                        })
                                    }
                                >
                                    Previous
                                </button>
                            )}
                            <span className={styles.pagerRange}>
                                Page {query.page} of {pageCount}
                            </span>
                            {query.page < pageCount && (
                                <button
                                    type="button"
                                    className={styles.pagerBtn}
                                    disabled={loading}
                                    onClick={() =>
                                        setQuery({
                                            ...query,
                                            page: query.page + 1,
                                        })
                                    }
                                >
                                    Next
                                </button>
                            )}
                        </nav>
                    )}
                </div>
            </div>

            {selectedRows.length > 0 && bulkBoard && (
                <div className={styles.selectionBar}>
                    <span>{selectedRows.length} selected</span>
                    <button
                        type="button"
                        className={styles.selectionPrimary}
                        onClick={() => {
                            setRunTarget(null);
                            setOpenRunner(null);
                            setBulkOpen(true);
                        }}
                    >
                        Moderate
                    </button>
                    <button
                        type="button"
                        className={styles.clear}
                        onClick={clearSelection}
                    >
                        Clear
                    </button>
                </div>
            )}

            <RunReviewModal
                gameSlug={gameSlug}
                target={runTarget}
                position={
                    openIndex >= 0
                        ? { index: openIndex + 1, total: rows?.length ?? 0 }
                        : undefined
                }
                onPrev={openIndex > 0 ? () => stepTo(openIndex - 1) : undefined}
                onNext={
                    openIndex >= 0 && rows && openIndex < rows.length - 1
                        ? () => stepTo(openIndex + 1)
                        : undefined
                }
                onClose={() => setRunTarget(null)}
                onOpenRun={(t) => {
                    setOpenRunner(null);
                    setBulkOpen(false);
                    setRunTarget(t);
                }}
                onChanged={reload}
                onDecided={(_target, outcome) => {
                    // The list owns what happens next: close, reload, undo
                    // toast — no auto-advance.
                    setRunTarget(null);
                    if (outcome.undo) {
                        fireUndoToast(outcome.message, outcome.undo, reload);
                    } else {
                        toast.success(outcome.message);
                    }
                    reload();
                }}
            />

            {openRunner && (
                <ModeratePanel
                    subject={{
                        kind: 'runner',
                        userId: openRunner.userId,
                        runnerName: openRunner.runnerName,
                        categoryId: oneCat,
                    }}
                    context={sheetContext}
                    mount="modal"
                    onClose={() => setOpenRunner(null)}
                    onMutated={reload}
                    onOpenRun={(t) => {
                        setOpenRunner(null);
                        setRunTarget(t);
                    }}
                />
            )}

            {bulkOpen && selectedRows.length > 0 && bulkBoard && (
                <ModeratePanel
                    subject={{
                        kind: 'bulk',
                        entries: selectedRows.map((r) =>
                            rowEntry(r, bulkBoard),
                        ),
                        board: bulkBoard,
                    }}
                    context={sheetContext}
                    mount="modal"
                    onClose={() => setBulkOpen(false)}
                    onMutated={() => {
                        reload();
                        clearSelection();
                        setBulkOpen(false);
                    }}
                />
            )}
        </div>
    );
}

/** Local draft, written to the URL after a pause; follows outside changes. */
const SUGGEST_DEBOUNCE_MS = 150;

/** Runner search with suggestions: typing still filters as it goes, and a
 *  picked suggestion applies at once. */
function RunnerSearch({
    gameSlug,
    value,
    onApply,
}: {
    gameSlug: string;
    value: string;
    onApply: (runner: string) => void;
}) {
    const id = useId();
    const listId = `${id}-list`;
    const [draft, setDraft] = useState(value);
    const [synced, setSynced] = useState(value);
    if (synced !== value) {
        setSynced(value);
        setDraft(value);
    }
    const [focused, setFocused] = useState(false);
    const [suggestions, setSuggestions] = useState<{
        q: string;
        runners: RunnerSuggestion[];
    }>({ q: '', runners: [] });
    const [active, setActive] = useState(-1);
    const [dismissed, setDismissed] = useState(false);
    const seq = useRef(0);

    // Applies against the query current when the pause ends, not when typed.
    const apply = useEffectEvent((runner: string) => onApply(runner));
    useEffect(() => {
        if (draft.trim() === value.trim()) return;
        const t = setTimeout(() => apply(draft), RUNNER_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [draft, value]);

    const q = draft.trim();
    useEffect(() => {
        if (q === '' || !focused) return;
        const mine = ++seq.current;
        const t = setTimeout(() => {
            loadRunnerSuggestionsAction(gameSlug, q)
                .then((res) => {
                    if (mine !== seq.current || !('ok' in res)) return;
                    setSuggestions({ q, runners: res.runners });
                    setActive(-1);
                })
                // No suggestions is fine: typing still filters.
                .catch(() => setSuggestions({ q: '', runners: [] }));
        }, SUGGEST_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [gameSlug, q, focused]);

    const shown =
        focused && !dismissed && q !== '' && suggestions.q === q
            ? // The one already applied, typed in full, needs no suggestion.
              suggestions.runners.filter(
                  (r) =>
                      !(
                          suggestions.runners.length === 1 &&
                          r.name.toLowerCase() === value.trim().toLowerCase()
                      ),
              )
            : [];
    const open = shown.length > 0;

    const pick = (runner: RunnerSuggestion) => {
        setDraft(runner.name);
        setDismissed(true);
        setActive(-1);
        onApply(runner.name);
    };

    return (
        <div className={styles.search}>
            <label htmlFor={id} className="visually-hidden">
                Runner
            </label>
            <input
                id={id}
                type="search"
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={
                    open && active >= 0 ? `${listId}-${active}` : undefined
                }
                autoComplete="off"
                className={`form-control form-control-sm ${styles.searchInput}`}
                placeholder="Search runner"
                value={draft}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onChange={(e) => {
                    setDraft(e.target.value);
                    setDismissed(false);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' && open) {
                        e.preventDefault();
                        setActive((i) => (i + 1) % shown.length);
                    } else if (e.key === 'ArrowUp' && open) {
                        e.preventDefault();
                        setActive((i) => (i <= 0 ? shown.length - 1 : i - 1));
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (open && active >= 0) pick(shown[active]);
                        else {
                            setDismissed(true);
                            onApply(draft);
                        }
                    } else if (e.key === 'Escape' && open) {
                        e.preventDefault();
                        setDismissed(true);
                    }
                }}
            />
            {open && (
                <ul id={listId} role="listbox" className={styles.suggestions}>
                    {shown.map((r, i) => (
                        <li
                            key={`${r.userId ?? 'g'}:${r.name}`}
                            id={`${listId}-${i}`}
                            role="option"
                            aria-selected={i === active}
                            className={
                                i === active
                                    ? `${styles.suggestion} ${styles.suggestionActive}`
                                    : styles.suggestion
                            }
                            // mousedown, not click: the input keeps focus and
                            // its blur doesn't close the list first.
                            onMouseDown={(e) => {
                                e.preventDefault();
                                pick(r);
                            }}
                            onMouseEnter={() => setActive(i)}
                        >
                            <RunnerAvatar
                                name={r.name}
                                picture={r.picture}
                                size="xs"
                            />
                            <span className={styles.suggestionName}>
                                <Highlight text={r.name} match={q} />
                                {r.userId == null && (
                                    <span className={styles.suggestionGuest}>
                                        guest
                                    </span>
                                )}
                            </span>
                            <span className={styles.suggestionRuns}>
                                {r.runs.toLocaleString()}{' '}
                                {r.runs === 1 ? 'run' : 'runs'}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/** The typed part of a name, in bold. */
function Highlight({ text, match }: { text: string; match: string }) {
    const at = text.toLowerCase().indexOf(match.toLowerCase());
    if (match === '' || at < 0) return <>{text}</>;
    return (
        <>
            {text.slice(0, at)}
            <b>{text.slice(at, at + match.length)}</b>
            {text.slice(at + match.length)}
        </>
    );
}

/** One chip per picked option; each chip carries the query without it. */
function activeChips(
    q: AllRunsQuery,
    categories: Array<{ id: number; display: string }>,
    categoryGroups: CategoryGroup[],
    variables: VariableRow[],
): Chip[] {
    const chips: Chip[] = [];
    const base = { ...q, page: 1 };

    // Position, verification and held reason that are just a view's preset
    // are already said by the view tab and the ticked rail: no chips for them.
    const same = (x: string[], y: string[] = []) =>
        x.length === y.length && x.every((v) => y.includes(v));
    const fromView = VIEWS.some(
        (v) =>
            same(q.position, v.query.position) &&
            same(q.verification, v.query.verification) &&
            same(q.heldReason, v.query.heldReason),
    );

    for (const p of fromView ? [] : q.position) {
        chips.push({
            key: `pos:${p}`,
            label: POSITIONS.find((o) => o.value === p)?.label ?? p,
            next: { ...base, position: q.position.filter((x) => x !== p) },
        });
    }
    for (const v of fromView ? [] : q.verification) {
        chips.push({
            key: `ver:${v}`,
            label: VERIFICATIONS.find((o) => o.value === v)?.label ?? v,
            next: {
                ...base,
                verification: q.verification.filter((x) => x !== v),
            },
        });
    }
    for (const r of fromView ? [] : q.heldReason) {
        chips.push({
            key: `reason:${r}`,
            label: `Held: ${HELD_LABELS[r] ?? r.replace(/_/g, ' ')}`,
            next: { ...base, heldReason: q.heldReason.filter((x) => x !== r) },
        });
    }
    // A fully picked category group is one chip; the rest one per board.
    let loose = q.categoryIds;
    for (const g of categoryGroups) {
        const ids = g.categories.map((c) => c.id);
        if (
            g.name == null ||
            ids.length < 2 ||
            !ids.every((id) => q.categoryIds.includes(id))
        ) {
            continue;
        }
        loose = loose.filter((id) => !ids.includes(id));
        chips.push({
            key: `group:${g.id}`,
            label: g.name,
            next: withCategories(
                q,
                q.categoryIds.filter((id) => !ids.includes(id)),
            ),
        });
    }
    for (const id of loose) {
        chips.push({
            key: `cat:${id}`,
            label: categories.find((c) => c.id === id)?.display ?? 'Category',
            next: withCategories(
                q,
                q.categoryIds.filter((x) => x !== id),
            ),
        });
    }
    const oneCat = oneCategory(q);
    if (oneCat != null) {
        for (const [key, values] of Object.entries(q.vars)) {
            const variable = variables.find(
                (v) => v.categoryId === oneCat && v.nameNormalized === key,
            );
            for (const value of values) {
                const label =
                    value === ''
                        ? 'Not set'
                        : (variable?.values.find(
                              (v) => normalizeVariableName(v[0]) === value,
                          )?.[0] ?? value);
                chips.push({
                    key: `var:${key}:${value}`,
                    label: `${variable?.name ?? key}: ${label}`,
                    next: {
                        ...base,
                        vars: {
                            ...q.vars,
                            [key]: values.filter((x) => x !== value),
                        },
                    },
                });
            }
        }
        if (q.fasterThan != null) {
            chips.push({
                key: 'faster',
                label: `Faster than ${formatDuration(q.fasterThan)}`,
                next: { ...base, fasterThan: null },
            });
        }
        if (q.slowerThan != null) {
            chips.push({
                key: 'slower',
                label: `Slower than ${formatDuration(q.slowerThan)}`,
                next: { ...base, slowerThan: null },
            });
        }
    }
    if (q.video) {
        chips.push({
            key: 'video',
            label: q.video === 'has' ? 'Has video' : 'Missing video',
            next: { ...base, video: null },
        });
    }
    for (const s of q.source) {
        chips.push({
            key: `source:${s}`,
            label: SOURCES.find((o) => o.value === s)?.label ?? s,
            next: { ...base, source: q.source.filter((x) => x !== s) },
        });
    }
    if (q.runner.trim()) {
        chips.push({
            key: 'runner',
            label: `Runner: ${q.runner.trim()}`,
            next: { ...base, runner: '' },
        });
    }
    return chips;
}
