'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import type {
    WorklistItem,
    WorklistPage,
} from '../../../../../../../types/worklist.types';
import { HideIdentityDialog } from '../../../leaderboard/hide-identity-dialog';
import { BackLink } from '../../../shared/back-link';
import type { NavItemId } from '../../console/nav-model';
import type { ModVerb, RunActionTarget } from '../shared/action-model';
import { applyVerdictsAction } from '../shared/actions/verdicts.action';
import { RunActionDialog } from '../shared/run-action-dialog';
import { fireUndoToast } from '../shared/undo-toast';
import { loadWorklistAction } from './actions/worklist.action';
import { TIER_TITLE } from './worklist-model';
import styles from './worklist-pane.module.scss';
import { WorklistRow } from './worklist-row';

const PAGE_SIZE = 25;
const APPROVE_REASON = 'Approved. No issues found.';
const UNDO_APPROVE_REASON = 'Undo of an approval from the worklist';

interface Props {
    gameSlug: string;
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

const targetFor = (item: WorklistItem): RunActionTarget => ({
    kind: 'runs',
    runIds: [item.runId],
    label: `${item.runnerName} · ${item.categoryDisplay}`,
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
    gameDisplay,
    categories,
    boardCategories: _boardCategories,
    variables: _variables,
    onNeedsYouChange,
    onNavigate,
}: Props) {
    const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
    const [page, setPage] = useState(1);
    const [data, setData] = useState<WorklistPage | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, startLoad] = useTransition();
    const [busyRunId, setBusyRunId] = useState<number | null>(null);
    const [dialog, setDialog] = useState<Dialog | null>(null);
    const [now, setNow] = useState(() => new Date());

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
    };

    const items = data?.items ?? [];
    const totalPages = data
        ? Math.max(1, Math.ceil(data.totalItems / PAGE_SIZE))
        : 1;
    const nothing = data !== null && data.counts.needsYou === 0;

    const boardHref = `/games-v2/${encodeURIComponent(gameSlug)}`;

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
                        {categories.map((c) => (
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
                        <span>{data.counts.tier1} reports and appeals</span>
                        <span>{data.counts.tier2} at risk</span>
                        <span>{data.counts.tier3} routine</span>
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

            {/* Task 6 renders data.batches here, above the rows. */}

            {([1, 2, 3] as const).map((tier) => {
                const inTier = items.filter((i) => i.tier === tier);
                if (inTier.length === 0) return null;
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
                                    key={item.runId}
                                    item={item}
                                    now={now}
                                    busy={busyRunId === item.runId}
                                    onApprove={approve}
                                    onVerb={(it, verb) =>
                                        setDialog({
                                            kind: 'action',
                                            verb,
                                            target: targetFor(it),
                                        })
                                    }
                                    onHideIdentity={(it) =>
                                        setDialog({ kind: 'hide', item: it })
                                    }
                                    onInspect={() => {
                                        /* Task 5 */
                                    }}
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
        </div>
    );
}
