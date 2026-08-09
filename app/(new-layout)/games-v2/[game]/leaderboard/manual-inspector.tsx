'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
    BoxArrowUpRight,
    ChevronDown,
    ChevronUp,
    PlayBtn,
} from 'react-bootstrap-icons';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import type { ModVerb } from '~app/(new-layout)/games-v2/[game]/manage/moderation/shared/action-model';
import {
    RunActionForm,
    VERB_TITLE,
} from '~app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog';
import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatRunDate } from '~src/lib/format-run-date';
import type {
    GameTimeLabel,
    LeaderboardEntry,
    ResolvedCategory,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import type { UserEligibleRunRow } from '../../../../../types/moderation.types';
import { loadUserEligibleRunsAction } from '../manage/moderation/shared/actions/eligible-runs.action';
import { ManualTimeDialog } from '../manage/moderation/shared/manual-time-dialog';
import { useDialogBehavior } from '../shared/board-dialog';
import { buildSubcategoryKey } from '../submit/subcategory-key';
import { loadModBoardContextAction } from './actions/load-mod-board-context.action';
import { relativeDate } from './relative-date';
import styles from './run-inspector.module.scss';

interface Props {
    /** The inspected row — always a manual set time (manualTimeId != null). */
    entry: LeaderboardEntry;
    gameSlug: string;
    categorySlug: string;
    subcategoryDefKeys: string[];
    gameTimeLabel?: GameTimeLabel;
    showMilliseconds: boolean;
    onClose: () => void;
    onMutated: () => void;
    onPrev?: () => void;
    onNext?: () => void;
}

interface ModBoardContext {
    gameDisplay: string;
    categories: ResolvedCategory[];
    variables: VariableRow[];
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'text-bg-warning' },
    verified: { label: 'Verified', className: 'text-bg-success' },
    rejected: { label: 'Rejected', className: 'text-bg-danger' },
};

/** The verbs the footer offers for a set time in this verification state.
 * Manual times have no restore/move — verify and reject are their verdicts,
 * remove is a hard delete. */
export function manualVerbsForStatus(
    status: LeaderboardEntry['verificationStatus'],
): ModVerb[] {
    const verbs: ModVerb[] = [];
    if (status !== 'verified') verbs.push('approve');
    if (status !== 'rejected') verbs.push('reject');
    verbs.push('remove');
    return verbs;
}

/**
 * Set-time inspector — the manual counterpart to RunInspector, in the same
 * drawer chrome. A manual set time has no finished_run, so no run-history
 * timeline and no move/adjust/hide-identity; its verbs are Verify / Reject /
 * Remove (a delete) plus Change time… (the value + evidence editor). j/k step
 * through the page's set-time rows.
 */
