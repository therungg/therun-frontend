'use client';

import type { ReactNode } from 'react';
import { useState, useTransition } from 'react';

interface Props {
    title: string;
    body?: ReactNode;
    confirmLabel: string;
    confirmVariant?: 'primary' | 'danger' | 'success';
    onConfirm: (reason: string) => Promise<void> | void;
    onClose: () => void;
}

const MIN = 10;

/** Generic "confirm with a required reason" modal, matching the moderation dialog style. */
export function ReasonModal({
    title,
    body,
    confirmLabel,
    confirmVariant = 'primary',
    onConfirm,
    onClose,
}: Props) {
    const [reason, setReason] = useState('');
    const [pending, start] = useTransition();
    const ok = reason.trim().length >= MIN;

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
                        <h5 className="modal-title">{title}</h5>
                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={onClose}
                            disabled={pending}
                        />
                    </div>
                    <div className="modal-body">
                        {body}
                        <label
                            htmlFor="reason-modal-input"
                            className="form-label small text-muted mb-1"
                        >
                            Reason — required, min {MIN} characters
                        </label>
                        <textarea
                            id="reason-modal-input"
                            className="form-control form-control-sm"
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={pending}
                        />
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={onClose}
                            disabled={pending}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm btn-${confirmVariant}`}
                            disabled={!ok || pending}
                            onClick={() =>
                                start(async () => {
                                    await onConfirm(reason.trim());
                                })
                            }
                        >
                            {pending ? 'Working…' : confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
