'use client';

import moment from 'moment/moment';
import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { ModReportRow } from '../../../../../../../types/moderation.types';
import {
    quickExcludeAction,
    quickVerdictAction,
} from '../queue/actions/queue-actions.action';

const MIN_REASON = 10;

interface Props {
    gameSlug: string;
    gameDisplay: string;
    reports: ModReportRow[];
}

/** Which mutating action a report row's reason dialog will perform. */
type PendingAction =
    | { kind: 'reject'; reportId: number; runId: number }
    | { kind: 'exclude'; reportId: number; runId: number };

const ACTION_LABEL: Record<PendingAction['kind'], string> = {
    reject: 'Reject run',
    exclude: 'Exclude run',
};

export function ReportsView({ gameSlug, gameDisplay, reports }: Props) {
    const baseHref = `/games-v2/${gameSlug}/manage/moderation`;

    const [rows, setRows] = useState<ModReportRow[]>(reports);
    const [pending, setPending] = useState<PendingAction | null>(null);

    const removeById = (reportId: number) => {
        setRows((prev) => prev.filter((r) => r.id !== reportId));
    };

    return (
        <div className="container py-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h1 className="h4 mb-0">Reports — {gameDisplay}</h1>
                <Link
                    href={baseHref}
                    className="btn btn-sm btn-outline-secondary"
                >
                    Back to moderation
                </Link>
            </div>

            {rows.length === 0 ? (
                <p className="text-muted">No unresolved reports.</p>
            ) : (
                <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle">
                        <thead>
                            <tr>
                                <th>Reporter</th>
                                <th>Reported runner</th>
                                <th>Reason</th>
                                <th className="text-end">RT</th>
                                <th>Reported</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const isGuest = row.runnerUserId == null;
                                return (
                                    <tr key={row.id}>
                                        <td>{row.reporterName}</td>
                                        <td>
                                            {isGuest ? (
                                                <span>
                                                    {row.runnerName}{' '}
                                                    <span className="badge text-bg-secondary">
                                                        guest
                                                    </span>
                                                </span>
                                            ) : (
                                                <UserLink
                                                    username={row.runnerName}
                                                />
                                            )}
                                        </td>
                                        <td className="small">{row.reason}</td>
                                        <td className="text-end">
                                            <DurationToFormatted
                                                duration={row.timeMs}
                                            />
                                        </td>
                                        <td className="small text-muted">
                                            <abbr
                                                title={moment(
                                                    row.createdAt,
                                                ).format('LLLL')}
                                            >
                                                {moment(
                                                    row.createdAt,
                                                ).fromNow()}
                                            </abbr>
                                        </td>
                                        <td>
                                            <div className="d-flex justify-content-end gap-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() =>
                                                        setPending({
                                                            kind: 'reject',
                                                            reportId: row.id,
                                                            runId: row.runId,
                                                        })
                                                    }
                                                >
                                                    Reject run
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() =>
                                                        setPending({
                                                            kind: 'exclude',
                                                            reportId: row.id,
                                                            runId: row.runId,
                                                        })
                                                    }
                                                >
                                                    Exclude run
                                                </button>
                                                {!isGuest &&
                                                    row.runnerUserId !=
                                                        null && (
                                                        <Link
                                                            href={`${baseHref}/runner/${row.runnerUserId}`}
                                                            className="btn btn-sm btn-outline-secondary"
                                                        >
                                                            View runner
                                                        </Link>
                                                    )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {pending && (
                <ReasonDialog
                    pending={pending}
                    gameSlug={gameSlug}
                    onClose={() => setPending(null)}
                    onDone={() => {
                        removeById(pending.reportId);
                        setPending(null);
                    }}
                />
            )}
        </div>
    );
}

interface ReasonDialogProps {
    pending: PendingAction;
    gameSlug: string;
    onClose: () => void;
    onDone: () => void;
}

function ReasonDialog({
    pending,
    gameSlug,
    onClose,
    onDone,
}: ReasonDialogProps) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isConfirming, startConfirm] = useTransition();

    const reasonOk = reason.trim().length >= MIN_REASON;

    const handleConfirm = () => {
        if (!reasonOk) return;
        setError(null);
        const trimmed = reason.trim();
        startConfirm(async () => {
            const res =
                pending.kind === 'exclude'
                    ? await quickExcludeAction(gameSlug, pending.runId, trimmed)
                    : await quickVerdictAction(
                          gameSlug,
                          pending.runId,
                          'reject',
                          trimmed,
                      );

            if ('error' in res) {
                setError(res.error);
                return;
            }

            toast.success(`${ACTION_LABEL[pending.kind]} — done.`);
            onDone();
        });
    };

    return (
        <div
            className="modal d-block"
            tabIndex={-1}
            role="dialog"
            style={{ background: 'rgba(0,0,0,0.5)' }}
        >
            <div className="modal-dialog" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            {ACTION_LABEL[pending.kind]}
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={onClose}
                            disabled={isConfirming}
                        />
                    </div>
                    <div className="modal-body">
                        <label
                            htmlFor="report-action-reason"
                            className="form-label small text-muted mb-1"
                        >
                            Reason — required, min {MIN_REASON} characters,
                            audit-logged
                        </label>
                        <textarea
                            id="report-action-reason"
                            className="form-control form-control-sm"
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={isConfirming}
                        />
                        {!reasonOk && reason.length > 0 && (
                            <small className="text-danger">
                                {MIN_REASON - reason.trim().length} more
                                character
                                {MIN_REASON - reason.trim().length === 1
                                    ? ''
                                    : 's'}{' '}
                                needed.
                            </small>
                        )}
                        {error && (
                            <div
                                className="alert alert-danger py-2 mt-2 mb-0"
                                role="alert"
                            >
                                {error}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={onClose}
                            disabled={isConfirming}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={handleConfirm}
                            disabled={isConfirming || !reasonOk}
                        >
                            {isConfirming
                                ? 'Working…'
                                : ACTION_LABEL[pending.kind]}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
