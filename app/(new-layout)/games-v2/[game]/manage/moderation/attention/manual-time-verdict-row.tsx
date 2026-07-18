'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { manualTimeVerdictAction } from '../shared/actions/manual-times.action';
import styles from './manual-time-verdict-row.module.scss';

const MIN_REASON = 10;

// verify mirrors the run-action dialog's approve pattern (T15/T16): a note
// is optional and audit-logged, not gated. reject stays gated at MIN_REASON
// — it's consequential for the runner and the reason is shown to them.
const DEFAULT_REASON = 'Verified — evidence checks out.';

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

    // verify is optional (falls back to DEFAULT_REASON, like approve on the
    // run-action dialog); reject stays required — it's consequential for
    // the runner and the reason is shown to them.
    const reasonRequired = verdict === 'reject';
    const reasonOk = reasonRequired ? reason.trim().length >= MIN_REASON : true;

    if (verdict == null) {
        return (
            <div className={styles.actions}>
                <button
                    type="button"
                    className="btn btn-sm btn-success"
                    onClick={() => setVerdict('verify')}
                >
                    Verify claim
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => setVerdict('reject')}
                >
                    Reject claim
                </button>
            </div>
        );
    }

    const handleConfirm = () => {
        if (!reasonOk) return;
        setError(null);
        startWork(async () => {
            const trimmed = reason.trim();
            const finalReason =
                trimmed.length > 0
                    ? trimmed
                    : verdict === 'verify'
                      ? DEFAULT_REASON
                      : trimmed;
            const res = await manualTimeVerdictAction(
                gameSlug,
                manualTimeId,
                verdict,
                finalReason,
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
                {verdict === 'verify'
                    ? 'Note — optional, audit-logged'
                    : 'Reject reason — required, shown to the runner'}
            </label>
            <textarea
                id={`mt-verdict-reason-${manualTimeId}`}
                className={styles.textarea}
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isWorking}
            />
            {reasonRequired && !reasonOk && reason.length > 0 && (
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
                          ? 'Verify claim'
                          : 'Reject claim'}
                </button>
            </div>
        </div>
    );
}
