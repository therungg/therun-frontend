'use client';

import { useSearchParams } from 'next/navigation';
import {
    Suspense,
    useEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
} from 'react';
import { CheckCircle, X } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import { getFormattedString } from '~src/components/util/datetime';
import { normalizeVariableName } from '~src/lib/variables/keys';
import type {
    ResolvedCategory,
    ResolvedGroup,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import type { WorklistPage } from '../../../../../../../types/worklist.types';
import { RunReviewModal } from '../../../run-view/mod/run-review-modal';
import {
    type ReviewTarget,
    useRunParam,
} from '../../../run-view/mod/use-run-param';
import { applyVerdictsAction } from '../shared/actions/verdicts.action';
import type { CategoryGroup } from '../shared/filter-rail-parts';
import { RunnerSearch } from '../shared/runner-search';
import { isTriageInert, moveSelection } from '../shared/triage-keyboard';
import { fireUndoToast } from '../shared/undo-toast';
import { loadWorklistAction } from './actions/worklist.action';
import {
    PLACINGS,
    QueueFilterRail,
    RAN,
    REASONS,
    SOURCES,
} from './queue-filter-rail';
import {
    blankQueueQuery,
    hasQueueFilters,
    oneQueueCategory,
    parseQueueQuery,
    type QueueQuery,
    toWorklistFilter,
    withCategories,
    writeQueueQuery,
} from './queue-params';
import { QueueSort } from './queue-sort';
import { WaitingOnRunnersSection } from './waiting-on-runners';
import { focusAfterReload, parseQueueKey } from './worklist-keys';
import {
    claimQueueKey,
    claimRow,
    itemRow,
    type QueueRowView,
    runQueueKey,
} from './worklist-model';
import styles from './worklist-pane.module.scss';
import { WorklistRow } from './worklist-row';

const PAGE_SIZE = 25;
/** Routine rows drawn at first, and added per "Show more". */
const ROUTINE_STEP = 50;
const APPROVE_REASON = 'Verified. No issues found.';
const UNDO_APPROVE_REASON = 'Undo of a verification from the worklist';
/** `/verdicts` accepts up to 500 run ids per call. */
const VERDICT_CHUNK_SIZE = 500;
const WAITING_ID = 'waiting-on-runners';

function chunk<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size)
        out.push(items.slice(i, i + size));
    return out;
}

const sameTarget = (a: ReviewTarget | null, b: ReviewTarget | null) =>
    a != null && b != null && a.kind === b.kind && a.id === b.id;

const targetKey = (t: ReviewTarget) =>
    t.kind === 'run'
        ? runQueueKey({ runId: t.id })
        : claimQueueKey({ manualTimeId: t.id });

interface Props {
    gameSlug: string;
    variables: VariableRow[];
    /** The game's categories and groups, to tell level boards apart. */
    boardCategories?: ResolvedCategory[];
    boardGroups?: ResolvedGroup[];
    /** Live count for the sidebar badge. */
    onNeedsYouChange?: (count: number) => void;
}

export function WorklistPane(props: Props) {
    // The filters and the review target live in the URL (useSearchParams),
    // which needs a Suspense boundary or the prerendered shell fails at build.
    return (
        <Suspense
            fallback={
                <div className={consoleStyles.surface}>
                    <div className={styles.skeleton} aria-busy />
                </div>
            }
        >
            <QueuePane {...props} />
        </Suspense>
    );
}

