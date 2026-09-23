'use client';

import { Suspense, useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import { getFormattedString } from '~src/components/util/datetime';
import { gameBackLink } from '~src/lib/board-url';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';
import type { WorklistPage } from '../../../../../../../types/worklist.types';
import { RunReviewModal } from '../../../run-view/mod/run-review-modal';
import {
    type ReviewTarget,
    useRunParam,
} from '../../../run-view/mod/use-run-param';
import { BackLink } from '../../../shared/back-link';
import { applyVerdictsAction } from '../shared/actions/verdicts.action';
import { isTriageInert, moveSelection } from '../shared/triage-keyboard';
import { fireUndoToast } from '../shared/undo-toast';
import { loadWorklistAction } from './actions/worklist.action';
import { WaitingOnRunnersSection } from './waiting-on-runners';
import { focusAfterReload, parseQueueKey } from './worklist-keys';
import { claimRow, itemRow, type QueueRowView } from './worklist-model';
import styles from './worklist-pane.module.scss';
import { WorklistRow } from './worklist-row';

const PAGE_SIZE = 25;
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
    t.kind === 'run' ? `run:${t.id}` : `claim:${t.id}`;

/**
 * Runs per board, when the unfiltered list holds every run in the queue.
 * A paged or capped list would undercount, so it gives none.
 */
function countBoards(page: WorklistPage): Map<number, number> | null {
    if (page.truncated || page.totalItems > page.items.length) return null;
    const counts = new Map<number, number>();
    const add = (categoryId: number) =>
        counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
    for (const i of page.items) add(i.categoryId);
    for (const b of page.batches) for (const i of b.items) add(i.categoryId);
    for (const c of page.selfClaims) add(c.categoryId);
    return counts;
}

interface Props {
    gameSlug: string;
    gameDisplay: string;
    /** canSeeBoards: the back link goes to the game page when false. */
    boardsVisible?: boolean;
    variables: VariableRow[];
    /** Live count for the sidebar badge. */
    onNeedsYouChange?: (count: number) => void;
}

export function WorklistPane(props: Props) {
    // The review target lives in the URL (useSearchParams), which needs a
    // Suspense boundary or the prerendered shell fails at build.
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
    gameDisplay,
    boardsVisible = false,
    variables,
    onNeedsYouChange,
}: Props) {
    const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
    const [page, setPage] = useState(1);
    const [data, setData] = useState<WorklistPage | null>(null);
    const [boardCounts, setBoardCounts] = useState<Map<number, number> | null>(
        null,
    );
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

    // A slow response for a filter or page the moderator already left must
    // not paint the current one. Each load takes a ticket; only the newest writes.
    const requestId = useRef(0);

    const load = () => {
        const ticket = ++requestId.current;
        startLoad(async () => {
            const res = await loadWorklistAction(gameSlug, {
                categoryId,
                page,
                pageSize: PAGE_SIZE,
            });
            if (ticket !== requestId.current) return;
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setError(null);
            setData(res.page);
            setNow(new Date());
            if (categoryId === undefined) setBoardCounts(countBoards(res.page));
            onNeedsYouChange?.(res.page.counts.needsYou);
        });
    };

    // load reads the current filter and page; the rule is off project-wide anyway
    useEffect(load, [gameSlug, categoryId, page]);

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
            if (doneChunks.length > 0) load();
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
            load,
        );
        load();
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
    const routine = routineItems
        .filter(
            (i, n) => routineItems.findIndex((x) => x.runId === i.runId) === n,
        )
        .map((i) => itemRow(i, variables));
    const routineRunIds = routine.flatMap((r) =>
        r.runId != null && r.pending ? [r.runId] : [],
    );

    const rows = [...needsYou, ...checkFirst, ...routine];
    const queueKeys = rows.map((r) => r.key);
    const at = target
        ? rows.findIndex((r) => sameTarget(r.target, target))
        : -1;

    const totalPages = data
        ? Math.max(1, Math.ceil(data.totalItems / PAGE_SIZE))
        : 1;
    const waitingCount = page === 1 ? (data?.waitingOnRunners.count ?? 0) : 0;

    const backLink = gameBackLink(
        { name: gameSlug, display: gameDisplay },
        boardsVisible,
    );

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
            if (e.repeat) return;
            const action = parseQueueKey(e);
            if (!action) return;
            const active = document.activeElement as HTMLElement | null;
            if (
                isTriageInert({
                    activeTag: active?.tagName ?? null,
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
                if (busy || !routine.some((r) => r.key === row.key)) return;
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

    const section = (
        title: string,
        count: number,
        list: QueueRowView[],
        bulk?: React.ReactNode,
    ) => (
        <section className={styles.section} aria-label={title}>
            <header className={styles.sectionHead}>
                <h3 className={styles.sectionTitle}>{title}</h3>
                <span className={styles.sectionCount}>
                    {count.toLocaleString()}
                </span>
                {bulk}
            </header>
            {list.length > 0 ? (
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
            ) : count === 0 ? (
                <p className={styles.none}>None</p>
            ) : null}
        </section>
    );

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
            <div className={consoleStyles.paneHeader}>
                <div>
                    <div className={consoleStyles.paneEyebrow}>Moderation</div>
                    <h2
                        className={`${consoleStyles.paneTitle} ${styles.title}`}
                    >
                        Queue
                        {data && (
                            <span className={consoleStyles.paneCount}>
                                {data.counts.needsYou.toLocaleString()}
                            </span>
                        )}
                    </h2>
                </div>
                <div className={consoleStyles.paneActions}>
                    {waitingCount > 0 && (
                        <a
                            href={`#${WAITING_ID}`}
                            className={styles.waitingLink}
                        >
                            {waitingCount.toLocaleString()} waiting on runners
                        </a>
                    )}
                    <BackLink {...backLink} />
                </div>
            </div>

            {(data?.boards.length ?? 0) > 1 && (
                <div className={styles.boards} role="group" aria-label="Board">
                    <button
                        type="button"
                        className={
                            categoryId === undefined
                                ? styles.boardPillActive
                                : styles.boardPill
                        }
                        aria-pressed={categoryId === undefined}
                        onClick={() => {
                            setPage(1);
                            setCategoryId(undefined);
                        }}
                    >
                        All boards
                    </button>
                    {data?.boards.map((b) => {
                        const count = boardCounts?.get(b.id) ?? null;
                        return (
                            <button
                                key={b.id}
                                type="button"
                                className={
                                    categoryId === b.id
                                        ? styles.boardPillActive
                                        : styles.boardPill
                                }
                                aria-pressed={categoryId === b.id}
                                onClick={() => {
                                    setPage(1);
                                    setCategoryId(b.id);
                                }}
                            >
                                {b.display}
                                {count != null && (
                                    <span className={styles.boardCount}>
                                        {count.toLocaleString()}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}
            {data?.truncated && (
                <div className="alert alert-warning" role="status">
                    More than 2,000 runs are waiting. This list shows the first
                    2,000; pick a board to see the rest.
                </div>
            )}

            {data ? (
                <div className={styles.list} aria-busy={isLoading}>
                    {section('Needs you', data.counts.tier1, needsYou)}
                    {section('Check first', data.counts.tier2, checkFirst)}
                    {section(
                        'Routine',
                        data.counts.tier3,
                        routine,
                        routineRunIds.length > 0 ? (
                            <button
                                type="button"
                                className={styles.bulk}
                                disabled={busy}
                                onClick={() => void verifyRuns(routineRunIds)}
                            >
                                {routineRunIds.length < data.counts.tier3
                                    ? 'Verify these'
                                    : 'Verify all'}{' '}
                                {routineRunIds.length.toLocaleString()}
                            </button>
                        ) : undefined,
                    )}

                    {page === 1 && (
                        <div id={WAITING_ID}>
                            <WaitingOnRunnersSection
                                gameSlug={gameSlug}
                                waiting={data.waitingOnRunners}
                                variables={variables}
                                onChanged={load}
                                onAccept={(run) =>
                                    browse({ kind: 'run', id: run.runId })
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
                        onClick={() => setPage((p) => p - 1)}
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
                        onClick={() => setPage((p) => p + 1)}
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

            <RunReviewModal
                gameSlug={gameSlug}
                target={target}
                position={
                    at >= 0 ? { index: at + 1, total: rows.length } : undefined
                }
                onPrev={at > 0 ? () => browse(rows[at - 1].target) : undefined}
                onNext={
                    at >= 0 && at < rows.length - 1
                        ? () => browse(rows[at + 1].target)
                        : undefined
                }
                onClose={() => browse(null)}
                onOpenRun={browse}
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
                    if (o.undo) fireUndoToast(o.message, o.undo, load);
                    else toast.success(o.message);
                    load();
                }}
            />
        </div>
    );
}