export function ManualInspector({
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
    const manualTimeId = entry.manualTimeId as number;
    const panelRef = useRef<HTMLDivElement>(null);
    // Portal target isn't available during SSR — mount client-side only.
    const [portalReady, setPortalReady] = useState(false);
    useEffect(() => {
        setPortalReady(true);
    }, []);
    const [activeVerb, setActiveVerb] = useState<ModVerb | null>(null);
    const [editOpen, setEditOpen] = useState(false);

    // Board context (categories) for the Change-time dialog's categoryId —
    // loaded lazily on first use, like the old kebab.
    const [modCtx, setModCtx] = useState<ModBoardContext | null>(null);
    const [_ctxPending, startCtxLoad] = useTransition();

    const [runnerRuns, setRunnerRuns] = useState<UserEligibleRunRow[] | null>(
        null,
    );

    // Hand the focus trap to the Change-time dialog while it's open.
    useDialogBehavior({ open: !editOpen, onClose, panelRef });

    const entrySubcategoryKey = buildSubcategoryKey(
        Object.fromEntries(
            Object.entries(entry.variables ?? {}).filter(([k]) =>
                subcategoryDefKeys.includes(k),
            ),
        ),
    );
    const modCategory =
        modCtx?.categories.find((c) => c.name === categorySlug) ?? null;

    const openEdit = () => {
        if (modCtx != null) {
            if (modCategory == null) {
                toast.error("Could not resolve this board's category.");
                return;
            }
            setEditOpen(true);
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
            setEditOpen(true);
        });
    };

    const step = (dir: 'prev' | 'next') => {
        setActiveVerb(null);
        (dir === 'prev' ? onPrev : onNext)?.();
    };

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (activeVerb != null || editOpen) return;
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeVerb, editOpen, onNext, onPrev]);

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

    // A manual row asserts exactly one clock; the entry carries it in
    // gameTime or realTime (see the board row's manual handling).
    const timing = entry.gameTime != null ? 'gametime' : 'realtime';
    const timeMs = entry.gameTime ?? entry.realTime ?? entry.time ?? 0;
    const timeLabel =
        timing === 'gametime'
            ? gameTimeLabel === 'lrt'
                ? 'Load-removed time'
                : 'Game time'
            : 'Real time';
    const badge = STATUS_BADGE[entry.verificationStatus] ?? null;
    const variableValues = Object.values(entry.variables ?? {});

    const boardCount =
        runnerRuns?.filter(
            (r) => r.isLeaderboardEntry || r.isLeaderboardEntryGt,
        ).length ?? 0;
    const rejectedCount =
        runnerRuns?.filter((r) => r.verificationStatus === 'rejected').length ??
        0;

    const verbDone = () => {
        setActiveVerb(null);
        onMutated();
    };

    if (!portalReady) return null;

    // Portalled for the same reason as RunInspector — see the note there.
    return createPortal(
        <>
            <button
                type="button"
                aria-label="Close set-time inspector"
                className={`position-fixed top-0 start-0 w-100 h-100 border-0 p-0 ${styles.backdrop}`}
                onClick={onClose}
            />
            <div
                ref={panelRef}
                className={`position-fixed top-0 end-0 h-100 bg-body shadow-lg d-flex flex-column ${styles.panel}`}
                role="dialog"
                aria-modal="true"
                aria-label={`Moderate ${entry.runnerName}'s set time`}
            >
                <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
                    <h2 className="h5 mb-0">Moderate set time</h2>
                    <button
                        type="button"
                        className="btn-close"
                        aria-label="Close"
                        onClick={onClose}
                    />
                </div>

                <div className="flex-grow-1 overflow-auto">
                    <div className="p-3 border-bottom">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className={styles.runnerName}>
                                {entry.runnerName}
                            </span>
                            <span className="badge text-bg-secondary">
                                Set time
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
                            <span>
                                <span className={styles.timeLabel}>
                                    {timeLabel}
                                </span>{' '}
                                <DurationToFormatted
                                    duration={timeMs}
                                    withMillis={showMilliseconds}
                                />
                            </span>
                        </div>
                        <div className="d-flex gap-3 mt-2">
                            {entry.vodUrl && (
                                <a
                                    href={entry.vodUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={styles.factLink}
                                >
                                    <PlayBtn size={14} aria-hidden /> Evidence
                                </a>
                            )}
                            <Link
                                href={`/games-v2/${encodeURIComponent(gameSlug)}/manual/${manualTimeId}`}
                                className={styles.factLink}
                            >
                                <BoxArrowUpRight size={12} aria-hidden />{' '}
                                Set-time details
                            </Link>
                        </div>
                    </div>

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
                                Guest set time — no runner account.
                            </span>
                        )}
                    </div>

                    <div className="p-3">
                        <p className="text-muted small mb-0">
                            A moderator-set leaderboard time. It has no run
                            history of its own; use Change time to correct its
                            value or evidence.
                        </p>
                    </div>
                </div>

                <div className="border-top">
                    {activeVerb == null ? (
                        <>
                            <div className={styles.actionBar}>
                                {manualVerbsForStatus(
                                    entry.verificationStatus,
                                ).map((verb) => (
                                    <button
                                        key={verb}
                                        type="button"
                                        className={`btn ${styles.verbBtn} ${
                                            verb === 'approve'
                                                ? 'btn-success'
                                                : verb === 'remove'
                                                  ? 'btn-danger'
                                                  : 'btn-outline-secondary'
                                        }`}
                                        onClick={() => setActiveVerb(verb)}
                                    >
                                        {verb === 'approve'
                                            ? 'Verify'
                                            : VERB_TITLE[verb]}
                                        {verb === 'remove' && '…'}
                                    </button>
                                ))}
                            </div>
                            <div className={styles.secondaryBar}>
                                <button
                                    type="button"
                                    className={styles.secondaryBtn}
                                    onClick={openEdit}
                                >
                                    Change time…
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className={styles.verbForm}>
                            <div className={styles.verbFormTitle}>
                                {activeVerb === 'approve'
                                    ? 'Verify'
                                    : VERB_TITLE[activeVerb]}{' '}
                                — {entry.runnerName}’s set time
                            </div>
                            <RunActionForm
                                gameSlug={gameSlug}
                                verb={activeVerb}
                                target={{
                                    kind: 'runs',
                                    runIds: [],
                                    manualTimeIds: [manualTimeId],
                                    label: `${entry.runnerName}'s set time`,
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
                                <ChevronUp size={14} aria-hidden /> Previous{' '}
                                <kbd>k</kbd>
                            </button>
                            <button
                                type="button"
                                className={styles.stepBtn}
                                disabled={!onNext}
                                onClick={() => step('next')}
                            >
                                Next <kbd>j</kbd>{' '}
                                <ChevronDown size={14} aria-hidden />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {editOpen && modCategory != null && (
                <ManualTimeDialog
                    gameSlug={gameSlug}
                    runnerRef={
                        entry.userId != null
                            ? { userId: entry.userId }
                            : { guestName: entry.runnerName }
                    }
                    runnerLabel={entry.runnerName}
                    categoryId={modCategory.id}
                    categoryLabel={modCategory.display}
                    subcategoryKey={entrySubcategoryKey}
                    existing={{
                        id: manualTimeId,
                        timing,
                        timeMs,
                        evidenceUrl: entry.vodUrl ?? null,
                    }}
                    onDone={() => {
                        setEditOpen(false);
                        onMutated();
                    }}
                    onClose={() => setEditOpen(false)}
                />
            )}
        </>,
        document.body,
    );
}
