'use client';

import moment from 'moment/moment';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import type { ModActionRow } from '../../../../../../../types/moderation.types';
import { useDialogBehavior } from '../../../shared/board-dialog';
import { undoAction } from '../log/actions/undo.action';
import { loadHistoryAction } from './actions/standards.action';
import styles from './history-drawer.module.scss';
import { historyActionLabel } from './history-labels';

interface Props {
    gameSlug: string;
    open: boolean;
    onClose: () => void;
}

/** All-actors/all-actions filter sentinel — an empty string never collides
 * with a real actor name or action label. */
const ANY_FILTER = '';

/**
 * A row links to its run's manage page when the backend's own
 * `listGameModActions` join guarantees `target` is a run id: `entity ===
 * 'finished_run'` (exclude_run/include_run — the only two RELEVANT_ACTIONS
 * that target a run rather than an exclusion rule; see
 * src/services/audit-log.ts). Anything else degrades to plain text — a rule
 * id or a `delete_exclusion_rule` snapshot target isn't a run.
 */
function runIdFor(row: ModActionRow): string | null {
    if (row.entity !== 'finished_run' || !row.target) return null;
    return /^\d+$/.test(row.target) ? row.target : null;
}

// Mirrors the reversible set the undo action enforces server-side.
const REVERSIBLE = new Set([
    'exclude_run',
    'include_run',
    'exclude_via_rule',
    'delete_exclusion_rule',
]);

const DAY_MS = 24 * 60 * 60 * 1000;

