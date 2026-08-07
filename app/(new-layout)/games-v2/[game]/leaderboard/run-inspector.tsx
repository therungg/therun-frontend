'use client';

import moment from 'moment';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Dropdown } from 'react-bootstrap';
import {
    BoxArrowUpRight,
    ChevronDown,
    ChevronUp,
    PlayBtn,
} from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import type { ModVerb } from '~app/(new-layout)/games-v2/[game]/manage/moderation/shared/action-model';
import {
    RunActionForm,
    VERB_TITLE,
} from '~app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog';
import { loadRunHistoryAction } from '~src/actions/run-user-actions.action';
import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatRunDate } from '~src/lib/format-run-date';
import { describeEvent } from '~src/lib/run-view/describe-event';
import type {
    GameTimeLabel,
    LeaderboardEntry,
    ResolvedCategory,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import type {
    HistoryEvent,
    UserEligibleRunRow,
} from '../../../../../types/moderation.types';
import { AdjustDialog } from '../manage/boards/adjust-dialog';
import { MoveDialog } from '../manage/boards/move-dialog';
import { loadUserEligibleRunsAction } from '../manage/moderation/shared/actions/eligible-runs.action';
import { excludeAction } from '../manage/moderation/shared/actions/exclude.action';
import { markRunsAction } from '../manage/moderation/shared/actions/marks.action';
import { restoreRunsAction } from '../manage/moderation/shared/actions/restore.action';
import { applyVerdictsAction } from '../manage/moderation/shared/actions/verdicts.action';
import { useDialogBehavior } from '../shared/board-dialog';
import { buildSubcategoryKey } from '../submit/subcategory-key';
import { loadModBoardContextAction } from './actions/load-mod-board-context.action';
import { HideIdentityDialog } from './hide-identity-dialog';
import {
    type HistoryUndoPlan,
    historyUndoPlan,
    historyUndoReason,
} from './history-undo';
import { entryToRosterRow } from './mod-row';
import { relativeDate } from './relative-date';
import styles from './run-inspector.module.scss';

interface Props {
    /** The inspected row — always a real run (runId != null). */
    entry: LeaderboardEntry;
    gameSlug: string;
    categorySlug: string;
    /** Subcategory-role variable names — builds this run's own subcategory
     * key for the Move/Adjust/Hide-identity dialogs. */
    subcategoryDefKeys: string[];
    gameTimeLabel?: GameTimeLabel;
    showMilliseconds: boolean;
    onClose: () => void;
    /** Board page refetch after any verb lands (or is undone). */
    onMutated: () => void;
    /** Step to the adjacent run row without closing — j/k also bind to these. */
    onPrev?: () => void;
    onNext?: () => void;
}

interface ModBoardContext {
    gameDisplay: string;
    categories: ResolvedCategory[];
    variables: VariableRow[];
}

type ModDialogKind = 'move' | 'adjust' | 'hide-identity';

/** Inline Undo on the timeline's latest event — runs the mapped inverse. */
function TimelineUndoButton({
    gameSlug,
    runId,
    event,
    plan,
    onUndone,
}: {
    gameSlug: string;
    runId: number;
    event: HistoryEvent;
    plan: HistoryUndoPlan;
    onUndone: () => void;
}) {
    const [isPending, startTransition] = useTransition();

    const undo = () => {
        startTransition(async () => {
            const reason = historyUndoReason(event);
            const res =
                plan.kind === 'verdict'
                    ? await applyVerdictsAction(
                          gameSlug,
                          plan.action,
                          [runId],
                          reason,
                      )
                    : plan.kind === 'restore'
                      ? await restoreRunsAction(gameSlug, [runId], reason)
                      : plan.kind === 'exclude'
                        ? await excludeAction(gameSlug, {
                              runIds: [runId],
                              reason,
                          })
                        : await markRunsAction(gameSlug, [runId], plan.marked);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success('Undone.');
            onUndone();
        });
    };

    return (
        <button
            type="button"
            className={styles.timelineUndo}
            onClick={undo}
            disabled={isPending}
        >
            {isPending ? 'Undoing…' : '↩ Undo'}
        </button>
    );
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'text-bg-warning' },
    verified: { label: 'Verified', className: 'text-bg-success' },
    rejected: { label: 'Rejected', className: 'text-bg-danger' },
};