function QueuePane({
    gameSlug,
    variables,
    boardCategories,
    boardGroups,
    onNeedsYouChange,
}: Props) {
    const searchParams = useSearchParams();
    const query = useMemo(() => parseQueueQuery(searchParams), [searchParams]);
    // Shallow, like All runs: the review's ?run= / ?manual= stay put.
    const setQuery = (next: QueueQuery) => writeQueueQuery(next);
    const page = query.page;
    // The list's identity: the queue's own params only, so opening or
    // closing a review doesn't reload it.
    const queueKey = JSON.stringify(query);
    const filtered = hasQueueFilters(query);
    const [data, setData] = useState<WorklistPage | null>(null);
    // The queueKey of the query that produced `data`. Until the current
    // query's answer lands, `data` belongs to another list.
    const [loadedKey, setLoadedKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, startLoad] = useTransition();
    // A verdict from the list itself is in flight.
    const [busy, setBusy] = useState(false);
    const [now, setNow] = useState(() => new Date());
    const [target, setTarget] = useRunParam();
    // The row `r` opened, so the review opens on its Reject step. Spent on
    // that run: browsing to another clears it.
    const [rejectFor, setRejectFor] = useState<string | null>(null);
    // The row the keyboard is on, as a queue key (see worklist-model).
    const [focusKey, setFocusKey] = useState<string | null>(null);
    // Only move DOM focus and scroll when the keyboard moved the row — a
    // click inside a row must keep focus on the button it clicked.
    const keyboardDriven = useRef(false);
    const rootRef = useRef<HTMLDivElement>(null);
    // The sort menu is open and has the keyboard.
    const [pickerOpen, setPickerOpen] = useState(false);
    const [routineLimit, setRoutineLimit] = useState(ROUTINE_STEP);
    const [railOpen, setRailOpen] = useState(false);

    // The rail lists the boards the backend moderates under their category
    // group: ungrouped boards first, then groups in their own order, level
    // groups last.
    const boards = data?.boards;
    const categoryGroups = useMemo((): CategoryGroup[] => {
        if (!boards) return [];
        const groupOf = new Map(
            (boardCategories ?? []).map((c) => [c.id, c.groupId ?? null]),
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
        for (const c of boards) {
            const gid = groupOf.get(c.id) ?? null;
            (buckets.find((b) => b.id === gid) ?? buckets[0]).categories.push(
                c,
            );
        }
        return buckets.filter((b) => b.categories.length > 0);
    }, [boards, boardCategories, boardGroups]);

    // A slow response for a filter or page the moderator already left must
    // not paint the current one. Each load takes a ticket; only the newest writes.
    const requestId = useRef(0);

    const load = () => {
        const ticket = ++requestId.current;
        const q = query;
        const key = queueKey;
        startLoad(async () => {
            const res = await loadWorklistAction(
                gameSlug,
                toWorklistFilter(q, q.page, PAGE_SIZE),
            );
            if (ticket !== requestId.current) return;
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setError(null);
            setData(res.page);
            setLoadedKey(key);
            setNow(new Date());
            // The sidebar badge is the whole queue, not a filtered slice.
            if (!hasQueueFilters(q))
                onNeedsYouChange?.(res.page.counts.needsYou);
        });
    };

    // Every load runs from this effect, so it always reads the current
    // query: a reload from an older render (a verify, an undo toast, the
    // review) bumps the tick instead of calling a stale `load`.
    const [reloadTick, setReloadTick] = useState(0);
    const reload = () => setReloadTick((t) => t + 1);
    // load reads the current query; the rule is off project-wide anyway
    useEffect(load, [gameSlug, queueKey, reloadTick]);
    // A new filter, sort or page starts the routine list short again.
    // The keyboard's row belonged to the old list: drop it, so the new one
    // doesn't pull focus to its first row.
    // queueKey is the trigger, not a value the effect reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        setRoutineLimit(ROUTINE_STEP);
        setFocusKey(null);
        keyboardDriven.current = false;
    }, [queueKey]);
    // Nothing acts on or speaks for a list that is still loading.
    const settled = loadedKey === queueKey && !isLoading;

    // Verifies runs straight from the list, chunked so no single call
    // exceeds the verdict endpoint's 500-id cap. Stops on the first failing
    // chunk; undo only unverifies the chunks that actually went through.
    const verifyRuns = async (runIds: number[], label?: string) => {
        if (busy || runIds.length === 0) return;
        setBusy(true);
        const doneChunks: number[][] = [];
        let affected = 0;
        let failure: string | null = null;
        for (const ids of chunk(runIds, VERDICT_CHUNK_SIZE)) {
            const res = await applyVerdictsAction(
                gameSlug,
                'verify',
                ids,
                APPROVE_REASON,
            );
            if ('error' in res) {
                failure = res.error;
                break;
            }
            affected += res.result.affectedRunCount;
            doneChunks.push(ids);
        }
        setBusy(false);
        if (failure) {
            toast.error(failure);
            if (doneChunks.length > 0) reload();
            return;
        }
        fireUndoToast(
            label && runIds.length === 1
                ? `Verified · ${label}`
                : `Verified · ${affected} ${affected === 1 ? 'run' : 'runs'}`,
            async () => {
                for (const ids of doneChunks) {
                    const res = await applyVerdictsAction(
                        gameSlug,
                        'unverify',
                        ids,
                        UNDO_APPROVE_REASON,
                    );
                    if ('error' in res) return res;
                }
                return { ok: true };
            },
            reload,
        );
        reload();
    };

    const verifyRow = (row: QueueRowView) => {
        if (row.runId == null || !row.pending) return;
        void verifyRuns(
            [row.runId],
            `${row.runnerName} · ${row.board} · ${getFormattedString(String(row.timeMs))}`,
        );
    };

    const items = data?.items ?? [];
    const tierRows = (tier: 1 | 2 | 3) =>
        items.filter((i) => i.tier === tier).map((i) => itemRow(i, variables));
    const selfClaims = page === 1 ? (data?.selfClaims ?? []) : [];

    const needsYou = [
        ...tierRows(1),
        ...selfClaims.map((c) => claimRow(c, variables)),
    ];
    const checkFirst = tierRows(2);
    // Every batch's runs first, in the order the backend grouped them, then
    // the routine runs that didn't group.
    const routineItems = [
        ...(data?.batches ?? []).flatMap((b) => b.items),
        ...items.filter((i) => i.tier === 3),
    ];
    const seenRoutine = new Set<number>();
    const routine = routineItems
        .filter((i) => {
            if (seenRoutine.has(i.runId)) return false;
            seenRoutine.add(i.runId);
            return true;
        })
        .map((i) => itemRow(i, variables));
    // Verify all acts on every routine run; the list draws the first few and
    // grows on request, so a board with thousands waiting stays a page.
    const routineRunIds = routine.flatMap((r) =>
        r.runId != null && r.pending ? [r.runId] : [],
    );
    const routineShown = routine.slice(0, routineLimit);

    const rows = [...needsYou, ...checkFirst, ...routineShown];
    const queueKeys = rows.map((r) => r.key);
    const at = target
        ? rows.findIndex((r) => sameTarget(r.target, target))
        : -1;

    const totalPages = data
        ? Math.max(1, Math.ceil(data.totalItems / PAGE_SIZE))
        : 1;
    const waitingCount = page === 1 ? (data?.waitingOnRunners.count ?? 0) : 0;

    const openRow = (row: QueueRowView, reject = false) => {
        setRejectFor(reject ? row.key : null);
        setTarget(row.target);
    };
    const browse = (next: ReviewTarget | null) => {
        setRejectFor(null);
        setTarget(next);
    };

    // When the list reloads under the keyboard (a run verified away), land
    // on the row that took its place instead of dropping the position.
    const previousKeys = useRef<string[]>([]);
    const queueKeySignature = queueKeys.join('|');
    useEffect(() => {
        setFocusKey((cur) =>
            focusAfterReload(previousKeys.current, queueKeys, cur),
        );
        previousKeys.current = queueKeys;
        // queueKeys is rebuilt every render; the signature is its identity.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queueKeySignature]);

    useEffect(() => {
        if (!focusKey || !keyboardDriven.current) return;
        const el = rootRef.current?.querySelector<HTMLElement>(
            `[data-queue-key="${CSS.escape(focusKey)}"]`,
        );
        if (!el) return;
        el.focus({ preventScroll: true });
        el.scrollIntoView({ block: 'nearest' });
    }, [focusKey]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            // The open review owns the keyboard.
            if (target != null) return;
            if (pickerOpen || e.defaultPrevented) return;
            if (e.repeat) return;
            const action = parseQueueKey(e);
            if (!action) return;
            const active = document.activeElement as HTMLElement | null;
            // A ticked rail option keeps focus, but nobody types into a
            // checkbox: the queue's keys still work from there.
            const toggleFocused =
                active instanceof HTMLInputElement &&
                (active.type === 'checkbox' || active.type === 'radio');
            if (
                isTriageInert({
                    activeTag: toggleFocused ? null : (active?.tagName ?? null),
                    isContentEditable: !!active?.isContentEditable,
                    dialogOpen: false,
                })
            )
                return;

            if (action === 'down' || action === 'up') {
                // Arrows scroll the page until the moderator has picked a row.
                if (e.key.startsWith('Arrow') && focusKey === null) return;
                if (queueKeys.length === 0) return;
                e.preventDefault();
                keyboardDriven.current = true;
                setFocusKey(moveSelection(queueKeys, focusKey, action));
                return;
            }
            if (action === 'clear') {
                setFocusKey(null);
                return;
            }
            if (focusKey === null) return;
            const row = rows.find((r) => r.key === focusKey);
            if (!row) return;

            // Enter on another focused control belongs to that control.
            if (
                action === 'open' &&
                active &&
                active.dataset.queueKey === undefined &&
                (active.tagName === 'BUTTON' || active.tagName === 'A')
            )
                return;

            keyboardDriven.current = true;
            if (action === 'open') {
                e.preventDefault();
                openRow(row);
            } else if (action === 'reject') {
                e.preventDefault();
                openRow(row, true);
            } else if (action === 'verify') {
                e.preventDefault();
                // A typed-in time has no list verdict: it opens for review.
                if (row.runId == null) openRow(row);
                else if (!busy && row.pending) verifyRow(row);
            } else if (action === 'verifyGroup') {
                // The Routine section's Verify all, from any of its rows.
                if (!settled || busy || !routine.some((r) => r.key === row.key))
                    return;
                e.preventDefault();
                void verifyRuns(routineRunIds);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    });

    // Clicking or tabbing into a row puts the keyboard there too.
    const followPointer = (el: EventTarget) => {
        const row = (el as HTMLElement).closest?.<HTMLElement>(
            '[data-queue-key]',
        );
        if (row?.dataset.queueKey) setFocusKey(row.dataset.queueKey);
    };

    // An empty section says nothing a moderator needs: it isn't drawn.
    const section = (
        tone: 'red' | 'amber' | 'quiet',
        title: string,
        hint: string,
        count: number,
        list: QueueRowView[],
        bulk?: React.ReactNode,
        footer?: React.ReactNode,
    ) =>
        list.length === 0 ? null : (
            <section
                className={styles.section}
                data-tone={tone}
                aria-label={title}
            >
                <header className={styles.sectionHead}>
                    <span className={styles.sectionDot} aria-hidden />
                    <h3 className={styles.sectionTitle}>{title}</h3>
                    <span className={styles.sectionCount}>
                        {count.toLocaleString()}
                    </span>
                    <span className={styles.sectionHint}>{hint}</span>
                    {bulk}
                </header>
                <ul className={styles.rows}>
                    {list.map((row) => (
                        <WorklistRow
                            key={row.key}
                            row={row}
                            now={now}
                            focused={focusKey === row.key}
                            onOpen={openRow}
                        />
                    ))}
                </ul>
                {footer}
            </section>
        );

    const facets = data?.facets ?? null;
    const chips = activeChips(
        query,
        categoryGroups,
        boardCategories ?? [],
        variables,
    );
    // Sort stays: it's how the list reads, not what it holds.
    const clearFilters = () =>
        setQuery({ ...blankQueueQuery(), sort: query.sort });

    return (
        <div
            ref={rootRef}
            className={consoleStyles.surface}
            onPointerDown={(e) => {
                keyboardDriven.current = false;
                followPointer(e.target);
            }}
            onFocusCapture={(e) => followPointer(e.target)}
        >
            {/* The way back to the board is in the sidebar, under the
                game's name, on every console page. */}
            <div className={consoleStyles.paneHeader}>
                <h2 className={`${consoleStyles.paneTitle} ${styles.title}`}>
                    Queue
                    {data && (
                        <span className={consoleStyles.paneCount}>
                            {data.counts.needsYou.toLocaleString()}
                        </span>
                    )}
                </h2>
                <div className={consoleStyles.paneActions}>
                    {waitingCount > 0 && (
                        <a
                            href={`#${WAITING_ID}`}
                            className={styles.waitingLink}
                        >
                            {waitingCount.toLocaleString()} waiting on runners
                        </a>
                    )}
                </div>
            </div>

            <button
                type="button"
                className={styles.filtersToggle}
                aria-expanded={railOpen}
                aria-controls="queue-filters"
                onClick={() => setRailOpen((o) => !o)}
            >
                Filters
            </button>

            <div className={styles.layout}>
                <div
                    id="queue-filters"
                    className={
                        railOpen
                            ? `${styles.rail} ${styles.railOpen}`
                            : styles.rail
                    }
                >
                    <QueueFilterRail
                        query={query}
                        facets={facets}
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
                        {facets && !error && (
                            <span className={styles.total}>
                                {facets.total.toLocaleString()}{' '}
                                {facets.total === 1 ? 'run' : 'runs'}
                            </span>
                        )}
                        <div className={styles.sort}>
                            <QueueSort
                                value={query.sort}
                                onChange={(sort) =>
                                    setQuery({ ...query, sort, page: 1 })
                                }
                                onOpenChange={setPickerOpen}
                            />
                        </div>
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
                            <button
                                type="button"
                                className={styles.clearFilters}
                                onClick={clearFilters}
                            >
                                Clear filters
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}
                    {data?.truncated && (
                        <p className={styles.note} role="status">
                            More than 2,000 runs are waiting. Pick a category to
                            see the rest.
                        </p>
                    )}

                    {data ? (
                        <div className={styles.list} aria-busy={isLoading}>
                            {settled &&
                                rows.length === 0 &&
                                (filtered ? (
                                    <div className={styles.clear}>
                                        <p className={styles.clearTitle}>
                                            No runs match these filters
                                        </p>
                                        <button
                                            type="button"
                                            className={styles.clearFilters}
                                            onClick={clearFilters}
                                        >
                                            Clear filters
                                        </button>
                                    </div>
                                ) : (
                                    <div className={styles.clear}>
                                        <CheckCircle
                                            className={styles.clearIcon}
                                            aria-hidden
                                        />
                                        <p className={styles.clearTitle}>
                                            All caught up
                                        </p>
                                        <p className={styles.clearSub}>
                                            Every run has been decided. New runs
                                            land here as they come in.
                                        </p>
                                    </div>
                                ))}
                            {section(
                                'red',
                                'Needs you',
                                'Reports, appeals and typed-in times',
                                data.counts.tier1,
                                needsYou,
                            )}
                            {section(
                                'amber',
                                'Check first',
                                'A check failed or the runner is new',
                                data.counts.tier2,
                                checkFirst,
                            )}
                            {section(
                                'quiet',
                                'Routine',
                                'Nothing flagged',
                                data.counts.tier3,
                                routineShown,
                                settled && routineRunIds.length > 0 ? (
                                    <button
                                        type="button"
                                        className={styles.bulk}
                                        disabled={busy}
                                        onClick={() =>
                                            void verifyRuns(routineRunIds)
                                        }
                                    >
                                        {routineRunIds.length <
                                        data.counts.tier3
                                            ? 'Verify these'
                                            : 'Verify all'}{' '}
                                        {routineRunIds.length.toLocaleString()}
                                    </button>
                                ) : undefined,
                                routine.length > routineShown.length ? (
                                    <button
                                        type="button"
                                        className={styles.showMore}
                                        onClick={() =>
                                            setRoutineLimit(
                                                (n) => n + ROUTINE_STEP,
                                            )
                                        }
                                    >
                                        Show{' '}
                                        {Math.min(
                                            ROUTINE_STEP,
                                            routine.length -
                                                routineShown.length,
                                        ).toLocaleString()}{' '}
                                        more ·{' '}
                                        {(
                                            routine.length - routineShown.length
                                        ).toLocaleString()}{' '}
                                        left
                                    </button>
                                ) : undefined,
                            )}

                            {page === 1 && (
                                <div id={WAITING_ID}>
                                    <WaitingOnRunnersSection
                                        gameSlug={gameSlug}
                                        waiting={data.waitingOnRunners}
                                        variables={variables}
                                        onChanged={reload}
                                        onAccept={(run) =>
                                            browse({
                                                kind: 'run',
                                                id: run.runId,
                                            })
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        !error && <div className={styles.skeleton} aria-busy />
                    )}

                    {data && totalPages > 1 && (
                        <nav className={styles.pager} aria-label="Queue pages">
                            <button
                                type="button"
                                className={styles.verb}
                                disabled={page <= 1 || isLoading}
                                onClick={() =>
                                    setQuery({ ...query, page: page - 1 })
                                }
                            >
                                Previous
                            </button>
                            <span>
                                Page {page} of {totalPages}
                            </span>
                            <button
                                type="button"
                                className={styles.verb}
                                disabled={page >= totalPages || isLoading}
                                onClick={() =>
                                    setQuery({ ...query, page: page + 1 })
                                }
                            >
                                Next
                            </button>
                        </nav>
                    )}

                    <ul className={styles.keys} aria-label="Keyboard shortcuts">
                        <li>
                            <kbd className={styles.kbd}>j</kbd> /{' '}
                            <kbd className={styles.kbd}>k</kbd> move
                        </li>
                        <li>
                            <kbd className={styles.kbd}>Enter</kbd> open
                        </li>
                        <li>
                            <kbd className={styles.kbd}>v</kbd> verify
                        </li>
                        <li>
                            <kbd className={styles.kbd}>r</kbd> reject
                        </li>
                    </ul>
                </div>
            </div>

            <RunReviewModal
                gameSlug={gameSlug}
                target={target}
                position={
                    at >= 0 ? { index: at + 1, total: rows.length } : undefined
                }
                positionLabel="Queue"
                onPrev={at > 0 ? () => browse(rows[at - 1].target) : undefined}
                onNext={
                    at >= 0 && at < rows.length - 1
                        ? () => browse(rows[at + 1].target)
                        : undefined
                }
                onClose={() => browse(null)}
                onOpenRun={browse}
                onChanged={reload}
                initialVerb={
                    target && rejectFor === targetKey(target)
                        ? 'reject'
                        : undefined
                }
                onDecided={(decided, o) => {
                    // Back to the queue: the row goes, the keyboard lands on
                    // the row that takes its place once the list reloads.
                    browse(null);
                    keyboardDriven.current = true;
                    setFocusKey(targetKey(decided));
                    if (o.undo) fireUndoToast(o.message, o.undo, reload);
                    else toast.success(o.message);
                    reload();
                }}
            />
        </div>
    );
}

interface Chip {
    key: string;
    label: string;
    next: QueueQuery;
}

/** One chip per picked option; each chip carries the query without it. */
function activeChips(
    q: QueueQuery,
    categoryGroups: CategoryGroup[],
    boardCategories: Array<{ id: number; display: string }>,
    variables: VariableRow[],
): Chip[] {
    const chips: Chip[] = [];
    const base = { ...q, page: 1 };

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
    // Before the first response the rail's groups are empty: the game's
    // own categories name the picked boards meanwhile.
    const categories = [
        ...categoryGroups.flatMap((g) => g.categories),
        ...boardCategories,
    ];
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
    const oneCat = oneQueueCategory(q);
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
    }
    if (q.maxRank != null) {
        chips.push({
            key: 'rank',
            label:
                PLACINGS.find((o) => o.value === q.maxRank)?.label ??
                `Top ${q.maxRank}`,
            next: { ...base, maxRank: null },
        });
    }
    if (q.ran) {
        chips.push({
            key: 'ran',
            label: RAN.find((o) => o.value === q.ran)?.label ?? q.ran,
            next: { ...base, ran: null },
        });
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
    for (const r of q.reason) {
        chips.push({
            key: `reason:${r}`,
            label: REASONS.find((o) => o.value === r)?.label ?? r,
            next: { ...base, reason: q.reason.filter((x) => x !== r) },
        });
    }
    if (q.newRunner) {
        chips.push({
            key: 'new',
            label: 'New runners',
            next: { ...base, newRunner: false },
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
