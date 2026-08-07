'use client';

import moment from 'moment';
import { useEffect, useRef, useState } from 'react';
import {
    BoxArrowUpRight,
    ChevronDown,
    ChevronUp,
    PlayBtn,
} from 'react-bootstrap-icons';
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
} from '../../../../../types/leaderboards.types';
import type {
    HistoryEvent,
    UserEligibleRunRow,
} from '../../../../../types/moderation.types';
import { loadUserEligibleRunsAction } from '../manage/moderation/shared/actions/eligible-runs.action';
import { useDialogBehavior } from '../shared/board-dialog';
import { relativeDate } from './relative-date';
import styles from './run-inspector.module.scss';

interface Props {
    /** The inspected row — always a real run (runId != null). */
    entry: LeaderboardEntry;
    gameSlug: string;
    categorySlug: string;
    gameTimeLabel?: GameTimeLabel;
    showMilliseconds: boolean;
    onClose: () => void;
    /** Board page refetch after any verb lands (or is undone). */
    onMutated: () => void;
    /** Step to the adjacent run row without closing — j/k also bind to these. */
    onPrev?: () => void;
    onNext?: () => void;
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

    // Runner track record, from the same eligible-runs read the console's
    // Adjust dialog uses — game-wide, so the counts mean "in this game",
    // not "on this page".
    const [runnerRuns, setRunnerRuns] = useState<UserEligibleRunRow[] | null>(
        null,
    );

    useDialogBehavior({ open: true, onClose, panelRef });

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
            if (activeVerb != null) return;
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
    }, [activeVerb, onNext, onPrev]);

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
    }, [runId, entry.verificationStatus]);

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

    const rejectedCount =
        runnerRuns?.filter((r) => r.verificationStatus === 'rejected').length ??
        0;
    const pendingCount =
        runnerRuns?.filter(
            (r) =>
                r.verificationStatus === 'pending' ||
                r.verificationStatus === 'unverified',
        ).length ?? 0;

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
                                            {runnerRuns.length} run
                                            {runnerRuns.length === 1 ? '' : 's'}{' '}
                                            in this game
                                            {pendingCount > 0 &&
                                                ` · ${pendingCount} pending`}
                                            {rejectedCount > 0 && (
                                                <span className="text-danger">
                                                    {` · ${rejectedCount} rejected`}
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
                                {history.map((event, i) => (
                                    <li
                                        key={`${event.at}-${i}`}
                                        className={styles.historyItem}
                                    >
                                        <div className={styles.historyEvent}>
                                            {describeEvent(event)}
                                        </div>
                                        <div className="text-muted small">
                                            {event.byRole} ·{' '}
                                            {moment(event.at).fromNow()}
                                        </div>
                                        {event.reason && (
                                            <div
                                                className={styles.historyReason}
                                            >
                                                “{event.reason}”
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Verb footer — buttons for the run's state; picking one
                    expands the shared action form in place. */}
                <div className="border-top">
                    {activeVerb == null ? (
                        <div className="d-flex gap-2 p-3">
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
        </>
    );
}
