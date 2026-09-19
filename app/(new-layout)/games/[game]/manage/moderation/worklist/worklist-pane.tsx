'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { CheckCircle } from 'react-bootstrap-icons';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import { gameBackLink } from '~src/lib/board-url';
import type {
    LeaderboardEntry,
    ResolvedCategory,
    ResolvedGroup,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import type {
    WorklistBatch,
    WorklistItem,
    WorklistPage,
    WorklistSelfClaim,
} from '../../../../../../../types/worklist.types';
import type { EmulatorPolicy } from '../../../rules/rules-panel';
import { BackLink } from '../../../shared/back-link';
import type { NavItemId } from '../../console/nav-model';
import { isTriageInert, moveSelection } from '../attention/triage-keyboard';
import { ModeratePanel } from '../moderate/moderate-panel';
import { type ModerateVerb, VERB_LABEL } from '../moderate/verbs';
import { applyVerdictsAction } from '../shared/actions/verdicts.action';
import { fireUndoToast } from '../shared/undo-toast';
import { loadWorklistAction } from './actions/worklist.action';
import { SelfClaimRow } from './self-claim-row';
import { WaitingOnRunnersSection, type WaitingRun } from './waiting-on-runners';
import { BatchHero, BatchRow } from './worklist-batch';
import { focusAfterReload, parseQueueKey } from './worklist-keys';
import {
    batchQueueKey,
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
    /** ResolvedCategory carries no gameId; the moderate modal needs it for
     * its `/v1/me/*` owner verbs. */
    gameId: number;
    gameDisplay: string;
    /** canSeeBoards: the back link goes to the game page when false. */
    boardsVisible?: boolean;
    categories: Array<{ id: number; display: string }>;
    boardCategories: ResolvedCategory[];
    variables: VariableRow[];
    /** Site-wide ban scope in the moderate modal. */
    canSiteBan: boolean;
    /** The game's own rules, for the retime column's inline rules. */
    gameRules?: string | null;
    emulatorPolicy?: EmulatorPolicy;
    /** Category groups, for a level board's own rules. */
    boardGroups?: ResolvedGroup[];

    /** Live count for the sidebar badge. */
    onNeedsYouChange?: (count: number) => void;
    /** Console pane switcher — "Decided runs" opens the old queue pane. */
    onNavigate: (id: NavItemId) => void;
}

/** A run waiting on its runner as a board row; the modal reads the rest. */
function waitingEntry(
    run: WaitingRun,
    primaryTiming: 'rt' | 'gt',
): LeaderboardEntry {
    return {
        runId: run.runId,
        rank: 0,
        runnerName: run.runnerName,
        userId: run.userId,
        isGuest: false,
        time: run.timeMs,
        realTime: primaryTiming === 'rt' ? run.timeMs : null,
        gameTime: primaryTiming === 'gt' ? run.timeMs : null,
        runDate: null,
        vodUrl: null,
        verificationStatus: 'pending',
        variables: null,
    };
}

/** A self-claimed time as a manual board row. */
function claimEntry(claim: WorklistSelfClaim): LeaderboardEntry {
    return {
        runId: null,
        manualTimeId: claim.manualTimeId,
        source: 'manual',
        rank: 0,
        runnerName: claim.runnerName,
        userId: claim.userId,
        isGuest: claim.isGuest,
        time: claim.timeMs,
        realTime: claim.timing === 'realtime' ? claim.timeMs : null,
        gameTime: claim.timing === 'gametime' ? claim.timeMs : null,
        runDate: claim.runDate,
        vodUrl: claim.evidenceUrl,
        verificationStatus: 'pending',
        variables: null,
    };
}

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
    boardsVisible = false,
    // `categories` stays in Props for the router but the picker lists only the
    // boards the worklist covers, which the backend returns with the list.
    boardCategories,
    variables,
    canSiteBan,
    gameRules,
    emulatorPolicy,
    boardGroups,
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
    const [now, setNow] = useState(() => new Date());
    const [inspectRunId, setInspectRunId] = useState<number | null>(null);
    // The verb the modal opens with (`d` on a row opens Decline). Spent on
    // the run it was opened for; stepping to another run clears it.
    const [inspectVerb, setInspectVerb] = useState<ModerateVerb | undefined>(
        undefined,
    );
    // A run waiting on its runner, opened on Approve ("Accept without waiting").
    const [waitingRunId, setWaitingRunId] = useState<number | null>(null);
    // A runner's self-claimed time, opened from its row.
    const [claimId, setClaimId] = useState<number | null>(null);
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
            `${VERB_LABEL.approve}: ${item.runnerName}`,
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
            `${VERB_LABEL.approve}: ${affectedRunCount} ${affectedRunCount === 1 ? 'run' : 'runs'}`,
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

    const backLink = gameBackLink(
        { name: gameSlug, display: gameDisplay },
        boardsVisible,
    );

    // The order rows render in: urgent tiers, the hero batch, runner batches,
    // then the routine rows that didn't group. The modal's prev/next walks
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

    const openInspector = (item: WorklistItem, verb?: ModerateVerb) => {
        if (!inspectorBoard(item, boardCategories)) {
            setError(
                "This run's board isn't in this console's list. Open it from the run page.",
            );
            return;
        }
        setInspectVerb(verb);
        setInspectRunId(item.runId);
    };
    const stepInspector = (runId: number) => {
        setInspectVerb(undefined);
        setInspectRunId(runId);
    };
    const closeInspector = () => {
        setInspectVerb(undefined);
        setInspectRunId(null);
    };

    // After the list reloads under the modal (the open run decided away),
    // stay on the run if it is still listed, else take the next run that
    // survived, else the one before it, else close. Worked out during render
    // so the modal never renders without a run while one survives.
    const runOrderSignature = displayOrder.map((i) => i.runId).join('|');
    const [seenRunOrder, setSeenRunOrder] = useState<{
        signature: string;
        runIds: number[];
    }>({ signature: '', runIds: [] });
    if (seenRunOrder.signature !== runOrderSignature) {
        const next = displayOrder.map((i) => i.runId);
        setSeenRunOrder({ signature: runOrderSignature, runIds: next });
        if (inspectRunId !== null && !next.includes(inspectRunId)) {
            const previous = seenRunOrder.runIds;
            const survivors = new Set(next);
            const at = previous.indexOf(inspectRunId);
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
            // The open run left the queue: it was decided.
            setDecided((d) => d + 1);
            setInspectVerb(undefined);
            setInspectRunId(landing);
        }
    }

    // The waiting run leaves the list once it is accepted: close.
    const waitingRun =
        waitingRunId === null
            ? null
            : (data?.waitingOnRunners.items.find(
                  (w) => w.runId === waitingRunId,
              ) ?? null);
    const waitingCategory = waitingRun
        ? (boardCategories.find((c) => c.id === waitingRun.categoryId) ?? null)
        : null;
    if (waitingRunId !== null && data && !waitingRun) {
        setWaitingRunId(null);
    }
    // The claim leaves the list once it has a verdict: close.
    const openClaim =
        claimId === null
            ? null
            : (selfClaims.find((c) => c.manualTimeId === claimId) ?? null);
    const claimCategory = openClaim
        ? (boardCategories.find((c) => c.id === openClaim.categoryId) ?? null)
        : null;
    if (claimId !== null && data && !openClaim) {
        // The open claim left the queue: it was decided.
        setDecided((d) => d + 1);
        setClaimId(null);
    }
    const moderateClaim = (claim: WorklistSelfClaim) => {
        if (!boardCategories.some((c) => c.id === claim.categoryId)) {
            setError(
                "This claim's board isn't in this console's list. Open it from the board.",
            );
            return;
        }
        setClaimId(claim.manualTimeId);
    };

    const openWaiting = (run: WaitingRun) => {
        if (!boardCategories.some((c) => c.id === run.categoryId)) {
            setError(
                "This run's board isn't in this console's list. Open it from the run page.",
            );
            return;
        }
        setWaitingRunId(run.runId);
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
            // The open modal owns the keyboard.
            if (
                inspectRunId !== null ||
                waitingRunId !== null ||
                claimId !== null
            )
                return;
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
                openInspector(item, 'decline');
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
        onInspect: (item: WorklistItem) => openInspector(item),
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
                            variables={variables}
                            now={now}
                            focused={focusKey === claimQueueKey(claim)}
                            onModerate={moderateClaim}
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
                    <BackLink {...backLink} />
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
                        <kbd className={styles.kbd}>a</kbd> approve
                    </li>
                    <li>
                        <kbd className={styles.kbd}>d</kbd> decline
                    </li>
                    <li>
                        <kbd className={styles.kbd}>⇧A</kbd> approve a group
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
                        onAccept={openWaiting}
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

            {openClaim && claimCategory && (
                <ModeratePanel
                    subject={{
                        kind: 'run',
                        entry: claimEntry(openClaim),
                        board: {
                            categoryId: claimCategory.id,
                            categorySlug: claimCategory.name,
                            categoryDisplay: claimCategory.display,
                            subcategoryKey: openClaim.subcategoryKey,
                            primaryTiming: claimCategory.primaryTiming,
                        },
                    }}
                    context={{
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
                    }}
                    mount="modal"
                    onClose={() => setClaimId(null)}
                    onMutated={load}
                />
            )}

            {waitingRun && waitingCategory && (
                <ModeratePanel
                    subject={{
                        kind: 'run',
                        entry: waitingEntry(
                            waitingRun,
                            waitingCategory.primaryTiming,
                        ),
                        board: {
                            categoryId: waitingCategory.id,
                            categorySlug: waitingCategory.name,
                            categoryDisplay: waitingCategory.display,
                            subcategoryKey: waitingRun.subcategoryKey,
                            primaryTiming: waitingCategory.primaryTiming,
                        },
                    }}
                    context={{
                        gameSlug,
                        gameId,
                        gameDisplay,
                        categories: boardCategories,
                        variables,
                        canSiteBan,
                        boardsVisible,
                    }}
                    mount="modal"
                    initialVerb="approve"
                    initialVerbReason="Accepted without waiting for the runner"
                    onClose={() => setWaitingRunId(null)}
                    onMutated={load}
                />
            )}

            {inspectItem && inspectContext && (
                <ModeratePanel
                    subject={{
                        kind: 'run',
                        entry: toInspectorEntry(inspectItem),
                        board: {
                            categoryId: inspectContext.category.id,
                            categorySlug: inspectContext.category.name,
                            categoryDisplay: inspectContext.category.display,
                            subcategoryKey: inspectItem.subcategoryKey,
                            primaryTiming: inspectContext.primaryTiming,
                        },
                    }}
                    context={{
                        gameSlug,
                        gameId,
                        gameDisplay,
                        categories: boardCategories,
                        variables,
                        canSiteBan,
                        boardsVisible,
                    }}
                    mount="modal"
                    initialVerb={inspectVerb}
                    position={{
                        index: inspectIndex + 1,
                        total: displayOrder.length,
                    }}
                    onClose={closeInspector}
                    onMutated={() => {
                        setInspectVerb(undefined);
                        load();
                    }}
                    onPrev={
                        inspectIndex > 0
                            ? () =>
                                  stepInspector(
                                      displayOrder[inspectIndex - 1].runId,
                                  )
                            : undefined
                    }
                    onNext={
                        inspectIndex < displayOrder.length - 1
                            ? () =>
                                  stepInspector(
                                      displayOrder[inspectIndex + 1].runId,
                                  )
                            : undefined
                    }
                />
            )}
        </div>
    );
}
