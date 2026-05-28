'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { manualTimeVerdictAction } from '../shared/actions/manual-times.action';
import styles from './manual-time-verdict-row.module.scss';

const MIN_REASON = 10;

interface Props {
    gameSlug: string;
    manualTimeId: number;
    onDone: () => void;
}

/** Verify/Reject control for a pending self-claim manual time. */
export function ManualTimeVerdictRow({
    gameSlug,
    manualTimeId,
    onDone,
}: Props) {
    const [verdict, setVerdict] = useState<'verify' | 'reject' | null>(null);
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isWorking, startWork] = useTransition();

    const reasonOk = reason.trim().length >= MIN_REASON;

    if (verdict == null) {
        return (
            <div className={styles.actions}>
                <button
                    type="button"
                    className="btn btn-sm btn-success"
                    onClick={() => setVerdict('verify')}
                >
                    Verify time
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => setVerdict('reject')}
                >
                    Reject time
                </button>
            </div>
        );
    }

    const handleConfirm = () => {
        if (!reasonOk) return;
        setError(null);
        startWork(async () => {
            const res = await manualTimeVerdictAction(
                gameSlug,
                manualTimeId,
                verdict,
                reason.trim(),
            );
            if ('error' in res) {
                setError(res.error);
                return;
            }
            toast.success(
                verdict === 'verify' ? 'Time verified.' : 'Time rejected.',
            );
            onDone();
        });
    };

    return (
        <div className={styles.form}>
            <label
                htmlFor={`mt-verdict-reason-${manualTimeId}`}
                className={styles.fieldLabel}
            >
                {verdict === 'verify' ? 'Verify' : 'Reject'} reason — required,
                min {MIN_REASON} characters, audit-logged
            </label>
            <textarea
                id={`mt-verdict-reason-${manualTimeId}`}
                className={styles.textarea}
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isWorking}
            />
            {!reasonOk && reason.length > 0 && (
                <div className={styles.reasonError}>
                    {MIN_REASON - reason.trim().length} more needed.
                </div>
            )}
            {error && (
                <div className={styles.errorAlert} role="alert">
                    {error}
                </div>
            )}
            <div className={styles.confirmRow}>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                        setVerdict(null);
                        setReason('');
                        setError(null);
                    }}
                    disabled={isWorking}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className={`btn btn-sm ${verdict === 'verify' ? 'btn-success' : 'btn-danger'}`}
                    onClick={handleConfirm}
                    disabled={isWorking || !reasonOk}
                >
                    {isWorking
                        ? 'Working…'
                        : verdict === 'verify'
                          ? 'Confirm verify'
                          : 'Confirm reject'}
                </button>
            </div>
        </div>
    );
}