function UndoButton({
    gameSlug,
    row,
    onUndone,
}: {
    gameSlug: string;
    row: ModActionRow;
    onUndone: (logId: number) => void;
}) {
    const [isPending, startTransition] = useTransition();

    const handleUndo = () => {
        startTransition(async () => {
            const res = await undoAction(gameSlug, {
                logId: row.logId,
                action: row.action,
                target: row.target,
                data: row.data,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success('Action undone.');
            onUndone(row.logId);
        });
    };

    return (
        <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={handleUndo}
            disabled={isPending}
        >
            {isPending ? 'Undoing…' : 'Undo'}
        </button>
    );
}

export function HistoryDrawer({ gameSlug, open, onClose }: Props) {
    const [actions, setActions] = useState<ModActionRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [undone, setUndone] = useState<Set<number>>(new Set());
    // Compact filter row (G18) — client-side over the already-loaded 90
    // days, so switching filters never re-fetches.
    const [actorFilter, setActorFilter] = useState(ANY_FILTER);
    const [actionFilter, setActionFilter] = useState(ANY_FILTER);
    const panelRef = useRef<HTMLDivElement>(null);

    // Lazy-load when the drawer first opens.
    useEffect(() => {
        if (!open || actions !== null || loading) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        loadHistoryAction(gameSlug).then((res) => {
            if (cancelled) return;
            if ('error' in res) {
                setError(res.error);
            } else {
                setActions(
                    [...res.actions].sort(
                        (a, b) =>
                            new Date(b.timestamp).getTime() -
                            new Date(a.timestamp).getTime(),
                    ),
                );
            }
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [open, gameSlug, actions, loading]);

    // Focus trap + autofocus + restore-on-close + Escape-to-close + scroll
    // lock — same behavior as BoardDialog, kept here directly since this
    // drawer keeps its own slide-in-from-the-edge presentation rather than
    // the centered modal chrome.
    useDialogBehavior({ open, onClose, panelRef });

    const onUndone = (logId: number) =>
        setUndone((prev) => new Set(prev).add(logId));

    // Distinct actor names + action-type buckets (reusing historyActionLabel)
    // from whatever's already loaded — options only ever grow within a
    // single 90-day load, never re-fetched per filter change.
    const actorOptions = useMemo(() => {
        if (!actions) return [];
        return Array.from(new Set(actions.map((a) => a.actorName))).sort();
    }, [actions]);
    const actionOptions = useMemo(() => {
        if (!actions) return [];
        return Array.from(
            new Set(actions.map((a) => historyActionLabel(a.action))),
        ).sort();
    }, [actions]);

    const filteredActions = useMemo(() => {
        if (!actions) return null;
        return actions.filter(
            (a) =>
                (actorFilter === ANY_FILTER || a.actorName === actorFilter) &&
                (actionFilter === ANY_FILTER ||
                    historyActionLabel(a.action) === actionFilter),
        );
    }, [actions, actorFilter, actionFilter]);

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <button
                type="button"
                aria-label="Close history"
                className={`position-fixed top-0 start-0 w-100 h-100 border-0 p-0 ${styles.backdrop}`}
                onClick={onClose}
            />
            {/* Panel */}
            <div
                ref={panelRef}
                className={`position-fixed top-0 end-0 h-100 bg-body shadow-lg d-flex flex-column ${styles.panel}`}
                role="dialog"
                aria-modal="true"
                aria-label="Moderation history"
            >
                <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
                    <h2 className="h5 mb-0">History</h2>
                    <button
                        type="button"
                        className="btn-close"
                        aria-label="Close"
                        onClick={onClose}
                    />
                </div>

                {actions && actions.length > 0 && (
                    <div className="d-flex gap-2 p-3 border-bottom">
                        <select
                            className="form-select form-select-sm"
                            aria-label="Filter by moderator"
                            value={actorFilter}
                            onChange={(e) => setActorFilter(e.target.value)}
                        >
                            <option value={ANY_FILTER}>All moderators</option>
                            {actorOptions.map((name) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                        <select
                            className="form-select form-select-sm"
                            aria-label="Filter by action type"
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                        >
                            <option value={ANY_FILTER}>All actions</option>
                            {actionOptions.map((label) => (
                                <option key={label} value={label}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex-grow-1 overflow-auto p-3">
                    {loading ? (
                        <p className="text-muted">Loading history…</p>
                    ) : error ? (
                        <div className="alert alert-danger py-2 mb-0">
                            {error}
                        </div>
                    ) : !actions || actions.length === 0 ? (
                        <p className="text-muted">
                            No moderation actions in the last 90 days.
                        </p>
                    ) : !filteredActions || filteredActions.length === 0 ? (
                        <p className="text-muted">
                            No actions match these filters.
                        </p>
                    ) : (
                        <ul className="list-unstyled mb-0">
                            {filteredActions.map((row) => {
                                const ageMs =
                                    Date.now() -
                                    new Date(row.timestamp).getTime();
                                const canUndo =
                                    REVERSIBLE.has(row.action) &&
                                    ageMs < DAY_MS &&
                                    !undone.has(row.logId);
                                const runId = runIdFor(row);
                                return (
                                    <li
                                        key={row.logId}
                                        className="border-bottom py-2"
                                    >
                                        <div className="d-flex justify-content-between align-items-start gap-2">
                                            <div className="small">
                                                <div>
                                                    <strong>
                                                        {row.actorName}
                                                    </strong>{' '}
                                                    <span title={row.action}>
                                                        {historyActionLabel(
                                                            row.action,
                                                        )}
                                                    </span>
                                                    {row.target ? (
                                                        runId ? (
                                                            <>
                                                                {' '}
                                                                <Link
                                                                    href={`/games-v2/${gameSlug}/manage/run/${runId}`}
                                                                >
                                                                    {row.target}
                                                                </Link>
                                                            </>
                                                        ) : (
                                                            ` ${row.target}`
                                                        )
                                                    ) : (
                                                        ''
                                                    )}
                                                </div>
                                                {row.remark && (
                                                    <div className="text-muted">
                                                        {row.remark}
                                                    </div>
                                                )}
                                                <div className="text-muted">
                                                    <abbr
                                                        title={moment(
                                                            row.timestamp,
                                                        ).format('LLLL')}
                                                    >
                                                        {moment(
                                                            row.timestamp,
                                                        ).fromNow()}
                                                    </abbr>
                                                </div>
                                            </div>
                                            <div className="text-end">
                                                {undone.has(row.logId) ? (
                                                    <span className="badge text-bg-secondary">
                                                        Undone
                                                    </span>
                                                ) : canUndo ? (
                                                    <UndoButton
                                                        gameSlug={gameSlug}
                                                        row={row}
                                                        onUndone={onUndone}
                                                    />
                                                ) : null}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </>
    );
}
