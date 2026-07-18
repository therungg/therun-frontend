'use client';

import moment from 'moment/moment';
import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
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
                    ) : (
                        <ul className="list-unstyled mb-0">
                            {actions.map((row) => {
                                const ageMs =
                                    Date.now() -
                                    new Date(row.timestamp).getTime();
                                const canUndo =
                                    REVERSIBLE.has(row.action) &&
                                    ageMs < DAY_MS &&
                                    !undone.has(row.logId);
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
                                                    {row.target
                                                        ? ` ${row.target}`
                                                        : ''}
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
