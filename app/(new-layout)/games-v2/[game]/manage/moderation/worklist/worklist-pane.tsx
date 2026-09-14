'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
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
import type { ModVerb, RunActionTarget } from '../shared/action-model';
import { applyVerdictsAction } from '../shared/actions/verdicts.action';
import { RunActionDialog } from '../shared/run-action-dialog';
import { fireUndoToast } from '../shared/undo-toast';
import {
    dismissTrustAction,
    grantTrustAction,
    loadTrustStateAction,
    loadWorklistAction,
} from './actions/worklist.action';
import { SelfClaimRow } from './self-claim-row';
import { type TrustCandidate, TrustPrompt } from './trust-prompt';
import { WorklistBatchCard } from './worklist-batch';
import {
    boardLabel,
    inspectorBoard,
    TIER_COUNT_LABEL,
    TIER_TITLE,
    toInspectorEntry,
} from './worklist-model';
import styles from './worklist-pane.module.scss';
import { WorklistRow } from './worklist-row';

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
    const [trustCandidate, setTrustCandidate] = useState<TrustCandidate | null>(
        null,
    );
    const [trustBusy, setTrustBusy] = useState(false);

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

    // Asks the backend whether this runner has earned a trust offer — two
    // approvals with no decline in between, not already trusted, not
    // dismissed before. Never blocks the approval itself.
    const maybeOfferTrust = async (item: WorklistItem) => {
        if (item.userId === null || item.isGuest || item.trackRecord?.trusted)
            return;
        const res = await loadTrustStateAction(gameSlug, item.userId);
        if ('error' in res || !res.trust.trustOffer) return;
        setTrustCandidate({
            userId: item.userId,
            runnerName: item.runnerName,
            categoryId: item.categoryId,
            categoryDisplay: item.categoryDisplay,
        });
    };

    const settleTrust = async (
        op: () => Promise<{ ok: true } | { error: string }>,
        message: string,
    ) => {
        setTrustBusy(true);
        const res = await op();
        setTrustBusy(false);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        toast.success(message);
        setTrustCandidate(null);
        load();
    };

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
        fireUndoToast(
            `Approved ${item.runnerName}'s run.`,
            () =>
                applyVerdictsAction(
                    gameSlug,
                    'unverify',
                    [item.runId],
                    UNDO_APPROVE_REASON,
                ),
            load,
        );
        load();
        void maybeOfferTrust(item);
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
            load,
        );
        load();
        if (batch.items.every((i) => i.userId === batch.items[0]?.userId)) {
            const [first] = batch.items;
            if (first) void maybeOfferTrust(first);
        }
    };

    const items = data?.items ?? [];
    const totalPages = data
        ? Math.max(1, Math.ceil(data.totalItems / PAGE_SIZE))
        : 1;
    const nothing = data !== null && data.counts.needsYou === 0;

    const boardHref = `/games-v2/${encodeURIComponent(gameSlug)}`;

    // The order the moderator sees: batch members first (Task 6 renders them
    // above the tiers), then the tiered rows. Prev/next in the inspector walks this.
    const displayOrder: WorklistItem[] = [
        ...(data?.batches.flatMap((b) => b.items) ?? []),
        ...items,
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

    return (
        <div className={consoleStyles.surface}>
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
            <p className={consoleStyles.paneLede}>
                Runs that need a decision from you, most urgent first. Reports
                and appeals come first, then runs where a wrong call would show
                on the board, then everything routine.
            </p>

            {trustCandidate && (
                <TrustPrompt
                    runner={trustCandidate}
                    busy={trustBusy}
                    onYes={() =>
                        settleTrust(
                            () =>
                                grantTrustAction(
                                    gameSlug,
                                    trustCandidate.userId,
                                    null,
                                ),
                            `${trustCandidate.runnerName}'s runs on this game are now accepted automatically.`,
                        )
                    }
                    onOnlyBoard={() =>
                        settleTrust(
                            () =>
                                grantTrustAction(
                                    gameSlug,
                                    trustCandidate.userId,
                                    trustCandidate.categoryId,
                                ),
                            `${trustCandidate.runnerName}'s runs on ${trustCandidate.categoryDisplay} are now accepted automatically.`,
                        )
                    }
                    onNo={() =>
                        settleTrust(
                            () =>
                                dismissTrustAction(
                                    gameSlug,
                                    trustCandidate.userId,
                                ),
                            `Won't ask about ${trustCandidate.runnerName} again.`,
                        )
                    }
                    onLater={() => setTrustCandidate(null)}
                />
            )}

            <div className={styles.toolbar}>
                <label className={styles.boardPicker}>
                    <span>Board</span>
                    <select
                        className="form-select form-select-sm"
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
                </label>
                {data && (
                    <div className={styles.counts} aria-live="polite">
                        <span>
                            <strong>{data.counts.needsYou}</strong> need you
                        </span>
                        <span>
                            {data.counts.tier1} {TIER_COUNT_LABEL[1]}
                        </span>
                        <span>
                            {data.counts.tier2} {TIER_COUNT_LABEL[2]}
                        </span>
                        <span>
                            {data.counts.tier3} {TIER_COUNT_LABEL[3]}
                        </span>
                    </div>
                )}
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

            {nothing && <p className={styles.empty}>Nothing needs you.</p>}

            {data && data.batches.length > 0 && (
                <section className={styles.tier}>
                    <h3 className={styles.tierTitle}>Routine, grouped</h3>
                    {data.batches.map((batch) => (
                        <WorklistBatchCard
                            variables={variables}
                            key={batch.key}
                            batch={batch}
                            now={now}
                            busy={busyBatchKey === batch.key}
                            onApproveAll={approveBatch}
                            onApprove={approve}
                            onVerb={(it, verb) =>
                                setDialog({
                                    kind: 'action',
                                    verb,
                                    target: targetFor(it, variables),
                                })
                            }
                            onHideIdentity={(it) =>
                                setDialog({ kind: 'hide', item: it })
                            }
                            onInspect={openInspector}
                        />
                    ))}
                </section>
            )}

            {([1, 2, 3] as const).map((tier) => {
                const inTier = items.filter((i) => i.tier === tier);
                // Self-claims are tier 1 but not paged: they show on page 1 only.
                const claims =
                    tier === 1 && page === 1 ? (data?.selfClaims ?? []) : [];
                if (inTier.length === 0 && claims.length === 0) return null;
                return (
                    <section
                        key={tier}
                        className={styles.tier}
                        aria-busy={isLoading}
                    >
                        <h3 className={styles.tierTitle}>{TIER_TITLE[tier]}</h3>
                        <ul className={styles.rows}>
                            {inTier.map((item) => (
                                <WorklistRow
                                    variables={variables}
                                    key={item.runId}
                                    item={item}
                                    now={now}
                                    busy={busyRunId === item.runId}
                                    onApprove={approve}
                                    onVerb={(it, verb) =>
                                        setDialog({
                                            kind: 'action',
                                            verb,
                                            target: targetFor(it, variables),
                                        })
                                    }
                                    onHideIdentity={(it) =>
                                        setDialog({ kind: 'hide', item: it })
                                    }
                                    onInspect={openInspector}
                                />
                            ))}
                            {claims.map((claim) => (
                                <SelfClaimRow
                                    key={`claim:${claim.manualTimeId}`}
                                    claim={claim}
                                    gameSlug={gameSlug}
                                    variables={variables}
                                    now={now}
                                    onDone={load}
                                />
                            ))}
                        </ul>
                    </section>
                );
            })}

            {data && totalPages > 1 && (
                <nav className={styles.pager} aria-label="Worklist pages">
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
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
                        className="btn btn-sm btn-outline-secondary"
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
                        setDialog(null);
                        load();
                    }}
                    onClose={() => setDialog(null)}
                    onUndoComplete={load}
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
