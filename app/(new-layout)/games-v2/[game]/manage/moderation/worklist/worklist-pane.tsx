'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { CheckCircle } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import type {
    WorklistBatch,
    WorklistItem,
    WorklistPage,
} from '../../../../../../../types/worklist.types';
import { HideIdentityDialog } from '../../../leaderboard/hide-identity-dialog';
import { RunInspector } from '../../../leaderboard/run-inspector';
import { BackLink } from '../../../shared/back-link';
import { subcategoryVariablesFor } from '../../boards/subcategory-bands';
import type { NavItemId } from '../../console/nav-model';
import { isTriageInert, moveSelection } from '../attention/triage-keyboard';
import type { ModVerb, RunActionTarget } from '../shared/action-model';
import { applyVerdictsAction } from '../shared/actions/verdicts.action';
import { RunActionDialog } from '../shared/run-action-dialog';
import { fireUndoToast } from '../shared/undo-toast';
import {
    loadWorklistAction,
    requestVideoAction,
} from './actions/worklist.action';
import { SelfClaimRow } from './self-claim-row';
import { WaitingOnRunnersSection } from './waiting-on-runners';
import { BatchHero, BatchRow } from './worklist-batch';
import { focusAfterReload, parseQueueKey } from './worklist-keys';
import {
    batchQueueKey,
    boardLabel,
    claimQueueKey,
    inspectorBoard,
    runQueueKey,
    TIER_TITLE,
    toInspectorEntry,
} from './worklist-model';
import styles from './worklist-pane.module.scss';
import { WorklistRow } from './worklist-row';
import { WorklistStatus } from './worklist-status';

const PAGE_SIZE = 25;
const APPROVE_REASON = 'Approved. No issues found.';
const UNDO_APPROVE_REASON = 'Undo of an approval from the worklist';
/** `/verdicts` accepts up to 500 run ids per call. */
const VERDICT_CHUNK_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size)
        out.push(items.slice(i, i + size));
    return out;
}

interface Props {
    gameSlug: string;
    /** ResolvedCategory carries no gameId; the inspector needs it for its
     * `/v1/me/*` owner verbs. */
    gameId: number;
    gameDisplay: string;
    categories: Array<{ id: number; display: string }>;
    boardCategories: ResolvedCategory[];
    variables: VariableRow[];
    /** Live count for the sidebar badge. */
    onNeedsYouChange?: (count: number) => void;
    /** Console pane switcher — "Decided runs" opens the old queue pane. */
    onNavigate: (id: NavItemId) => void;
}

type Dialog =
    | { kind: 'action'; verb: ModVerb; target: RunActionTarget }
    | { kind: 'hide'; item: WorklistItem };

const targetFor = (
    item: WorklistItem,
    variables: VariableRow[],
): RunActionTarget => ({
    kind: 'runs',
    runIds: [item.runId],
    label: `${item.runnerName} · ${boardLabel(item, variables)}`,
    runTimeMs:
        item.primaryTiming === 'gametime' && item.gameTime !== null
            ? item.gameTime
            : item.time,
    runDate: item.endedAt,
    runner:
        item.userId !== null
            ? {
                  id: item.userId,
                  name: item.runnerName,
                  categoryId: item.categoryId,
                  categoryDisplay: item.categoryDisplay,
                  subcategoryKey: item.subcategoryKey,
                  primaryTiming:
                      item.primaryTiming === 'gametime' ? 'gt' : 'rt',
              }
            : undefined,
});

/** A section heading with the tier's swatch; an empty urgent tier says so. */
function SectionHead({
    title,
    tier,
    count,
}: {
    title: string;
    tier: 1 | 2 | 3 | null;
    count: number;
}) {
    return (
        <header
            className={styles.sectionHead}
            data-tier={tier ?? undefined}
            data-empty={count === 0 || undefined}
        >
            <h3 className={styles.sectionTitle}>{title}</h3>
            {count === 0 ? (
                <span className={styles.sectionClear}>
                    <CheckCircle aria-hidden /> None
                </span>
            ) : (
                <span className={styles.sectionCount}>
                    {count.toLocaleString()}
                </span>
            )}
        </header>
    );
}