/** The verbs the footer offers for a run in this verification state. */
export function verbsForStatus(
    status: LeaderboardEntry['verificationStatus'],
): ModVerb[] {
    const verbs: ModVerb[] = [];
    if (status === 'pending') verbs.push('approve');
    if (status === 'rejected') verbs.push('restore');
    verbs.push('remove');
    return verbs;
}

/**
 * Run inspector — the board's single-run moderation surface. A right-side
 * drawer over the table: run facts up top, the runner's track record and the
 * moderation-history timeline as context, and the state-driven verb footer
 * at the bottom. Verbs expand into the shared RunActionForm inline; j/k (and
 * the footer arrows) step through the page's run rows without closing.
 */
export function RunInspector({
    entry,
    gameSlug,
    categorySlug,
    subcategoryDefKeys,
    gameTimeLabel = 'igt',
    showMilliseconds,
    onClose,
    onMutated,
    onPrev,
    onNext,
}: Props) {
    const runId = entry.runId as number;
    const panelRef = useRef<HTMLDivElement>(null);
    const [activeVerb, setActiveVerb] = useState<ModVerb | null>(null);

    const [history, setHistory] = useState<HistoryEvent[] | null>(null);
    const [historyError, setHistoryError] = useState<string | null>(null);
    // Bumped after a timeline undo — some inverses (mark, exclude/include)
    // don't change verificationStatus, so the status-keyed reload below
    // wouldn't fire on its own.
    const [historyReload, setHistoryReload] = useState(0);

    // Runner track record, from the same eligible-runs read the console's
    // Adjust dialog uses — game-wide, so the counts mean "in this game",
    // not "on this page".
    const [runnerRuns, setRunnerRuns] = useState<UserEligibleRunRow[] | null>(
        null,
    );

    // Move/Adjust/Hide-identity need the game's board context (categories +
    // variable defs) — loaded lazily on first use, same as the old kebab, so
    // opening the drawer alone stays cheap.
    const [modCtx, setModCtx] = useState<ModBoardContext | null>(null);
    const [modDialog, setModDialog] = useState<ModDialogKind | null>(null);
    const [_ctxPending, startCtxLoad] = useTransition();
    const [_markPending, startMark] = useTransition();

    // While a Move/Adjust/Hide-identity dialog is stacked on top, hand the
    // focus trap + Escape + scroll lock over to it — two live traps on
    // `document` would fight, and the drawer's Escape would close both.
    useDialogBehavior({ open: modDialog == null, onClose, panelRef });

    const entrySubcategoryKey = buildSubcategoryKey(
        Object.fromEntries(
            Object.entries(entry.variables ?? {}).filter(([k]) =>
                subcategoryDefKeys.includes(k),
            ),
        ),
    );
    const rosterRow = entryToRosterRow(entry, entrySubcategoryKey);
    const modCategory =
        modCtx?.categories.find((c) => c.name === categorySlug) ?? null;

    const openModDialog = (kind: ModDialogKind) => {
        if (modCtx != null) {
            if (modCategory == null) {
                toast.error("Could not resolve this board's category.");
                return;
            }
            setModDialog(kind);
            return;
        }
        startCtxLoad(async () => {
            const res = await loadModBoardContextAction(gameSlug);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            const ctx = {
                gameDisplay: res.gameDisplay,
                categories: res.categories,
                variables: res.variables,
            };
            setModCtx(ctx);
            if (!ctx.categories.some((c) => c.name === categorySlug)) {
                toast.error("Could not resolve this board's category.");
                return;
            }
            setModDialog(kind);
        });
    };

    const markForLater = () => {
        startMark(async () => {
            const res = await markRunsAction(gameSlug, [runId], true);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success(
                "Marked for later — it's in the console's marked pile.",
            );
            setHistoryReload((n) => n + 1);
        });
    };

    const modTimeMs =
        modCategory?.primaryTiming === 'gt'
            ? (rosterRow?.gameTime ?? null)
            : (rosterRow?.time ?? null);

    const onModDialogMutated = () => {
        setModDialog(null);
        setHistoryReload((n) => n + 1);
        onMutated();
    };

    // Stepping to another row abandons a half-open verb form — that's the
    // point of the guard in the key handler below, and the explicit arrows
    // reset it so a stale form never applies to the wrong run.
    const step = (dir: 'prev' | 'next') => {
        setActiveVerb(null);
        (dir === 'prev' ? onPrev : onNext)?.();
    };

    // j/k row navigation. Inert while a verb form is open (typed reasons
    // must not be lost to a stray key) and while focus sits in any text
    // field.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (activeVerb != null || modDialog != null) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const t = e.target as HTMLElement | null;
            if (
                t &&
                (t.tagName === 'INPUT' ||
                    t.tagName === 'TEXTAREA' ||
                    t.tagName === 'SELECT' ||
                    t.isContentEditable)
            ) {
                return;
            }
            if (e.key === 'j' && onNext) {
                e.preventDefault();
                step('next');
            } else if (e.key === 'k' && onPrev) {
                e.preventDefault();
                step('prev');
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
        // step is stable enough — it only wraps the two props below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeVerb, modDialog, onNext, onPrev]);

    // History reloads on run change and after a verdict lands (the parent's
    // refetch hands back an entry whose status reflects the action).
    useEffect(() => {
        let stale = false;
        setHistory(null);
        setHistoryError(null);
        loadRunHistoryAction(runId).then((res) => {
            if (stale) return;
            if ('error' in res) setHistoryError(res.error);
            else setHistory(res.events);
        });
        return () => {
            stale = true;
        };
    }, [runId, entry.verificationStatus, historyReload]);

    useEffect(() => {
        const userId = entry.userId;
        if (userId == null) {
            setRunnerRuns(null);
            return;
        }
        let stale = false;
        setRunnerRuns(null);
        loadUserEligibleRunsAction(gameSlug, userId).then((res) => {
            if (stale || 'error' in res) return;
            setRunnerRuns(res.rows);
        });
        return () => {
            stale = true;
        };
    }, [gameSlug, entry.userId]);

    const badge =
        entry.source === 'manual'
            ? null
            : (STATUS_BADGE[entry.verificationStatus] ?? null);
    const variableValues = Object.values(entry.variables ?? {});
    const gtLabel = gameTimeLabel === 'lrt' ? 'Load-removed time' : 'Game time';

    const verbDone = () => {
        setActiveVerb(null);
        onMutated();
    };

    // A board shows one run per user, so the runner's game-wide run tally is
    // noise here (it was reading "471 runs · 471 pending"). What a moderator
    // actually wants is: how many boards in this game they hold a slot on,
    // and whether they carry prior rejections. `isLeaderboardEntry(Gt)` marks
    // the runs that are actually ON a board (one per category), so counting
    // those gives the honest small number.
    const boardCount =
        runnerRuns?.filter(
            (r) => r.isLeaderboardEntry || r.isLeaderboardEntryGt,
        ).length ?? 0;
    const rejectedCount =
        runnerRuns?.filter((r) => r.verificationStatus === 'rejected').length ??
        0;

    return (
        <>
            <button
                type="button"
                aria-label="Close run inspector"
                className={`position-fixed top-0 start-0 w-100 h-100 border-0 p-0 ${styles.backdrop}`}
                onClick={onClose}
            />
            <div
                ref={panelRef}
                className={`position-fixed top-0 end-0 h-100 bg-body shadow-lg d-flex flex-column ${styles.panel}`}
                role="dialog"
                aria-modal="true"
                aria-label={`Moderate ${entry.runnerName}'s run`}
            >
                <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
                    <h2 className="h5 mb-0">Moderate run</h2>
                    <button
                        type="button"
                        className="btn-close"
                        aria-label="Close"
                        onClick={onClose}
                    />
                </div>

                <div className="flex-grow-1 overflow-auto">
                    {/* Run facts */}
                    <div className="p-3 border-bottom">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className={styles.runnerName}>
                                {entry.runnerName}
                            </span>
                            {badge && (
                                <span className={`badge ${badge.className}`}>
                                    {badge.label}
                                </span>
                            )}
                            {entry.runDate && (
                                <span
                                    className="text-muted small"
                                    title={formatRunDate(entry.runDate)}
                                >
                                    {relativeDate(entry.runDate)}
                                </span>
                            )}
                        </div>
                        <div className="text-muted small mt-1">
                            {categorySlug}
                            {variableValues.length > 0 &&
                                ` — ${variableValues.join(' / ')}`}
                        </div>
                        <div className={styles.timesLine}>
                            {entry.realTime != null && (
                                <span>
                                    <span className={styles.timeLabel}>
                                        Real time
                                    </span>{' '}
                                    <DurationToFormatted
                                        duration={entry.realTime}
                                        withMillis={showMilliseconds}
                                    />
                                </span>
                            )}
                            {entry.gameTime != null && (
                                <span>
                                    <span className={styles.timeLabel}>
                                        {gtLabel}
                                    </span>{' '}
                                    <DurationToFormatted
                                        duration={entry.gameTime}
                                        withMillis={showMilliseconds}
                                    />
                                </span>
                            )}
                        </div>
                        <div className="d-flex gap-3 mt-2">
                            {entry.vodUrl && (
                                <a
                                    href={entry.vodUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={styles.factLink}
                                >
                                    <PlayBtn size={14} aria-hidden /> Watch VOD
                                </a>
                            )}
                            <Link
                                href={`/games-v2/${encodeURIComponent(gameSlug)}/run/${runId}`}
                                className={styles.factLink}
                            >
                                <BoxArrowUpRight size={12} aria-hidden /> Run
                                page
                            </Link>
                        </div>
                    </div>

                    {/* Runner strip — context only. Runner-scoped verbs (ban,
                        anonymize lifting, …) live on the runner page, not
                        here. */}
                    <div className="p-3 border-bottom">
                        {entry.userId != null ? (
                            <div className="d-flex align-items-center justify-content-between gap-2">
                                <span className="small">
                                    {runnerRuns == null ? (
                                        <span className="text-muted">
                                            Loading runner record…
                                        </span>
                                    ) : (
                                        <>
                                            On {boardCount} board
                                            {boardCount === 1 ? '' : 's'} in
                                            this game
                                            {rejectedCount > 0 && (
                                                <span className="text-danger">
                                                    {` · ${rejectedCount} prior rejection${rejectedCount === 1 ? '' : 's'}`}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </span>
                                <Link
                                    href={`/games-v2/${encodeURIComponent(gameSlug)}/manage/moderation/runner/${entry.userId}?from=board`}
                                    className={styles.factLink}
                                >
                                    Runner page →
                                </Link>
                            </div>
                        ) : (
                            <span className="text-muted small">
                                {entry.isGuest
                                    ? 'Guest submission — no runner account.'
                                    : 'Runner identity is hidden.'}
                            </span>
                        )}
                    </div>

                    {/* History timeline */}
                    <div className="p-3">
                        <h3 className={styles.sectionTitle}>History</h3>
                        {historyError != null && (
                            <p className="text-danger small mb-0">
                                {historyError}
                            </p>
                        )}
                        {historyError == null && history === null && (
                            <p className="text-muted small mb-0">Loading…</p>
                        )}
                        {history !== null && history.length === 0 && (
                            <p className="text-muted small mb-0">
                                No moderation history for this run.
                            </p>
                        )}
                        {history !== null && history.length > 0 && (
                            <ul className={styles.historyList}>
                                {history.map((event, i) => {
                                    const plan = historyUndoPlan(
                                        event,
                                        i === history.length - 1,
                                    );
                                    return (
                                        <li
                                            key={`${event.at}-${i}`}
                                            className={styles.historyItem}
                                        >
                                            <div
                                                className="d-flex align-items-baseline
                                                    justify-content-between gap-2"
                                            >
                                                <span
                                                    className={
                                                        styles.historyEvent
                                                    }
                                                >
                                                    {describeEvent(event)}
                                                </span>
                                                {plan && (
                                                    <TimelineUndoButton
                                                        gameSlug={gameSlug}
                                                        runId={runId}
                                                        event={event}
                                                        plan={plan}
                                                        onUndone={() => {
                                                            setHistoryReload(
                                                                (n) => n + 1,
                                                            );
                                                            onMutated();
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <div className="text-muted small">
                                                {event.by?.name ?? event.byRole}{' '}
                                                · {moment(event.at).fromNow()}
                                            </div>
                                            {event.reason && (
                                                <div
                                                    className={
                                                        styles.historyReason
                                                    }
                                                >
                                                    “{event.reason}”
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Verb footer — buttons for the run's state; picking one
                    expands the shared action form in place. */}
                <div className="border-top">
                    {activeVerb == null ? (
                        <div className="d-flex gap-2 p-3 align-items-center">
                            {verbsForStatus(entry.verificationStatus).map(
                                (verb) => (
                                    <button
                                        key={verb}
                                        type="button"
                                        className={`btn btn-sm ${
                                            verb === 'approve'
                                                ? 'btn-success'
                                                : verb === 'remove'
                                                  ? 'btn-outline-danger'
                                                  : 'btn-outline-secondary'
                                        }`}
                                        onClick={() => setActiveVerb(verb)}
                                    >
                                        {VERB_TITLE[verb]}
                                        {verb === 'remove' && '…'}
                                    </button>
                                ),
                            )}
                            <Dropdown drop="up" align="end" className="ms-auto">
                                <Dropdown.Toggle
                                    as="button"
                                    type="button"
                                    id={`run-inspector-more-${runId}`}
                                    className="btn btn-sm btn-outline-secondary"
                                >
                                    More
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    <Dropdown.Item
                                        as="button"
                                        type="button"
                                        onClick={() => openModDialog('move')}
                                    >
                                        Move…
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        as="button"
                                        type="button"
                                        onClick={() => openModDialog('adjust')}
                                    >
                                        Adjust time…
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        as="button"
                                        type="button"
                                        onClick={() =>
                                            openModDialog('hide-identity')
                                        }
                                    >
                                        Hide identity…
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        as="button"
                                        type="button"
                                        onClick={markForLater}
                                    >
                                        Mark for later
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                    ) : (
                        <div className={styles.verbForm}>
                            <div className={styles.verbFormTitle}>
                                {VERB_TITLE[activeVerb]} — {entry.runnerName}
                                ’s run
                            </div>
                            <RunActionForm
                                gameSlug={gameSlug}
                                verb={activeVerb}
                                target={{
                                    kind: 'runs',
                                    runIds: [runId],
                                    label: `${entry.runnerName}'s run`,
                                }}
                                onDone={verbDone}
                                onClose={() => setActiveVerb(null)}
                                onUndoComplete={onMutated}
                                autoFocus
                            />
                        </div>
                    )}
                    {(onPrev || onNext) && activeVerb == null && (
                        <div className="d-flex justify-content-between align-items-center px-3 pb-3">
                            <button
                                type="button"
                                className={styles.stepBtn}
                                disabled={!onPrev}
                                onClick={() => step('prev')}
                            >
                                <ChevronUp size={14} aria-hidden /> Previous run{' '}
                                <kbd>k</kbd>
                            </button>
                            <button
                                type="button"
                                className={styles.stepBtn}
                                disabled={!onNext}
                                onClick={() => step('next')}
                            >
                                Next run <kbd>j</kbd>{' '}
                                <ChevronDown size={14} aria-hidden />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Stacked mod dialogs (their own BoardDialog chrome). While one
                is open the drawer's dialog behavior is suspended — see the
                useDialogBehavior call above. */}
            {modCtx != null && modCategory != null && rosterRow != null && (
                <>
                    <MoveDialog
                        open={modDialog === 'move'}
                        onClose={() => setModDialog(null)}
                        row={rosterRow}
                        category={modCategory}
                        categories={modCtx.categories}
                        variables={modCtx.variables}
                        subcategoryKey={entrySubcategoryKey}
                        gameSlug={gameSlug}
                        onMutated={onModDialogMutated}
                    />
                    <AdjustDialog
                        open={modDialog === 'adjust'}
                        onClose={() => setModDialog(null)}
                        row={rosterRow}
                        category={modCategory}
                        gameSlug={gameSlug}
                        subcategoryKey={entrySubcategoryKey}
                        timeMs={modTimeMs}
                        onMutated={onModDialogMutated}
                    />
                    <HideIdentityDialog
                        open={modDialog === 'hide-identity'}
                        onClose={() => setModDialog(null)}
                        onDone={onModDialogMutated}
                        gameSlug={gameSlug}
                        gameDisplay={modCtx.gameDisplay}
                        runnerName={entry.runnerName}
                        runId={runId}
                        userId={entry.userId ?? null}
                        categoryId={modCategory.id}
                        categoryDisplay={modCategory.display}
                        subcategoryKey={entrySubcategoryKey}
                    />
                </>
            )}
        </>
    );
}
