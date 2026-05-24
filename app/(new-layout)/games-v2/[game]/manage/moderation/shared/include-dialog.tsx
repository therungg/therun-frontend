'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { includeAction } from './actions/include.action';

interface Props {
    gameSlug: string;
    runIds: number[];
    onDone: () => void;
    onClose: () => void;
}

const MIN_REASON = 10;

export function IncludeDialog({ gameSlug, runIds, onDone, onClose }: Props) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const reasonOk = reason.trim().length >= MIN_REASON;

    const handleConfirm = () => {
        if (!reasonOk) return;
        setError(null);
        startTransition(async () => {
            const res = await includeAction(gameSlug, runIds, reason.trim());
            if ('error' in res) {
                setError(res.error);
                return;
            }
            const n = res.result.affectedRunCount;
            toast.success(`Included — ${n} run${n === 1 ? '' : 's'} restored.`);
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
                            Include {runIds.length} run
                            {runIds.length === 1 ? '' : 's'}
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={onClose}
                            disabled={isPending}
                        />
                    </div>
                    <div className="modal-body">
                        <p className="text-muted small">
                            Re-includes the selected runs onto their
                            leaderboards (only clears a moderator override).
                        </p>
                        <label
                            htmlFor="include-reason"
                            className="form-label small text-muted mb-1"
                        >
                            Reason — required, min {MIN_REASON} characters,
                            audit-logged
                        </label>
                        <textarea
                            id="include-reason"
                            className="form-control form-control-sm"
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={isPending}
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
                            disabled={isPending}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={handleConfirm}
                            disabled={isPending || !reasonOk}
                        >
                            {isPending ? 'Including…' : 'Confirm include'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
