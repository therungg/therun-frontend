'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import type { ModActionRow } from '../../../../../../../types/moderation.types';
import { undoAction } from './actions/undo.action';

interface Props {
    gameSlug: string;
    gameDisplay: string;
    actions: ModActionRow[];
}

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

export function LogView({ gameSlug, gameDisplay, actions }: Props) {
    const baseHref = `/games-v2/${gameSlug}/manage/moderation`;
    const [undone, setUndone] = useState<Set<number>>(new Set());

    const sorted = useMemo(
        () =>
            [...actions].sort(
                (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime(),
            ),
        [actions],
    );

    const onUndone = (logId: number) =>
        setUndone((prev) => new Set(prev).add(logId));

    return (
        <div className="container py-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h1 className="h4 mb-0">Mod action log — {gameDisplay}</h1>
                <Link
                    href={baseHref}
                    className="btn btn-sm btn-outline-secondary"
                >
                    Back to moderation
                </Link>
            </div>

            {sorted.length === 0 ? (
                <p className="text-muted">
                    No moderation actions in the last 90 days.
                </p>
            ) : (
                <div className="table-responsive">
                    <table className="table table-sm align-middle">
                        <thead>
                            <tr>
                                <th>When</th>
                                <th>Actor</th>
                                <th>Action</th>
                                <th>Target</th>
                                <th>Reason</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((row) => {
                                const ageMs =
                                    Date.now() -
                                    new Date(row.timestamp).getTime();
                                const canUndo =
                                    REVERSIBLE.has(row.action) &&
                                    ageMs < DAY_MS &&
                                    !undone.has(row.logId);
                                return (
                                    <tr key={row.logId}>
                                        <td className="small text-muted">
                                            {new Date(
                                                row.timestamp,
                                            ).toLocaleString()}
                                        </td>
                                        <td className="small">
                                            {row.actorName}
                                        </td>
                                        <td>
                                            <code className="small">
                                                {row.action}
                                            </code>
                                        </td>
                                        <td className="small text-muted">
                                            {row.target ?? '—'}
                                        </td>
                                        <td className="small text-muted">
                                            {row.remark ?? '—'}
                                        </td>
                                        <td className="text-end">
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
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
