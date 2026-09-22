'use client';

import { useRouter, useSearchParams } from 'next/navigation';
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
} from '../../../../../../../types/all-runs.types';
import type {
    ResolvedCategory,
    ResolvedGroup,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import type { EmulatorPolicy } from '../../../rules/rules-panel';
import { BackLink } from '../../../shared/back-link';
import { ModeratePanel } from '../moderate/moderate-panel';
import { isKnownStatus, type SheetContext } from '../moderate/subject';
import {
    loadAllRunsAction,
    loadAllRunsCountsAction,
} from './actions/all-runs.action';
import styles from './all-runs-pane.module.scss';
import {
    type AllRunsQuery,
    type AllRunsSort,
    activeView,
    parseQuery,
    toApi,
    toCountsApi,
    toSearch,
    VIEWS,
    viewQuery,
} from './all-runs-params';
import { ARRIVED, FilterRail, POSITIONS, VERIFICATIONS } from './filter-rail';
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
    const router = useRouter();
    const searchParams = useSearchParams();
    const query = useMemo(() => parseQuery(searchParams), [searchParams]);
    const setQuery = (next: AllRunsQuery) =>
        router.replace(`?${toSearch(next)}`, { scroll: false });

    const [openRunId, setOpenRunId] = useState<number | null>(null);
    const [openRunner, setOpenRunner] = useState<{
        userId: number;
        runnerName: string;
    } | null>(null);
    const [bulkOpen, setBulkOpen] = useState(false);

    // Bumped after a Moderate verb so both reads run again for the same query.
    const [tick, setTick] = useState(0);
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
                    setOpenRunId(null);
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
                setCountsState((prev) => ({
                    key,
                    counts:
                        'error' in res
                            ? prev?.key === key
                                ? prev.counts
                                : null
                            : res.counts,
                }));
            });
    }, [gameSlug, countsKey, tick]);

    const loading = table?.ticket !== tableTicket;
    const page = table?.page ?? null;
    const rows = page?.runs ?? null;
    const error = !loading ? (table?.error ?? null) : null;
    const counts = countsState?.key === countsKey ? countsState.counts : null;

    // Selection belongs to one category and one page.
    const selectable = query.categoryId != null;
    const selectionScope = `${query.categoryId}|${query.page}`;
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
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    };
    const togglePage = () => {
        const ids = rows?.map((r) => r.id) ?? [];
        const all = ids.length > 0 && ids.every((id) => selected.has(id));
        setSelected(all ? EMPTY_SELECTION : new Set(ids));
    };
    const selectedRows = rows?.filter((r) => selected.has(r.id)) ?? [];
    const bulkBoard =
        query.categoryId != null
            ? rowBoard(
                  { categoryId: query.categoryId, subcategoryKey: '' },
                  boardCategories,
              )
            : null;

    const openRow = (row: AllRunsRow) => {
        if (!rowBoard(row, boardCategories)) {
            toast.error(
                "This run's board isn't in this console's list. Open it from the run page.",
            );
            return;
        }
        setOpenRunner(null);
        setBulkOpen(false);
        setOpenRunId(row.id);
    };
    const openRunnerSheet = (row: AllRunsRow) => {
        if (row.userId == null) return;
        setOpenRunId(null);
        setBulkOpen(false);
        setOpenRunner({ userId: row.userId, runnerName: row.runnerName });
    };

    // After the table reloads under the modal (the open run decided out of
    // this view), stay on the run if it is still listed, else take the next
    // run that survived, else the one before it, else close.
    const runOrder = (rows ?? []).map((r) => r.id);
    const runOrderSignature = runOrder.join('|');
    const [seenRunOrder, setSeenRunOrder] = useState<{
        signature: string;
        runIds: number[];
    }>({ signature: '', runIds: [] });
    if (rows != null && seenRunOrder.signature !== runOrderSignature) {
        setSeenRunOrder({ signature: runOrderSignature, runIds: runOrder });
        if (openRunId !== null && !runOrder.includes(openRunId)) {
            const previous = seenRunOrder.runIds;
            const survivors = new Set(runOrder);
            const at = previous.indexOf(openRunId);
            let landing: number | null = null;
            if (at !== -1) {
                landing =
                    previous.slice(at + 1).find((id) => survivors.has(id)) ??
                    previous
                        .slice(0, at)
                        .reverse()
                        .find((id) => survivors.has(id)) ??
                    null;
            }
            setOpenRunId(landing);
        }
    }

    const openIndex =
        openRunId === null || rows == null
            ? -1
            : rows.findIndex((r) => r.id === openRunId);
    const openItem = openIndex >= 0 && rows ? rows[openIndex] : null;
    const openBoard = openItem ? rowBoard(openItem, boardCategories) : null;
    const stepTo = (index: number) => {
        const row = rows?.[index];
        if (row && rowBoard(row, boardCategories)) setOpenRunId(row.id);
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
    const chips = activeChips(query, categories, variables);
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
                        categories={categories}
                        variables={variables}
                        onChange={setQuery}
                    />
                </div>

                <div className={styles.main}>
                    <div className={styles.toolbar}>
                        <RunnerSearch
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
                                selectable={selectable}
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
                            setOpenRunId(null);
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

            {openItem && openBoard && (
                <ModeratePanel
                    subject={{
                        kind: 'run',
                        entry: rowEntry(openItem, openBoard),
                        board: openBoard,
                        statusKnown: isKnownStatus(openItem.verificationStatus),
                    }}
                    context={sheetContext}
                    mount="modal"
                    position={{
                        index: openIndex + 1,
                        total: rows?.length ?? 0,
                    }}
                    onClose={() => setOpenRunId(null)}
                    onMutated={reload}
                    onPrev={
                        openIndex > 0 ? () => stepTo(openIndex - 1) : undefined
                    }
                    onNext={
                        rows && openIndex < rows.length - 1
                            ? () => stepTo(openIndex + 1)
                            : undefined
                    }
                />
            )}

            {openRunner && (
                <ModeratePanel
                    subject={{
                        kind: 'runner',
                        userId: openRunner.userId,
                        runnerName: openRunner.runnerName,
                        categoryId: query.categoryId,
                    }}
                    context={sheetContext}
                    mount="modal"
                    onClose={() => setOpenRunner(null)}
                    onMutated={reload}
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
function RunnerSearch({
    value,
    onApply,
}: {
    value: string;
    onApply: (runner: string) => void;
}) {
    const id = useId();
    const [draft, setDraft] = useState(value);
    const [synced, setSynced] = useState(value);
    if (synced !== value) {
        setSynced(value);
        setDraft(value);
    }

    // Applies against the query current when the pause ends, not when typed.
    const apply = useEffectEvent((runner: string) => onApply(runner));
    useEffect(() => {
        if (draft.trim() === value.trim()) return;
        const t = setTimeout(() => apply(draft), RUNNER_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [draft, value]);

    return (
        <div className={styles.search}>
            <label htmlFor={id} className="visually-hidden">
                Runner
            </label>
            <input
                id={id}
                type="search"
                className={`form-control form-control-sm ${styles.searchInput}`}
                placeholder="Search runner"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
            />
        </div>
    );
}

/** One chip per picked option; each chip carries the query without it. */
function activeChips(
    q: AllRunsQuery,
    categories: Array<{ id: number; display: string }>,
    variables: VariableRow[],
): Chip[] {
    const chips: Chip[] = [];
    const base = { ...q, page: 1 };

    for (const p of q.position) {
        chips.push({
            key: `pos:${p}`,
            label: POSITIONS.find((o) => o.value === p)?.label ?? p,
            next: { ...base, position: q.position.filter((x) => x !== p) },
        });
    }
    for (const v of q.verification) {
        chips.push({
            key: `ver:${v}`,
            label: VERIFICATIONS.find((o) => o.value === v)?.label ?? v,
            next: {
                ...base,
                verification: q.verification.filter((x) => x !== v),
            },
        });
    }
    for (const r of q.heldReason) {
        chips.push({
            key: `reason:${r}`,
            label: `Held: ${HELD_LABELS[r] ?? r.replace(/_/g, ' ')}`,
            next: { ...base, heldReason: q.heldReason.filter((x) => x !== r) },
        });
    }
    if (q.categoryId != null) {
        const category = categories.find((c) => c.id === q.categoryId);
        chips.push({
            key: 'cat',
            label: category?.display ?? 'Category',
            next: {
                ...base,
                categoryId: null,
                vars: {},
                fasterThan: null,
                slowerThan: null,
                sort: q.sort === 'time' ? 'arrived' : q.sort,
            },
        });
        for (const [key, values] of Object.entries(q.vars)) {
            const variable = variables.find(
                (v) =>
                    v.categoryId === q.categoryId && v.nameNormalized === key,
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
    if (q.arrived) {
        chips.push({
            key: 'arrived',
            label:
                ARRIVED.find((o) => o.value === q.arrived)?.label ?? q.arrived,
            next: { ...base, arrived: null },
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
