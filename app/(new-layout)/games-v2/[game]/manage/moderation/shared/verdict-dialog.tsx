'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    VerdictAction,
    VerdictPreviewResult,
} from '../../../../../../../types/moderation.types';
import {
    applyVerdictsAction,
    previewVerdictsAction,
} from './actions/verdicts.action';

interface Props {
    gameSlug: string;
    action: VerdictAction;
    runIds: number[];
    onDone: () => void;
    onClose: () => void;
}

const MIN_REASON = 10;

const LABELS: Record<
    VerdictAction,
    { title: string; confirm: string; variant: string }
> = {
    verify: { title: 'Verify', confirm: 'Verify runs', variant: 'success' },
    reject: { title: 'Reject', confirm: 'Reject runs', variant: 'danger' },
    unreject: {
        title: 'Un-reject',
        confirm: 'Un-reject runs',
        variant: 'primary',
    },
};

export function VerdictDialog({
    gameSlug,
    action,
    runIds,
    onDone,
    onClose,
}: Props) {
    const labels = LABELS[action];
    const [preview, setPreview] = useState<VerdictPreviewResult | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPreviewing, startPreview] = useTransition();
    const [isConfirming, startConfirm] = useTransition();

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        startPreview(async () => {
            const res = await previewVerdictsAction(gameSlug, action, runIds);
            if ('error' in res) {
                setPreviewError(res.error);
                return;
            }
            setPreviewError(null);
            setPreview(res.preview);
        });
    }, []);

    const reasonOk = reason.trim().length >= MIN_REASON;
    const busy = isPreviewing || isConfirming;

    const handleConfirm = () => {
        if (!reasonOk) return;
        setError(null);
        startConfirm(async () => {
            const res = await applyVerdictsAction(
                gameSlug,
                action,
                runIds,
                reason.trim(),
            );
            if ('error' in res) {
                setError(res.error);
                return;
            }
            const n = res.result.affectedRunCount;
            toast.success(
                `${labels.title} — ${n} run${n === 1 ? '' : 's'} updated.`,
            );
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
            <div
                className="modal-dialog modal-lg modal-dialog-scrollable"
                role="document"
            >
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            {labels.title} {runIds.length} run
                            {runIds.length === 1 ? '' : 's'}
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
                        {isPreviewing && (
                            <p className="text-muted">Loading preview…</p>
                        )}
                        {previewError && (
                            <div
                                className="alert alert-danger py-2"
                                role="alert"
                            >
                                {previewError}
                            </div>
                        )}
                        {preview && (
                            <>
                                <p className="mb-2">
                                    <strong>{preview.affectedRunCount}</strong>{' '}
                                    run
                                    {preview.affectedRunCount === 1 ? '' : 's'}{' '}
                                    will change across{' '}
                                    <strong>
                                        {preview.affectedLeaderboards.length}
                                    </strong>{' '}
                                    leaderboard
                                    {preview.affectedLeaderboards.length === 1
                                        ? ''
                                        : 's'}
                                    .
                                </p>
                                {preview.sampleRuns.length > 0 && (
                                    <div className="table-responsive">
                                        <table className="table table-sm align-middle mb-0">
                                            <thead>
                                                <tr>
                                                    <th>Runner</th>
                                                    <th className="text-end">
                                                        Time
                                                    </th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {preview.sampleRuns.map((s) => (
                                                    <tr key={s.runId}>
                                                        <td>{s.runnerName}</td>
                                                        <td className="text-end">
                                                            <DurationToFormatted
                                                                duration={
                                                                    s.timeMs
                                                                }
                                                            />
                                                        </td>
                                                        <td className="small text-muted">
                                                            {s.currentStatus}
                                                            {' → '}
                                                            {s.newStatus}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="mt-3">
                            <label
                                htmlFor="verdict-reason"
                                className="form-label small text-muted mb-1"
                            >
                                Reason — required, min {MIN_REASON} characters,
                                audit-logged
                            </label>
                            <textarea
                                id="verdict-reason"
                                className="form-control form-control-sm"
                                rows={2}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                disabled={isConfirming}
                            />
                        </div>

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
                            className={`btn btn-sm btn-${labels.variant}`}
                            onClick={handleConfirm}
                            disabled={busy || !reasonOk || !!previewError}
                        >
                            {isConfirming ? 'Working…' : labels.confirm}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