export function WorklistPane({
    gameSlug,
    gameId,
    gameDisplay,
    // `categories` stays in Props for the router but the picker lists only the
    // boards the worklist covers, which the backend returns with the list.
    boardCategories,
    variables,
    onNeedsYouChange,
    onNavigate,
}: Props) {
    const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
    const [page, setPage] = useState(1);
    const [data, setData] = useState<WorklistPage | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, startLoad] = useTransition();
    const [busyRunId, setBusyRunId] = useState<number | null>(null);
    const [busyBatchKey, setBusyBatchKey] = useState<string | null>(null);
    const [dialog, setDialog] = useState<Dialog | null>(null);
    const [now, setNow] = useState(() => new Date());
    const [inspectRunId, setInspectRunId] = useState<number | null>(null);
    const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
    // Verdicts given since the pane opened. Undo takes them back off.
    const [decided, setDecided] = useState(0);
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
            onNeedsYouChange?.(res.page.counts.needsYou);
        });
    };

    // load reads the current filter and page; the rule is off project-wide anyway
    useEffect(load, [gameSlug, categoryId, page]);

    const bumpDecided = (n: number) => setDecided((d) => Math.max(0, d + n));

    const approve = async (item: WorklistItem) => {
        setBusyRunId(item.runId);
        const res = await applyVerdictsAction(
            gameSlug,
            'verify',
            [item.runId],
            APPROVE_REASON,
        );
        setBusyRunId(null);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        bumpDecided(1);
        fireUndoToast(
            `Approved ${item.runnerName}'s run.`,
            () =>
                applyVerdictsAction(
                    gameSlug,
                    'unverify',
                    [item.runId],
                    UNDO_APPROVE_REASON,
                ),
            () => {
                bumpDecided(-1);
                load();
            },
        );
        load();
    };

    const requestVideo = async (item: WorklistItem) => {
        setBusyRunId(item.runId);
        const res = await requestVideoAction(gameSlug, [item.runId]);
        setBusyRunId(null);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        if (res.count > 0) {
            bumpDecided(1);
            toast.success(
                `Asked ${item.runnerName} for a video. The run is off the board until they add one.`,
            );
        } else
            toast.info(
                'Nothing changed. The run already has a video, is no longer pending, or is already off the board.',
            );
        load();
    };

    // A batch approves in one click, chunked so no single call exceeds the
    // verdict endpoint's 500-id cap. Stops on the first failing chunk; undo
    // only unverifies the chunks that actually went through.
    const approveBatch = async (batch: WorklistBatch) => {
        setBusyBatchKey(batch.key);
        const chunks = chunk(batch.runIds, VERDICT_CHUNK_SIZE);
        const doneChunks: number[][] = [];
        let affectedRunCount = 0;
        let failure: string | null = null;
        for (const runIds of chunks) {
            const res = await applyVerdictsAction(
                gameSlug,
                'verify',
                runIds,
                APPROVE_REASON,
            );
            if ('error' in res) {
                failure = res.error;
                break;
            }
            affectedRunCount += res.result.affectedRunCount;
            doneChunks.push(runIds);
        }
        setBusyBatchKey(null);
        bumpDecided(affectedRunCount);
        if (failure) {
            setError(failure);
            if (doneChunks.length > 0) load();
            return;
        }
        fireUndoToast(
            `Approved ${affectedRunCount} runs.`,
            async () => {
                for (const runIds of doneChunks) {
                    const res = await applyVerdictsAction(
                        gameSlug,
                        'unverify',
                        runIds,
                        UNDO_APPROVE_REASON,
                    );
                    if ('error' in res) return res;
                }
                return { ok: true };
            },
            () => {
                bumpDecided(-affectedRunCount);
                load();
            },
        );
        load();
    };

    const toggleBatch = (batch: WorklistBatch) =>
        setExpanded((cur) => {
            const next = new Set(cur);
            if (next.has(batch.key)) next.delete(batch.key);
            else next.add(batch.key);
            return next;
        });

    const items = data?.items ?? [];
    const batches = data?.batches ?? [];
    const hero = batches.find((b) => b.kind === 'known_runner') ?? null;
    const runnerBatches = batches.filter((b) => b !== hero);
    const selfClaims = page === 1 ? (data?.selfClaims ?? []) : [];
    const tierItems = (tier: 1 | 2 | 3) => items.filter((i) => i.tier === tier);
    const totalPages = data
        ? Math.max(1, Math.ceil(data.totalItems / PAGE_SIZE))
        : 1;
    const nothing = data !== null && data.counts.needsYou === 0;

    const boardHref = `/games-v2/${encodeURIComponent(gameSlug)}`;

    // The order rows render in: urgent tiers, the hero batch, runner batches,
    // then the routine rows that didn't group. The inspector's prev/next walks
    // the runs; the keyboard walks everything, batches included.
    const orderedBatches = hero ? [hero, ...runnerBatches] : runnerBatches;
    const displayOrder: WorklistItem[] = [
        ...tierItems(1),
        ...tierItems(2),
        ...orderedBatches.flatMap((b) => b.items),
        ...tierItems(3),
    ];
    const queueKeys: string[] = [
        ...tierItems(1).map(runQueueKey),
        ...selfClaims.map(claimQueueKey),
        ...tierItems(2).map(runQueueKey),
        ...orderedBatches.flatMap((b) => [
            batchQueueKey(b),
            ...(expanded.has(b.key) ? b.items.map(runQueueKey) : []),
        ]),
        ...tierItems(3).map(runQueueKey),
    ];

    const inspectIndex =
        inspectRunId === null
            ? -1
            : displayOrder.findIndex((i) => i.runId === inspectRunId);
    const inspectItem = inspectIndex >= 0 ? displayOrder[inspectIndex] : null;
    const inspectContext = inspectItem
        ? inspectorBoard(inspectItem, boardCategories)
        : null;

    const openInspector = (item: WorklistItem) => {
        if (!inspectorBoard(item, boardCategories)) {
            setError(
                "This run's board isn't in this console's list. Open it from the run page.",
            );
            return;
        }
        setInspectRunId(item.runId);
    };

    // When the list reloads under the keyboard (a run approved away), land on
    // the row that took its place instead of dropping the position.
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
            const action = parseQueueKey(e);
            if (!action) return;
            const active = document.activeElement as HTMLElement | null;
            if (
                isTriageInert({
                    activeTag: active?.tagName ?? null,
                    isContentEditable: !!active?.isContentEditable,
                    dialogOpen: dialog !== null || inspectRunId !== null,
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

            const [kind, id] = [
                focusKey.slice(0, focusKey.indexOf(':')),
                focusKey.slice(focusKey.indexOf(':') + 1),
            ];
            const batch =
                kind === 'batch'
                    ? (batches.find((b) => b.key === id) ?? null)
                    : null;
            const item =
                kind === 'run'
                    ? (displayOrder.find((i) => i.runId === Number(id)) ?? null)
                    : null;

            // Enter on a focused control belongs to that control.
            if (
                action === 'open' &&
                active &&
                active.dataset.queueKey === undefined &&
                (active.tagName === 'BUTTON' || active.tagName === 'A')
            )
                return;

            keyboardDriven.current = true;
            if (action === 'open') {
                if (batch) {
                    e.preventDefault();
                    toggleBatch(batch);
                } else if (item) {
                    e.preventDefault();
                    openInspector(item);
                }
                return;
            }
            if (action === 'approveGroup') {
                if (batch && busyBatchKey === null) {
                    e.preventDefault();
                    void approveBatch(batch);
                }
                return;
            }
            if (!item) return;
            if (action === 'approve') {
                if (
                    busyRunId !== null ||
                    item.verificationStatus === 'verified'
                )
                    return;
                e.preventDefault();
                void approve(item);
            } else if (action === 'decline') {
                e.preventDefault();
                setDialog({
                    kind: 'action',
                    verb: 'reject',
                    target: targetFor(item, variables),
                });
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    });

    // Clicking or tabbing into a row puts the keyboard there too.
    const followPointer = (target: EventTarget) => {
        const row = (target as HTMLElement).closest?.<HTMLElement>(
            '[data-queue-key]',
        );
        if (row?.dataset.queueKey) setFocusKey(row.dataset.queueKey);
    };

    const rowHandlers = {
        onApprove: approve,
        onVerb: (it: WorklistItem, verb: ModVerb) =>
            setDialog({
                kind: 'action',
                verb,
                target: targetFor(it, variables),
            }),
        onHideIdentity: (it: WorklistItem) =>
            setDialog({ kind: 'hide', item: it }),
        onInspect: openInspector,
        onRequestVideo: requestVideo,
    };

    const renderRun = (item: WorklistItem) => (
        <WorklistRow
            key={item.runId}
            item={item}
            variables={variables}
            now={now}
            busy={busyRunId === item.runId}
            focused={focusKey === runQueueKey(item)}
            {...rowHandlers}
        />
    );

    const batchProps = (batch: WorklistBatch) => ({
        batch,
        variables,
        now,
        busy: busyBatchKey === batch.key,
        expanded: expanded.has(batch.key),
        focusedKey: focusKey,
        onToggle: toggleBatch,
        onApproveAll: approveBatch,
        ...rowHandlers,
    });

    const urgentTier = (tier: 1 | 2) => {
        if (!data || nothing) return null;
        const inTier = tierItems(tier);
        const claims = tier === 1 ? selfClaims : [];
        const count = data.counts[`tier${tier}`];
        // A tier with runs on other pages shows nothing here; an empty tier
        // still shows its heading on page 1, so its absence reads as news.
        if (inTier.length === 0 && claims.length === 0)
            return count === 0 && page === 1 ? (
                <section className={styles.section}>
                    <SectionHead
                        title={TIER_TITLE[tier]}
                        tier={tier}
                        count={0}
                    />
                </section>
            ) : null;
        return (
            <section className={styles.section}>
                <SectionHead
                    title={TIER_TITLE[tier]}
                    tier={tier}
                    count={count}
                />
                <ul className={styles.rows}>
                    {inTier.map(renderRun)}
                    {claims.map((claim) => (
                        <SelfClaimRow
                            key={claimQueueKey(claim)}
                            claim={claim}
                            gameSlug={gameSlug}
                            variables={variables}
                            now={now}
                            focused={focusKey === claimQueueKey(claim)}
                            onDone={() => {
                                bumpDecided(1);
                                load();
                            }}
                        />
                    ))}
                </ul>
            </section>
        );
    };

    const routine = tierItems(3);

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
                    <div className={consoleStyles.paneEyebrow}>Queue</div>
                    <h2 className={consoleStyles.paneTitle}>Mod queue</h2>
                </div>
                <div className={consoleStyles.paneActions}>
                    <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => onNavigate('queue-history')}
                    >
                        Decided runs
                    </button>
                    <BackLink href={boardHref} label="Back to leaderboard" />
                </div>
            </div>

            <div className={styles.toolbar}>
                <select
                    className={`form-select form-select-sm ${styles.boardSelect}`}
                    aria-label="Board"
                    value={categoryId ?? ''}
                    onChange={(e) => {
                        setPage(1);
                        setCategoryId(
                            e.target.value === ''
                                ? undefined
                                : Number(e.target.value),
                        );
                    }}
                >
                    <option value="">All boards</option>
                    {(data?.boards ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.display}
                        </option>
                    ))}
                </select>
                <ul className={styles.keys} aria-label="Keyboard shortcuts">
                    <li>
                        <kbd className={styles.kbd}>j</kbd>
                        <kbd className={styles.kbd}>k</kbd> move
                    </li>
                    <li>
                        <kbd className={styles.kbd}>Enter</kbd> open
                    </li>
                    <li>
                        <kbd className={styles.kbd}>v</kbd> approve
                    </li>
                    <li>
                        <kbd className={styles.kbd}>d</kbd> decline
                    </li>
                    <li>
                        <kbd className={styles.kbd}>⇧V</kbd> approve a group
                    </li>
                </ul>
            </div>

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
                <WorklistStatus page={data} decided={decided} />
            ) : (
                !error && <div className={styles.skeleton} aria-busy />
            )}

            <div className={styles.list} aria-busy={isLoading}>
                {urgentTier(1)}
                {urgentTier(2)}

                {hero && (
                    <section className={styles.section}>
                        <BatchHero {...batchProps(hero)} />
                    </section>
                )}

                {runnerBatches.length > 0 && (
                    <section className={styles.section}>
                        <SectionHead
                            title="Grouped by runner"
                            tier={3}
                            count={runnerBatches.reduce(
                                (n, b) => n + b.runIds.length,
                                0,
                            )}
                        />
                        <ul className={styles.rows}>
                            {runnerBatches.map((batch) => (
                                <BatchRow
                                    key={batch.key}
                                    {...batchProps(batch)}
                                />
                            ))}
                        </ul>
                    </section>
                )}

                {routine.length > 0 && (
                    <section className={styles.section}>
                        <SectionHead
                            title={TIER_TITLE[3]}
                            tier={3}
                            count={routine.length}
                        />
                        <ul className={styles.rows}>
                            {routine.map(renderRun)}
                        </ul>
                    </section>
                )}

                {data && page === 1 && (
                    <WaitingOnRunnersSection
                        gameSlug={gameSlug}
                        waiting={data.waitingOnRunners}
                        variables={variables}
                        onChanged={load}
                    />
                )}
            </div>

            {data && totalPages > 1 && (
                <nav className={styles.pager} aria-label="Worklist pages">
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

            {dialog?.kind === 'action' && (
                <RunActionDialog
                    gameSlug={gameSlug}
                    verb={dialog.verb}
                    target={dialog.target}
                    defaultBanScope={
                        dialog.verb === 'ban' ? 'category' : undefined
                    }
                    onDone={() => {
                        // Every target this pane opens is one run.
                        bumpDecided(1);
                        setDialog(null);
                        load();
                    }}
                    onClose={() => setDialog(null)}
                    onUndoComplete={() => {
                        bumpDecided(-1);
                        load();
                    }}
                />
            )}
            {dialog?.kind === 'hide' && dialog.item.userId !== null && (
                <HideIdentityDialog
                    open
                    onClose={() => setDialog(null)}
                    onDone={() => {
                        setDialog(null);
                        load();
                    }}
                    gameSlug={gameSlug}
                    gameDisplay={gameDisplay}
                    runnerName={dialog.item.runnerName}
                    runId={dialog.item.runId}
                    userId={dialog.item.userId}
                    categoryId={dialog.item.categoryId}
                    categoryDisplay={dialog.item.categoryDisplay}
                    subcategoryKey={dialog.item.subcategoryKey}
                />
            )}
            {inspectItem && inspectContext && (
                <RunInspector
                    entry={toInspectorEntry(inspectItem)}
                    gameSlug={gameSlug}
                    gameId={gameId}
                    gameDisplay={gameDisplay}
                    categorySlug={inspectContext.category.name}
                    categoryDisplay={inspectContext.category.display}
                    categoryId={inspectContext.category.id}
                    requireVideo={inspectContext.category.requireVideo}
                    primaryTiming={inspectContext.primaryTiming}
                    rtaFallback={inspectContext.category.rtaFallback}
                    subcategoryDefKeys={subcategoryVariablesFor(
                        inspectContext.category.id,
                        variables,
                    ).map((v) => v.nameNormalized)}
                    gameTimeLabel={inspectContext.category.gameTimeLabel}
                    showMilliseconds={
                        inspectContext.category.showMilliseconds ?? true
                    }
                    onClose={() => setInspectRunId(null)}
                    onMutated={load}
                    onPrev={
                        inspectIndex > 0
                            ? () =>
                                  setInspectRunId(
                                      displayOrder[inspectIndex - 1].runId,
                                  )
                            : undefined
                    }
                    onNext={
                        inspectIndex < displayOrder.length - 1
                            ? () =>
                                  setInspectRunId(
                                      displayOrder[inspectIndex + 1].runId,
                                  )
                            : undefined
                    }
                />
            )}
        </div>
    );
}
