'use client';

import moment from 'moment';
import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { GameMergeRequest } from '../../../../types/reassignments.types';
import { decideMergeRequestAction } from './actions/decide.action';
import styles from './merge-requests.module.scss';

interface Row extends GameMergeRequest {
    sourceDisplay: string;
    targetDisplay: string;
}

/**
 * Merges somebody asked for and cannot grant themselves: they moderate the
 * game being merged INTO, not the one being merged away. Approving is a
 * decision about the game that disappears, so its name leads.
 */
export function MergeRequestsClient({ requests }: { requests: Row[] }) {
    const [pending, startTransition] = useTransition();
    const [declining, setDeclining] = useState<number | null>(null);
    const [reason, setReason] = useState('');

    function decide(id: number, decision: 'approve' | 'decline') {
        startTransition(async () => {
            const res = await decideMergeRequestAction(
                id,
                decision,
                decision === 'decline' ? reason.trim() || undefined : undefined,
            );
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success(
                decision === 'approve'
                    ? 'Merging. It runs on the queue.'
                    : 'Declined.',
            );
            setDeclining(null);
            setReason('');
        });
    }

    if (requests.length === 0) {
        return (
            <div className={styles.page}>
                <h1 className={styles.title}>Merge requests</h1>
                <p className={styles.empty}>Nothing waiting.</p>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>Merge requests</h1>
            <ul className={styles.list}>
                {requests.map((r) => (
                    <li key={r.id} className={styles.row}>
                        <div className={styles.what}>
                            <strong>{r.sourceDisplay}</strong> into{' '}
                            <strong>{r.targetDisplay}</strong>
                            <span className={styles.meta}>
                                asked {moment(r.performedAt).fromNow()}
                            </span>
                        </div>

                        {declining === r.id ? (
                            <div className={styles.actions}>
                                <input
                                    type="text"
                                    className={styles.reason}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Why (optional)"
                                    aria-label="Why this was declined"
                                    disabled={pending}
                                />
                                <button
                                    type="button"
                                    className={styles.decline}
                                    onClick={() => decide(r.id, 'decline')}
                                    disabled={pending}
                                >
                                    Decline
                                </button>
                                <button
                                    type="button"
                                    className={styles.cancel}
                                    onClick={() => setDeclining(null)}
                                    disabled={pending}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <div className={styles.actions}>
                                <button
                                    type="button"
                                    className={styles.approve}
                                    onClick={() => decide(r.id, 'approve')}
                                    disabled={pending}
                                >
                                    Approve
                                </button>
                                <button
                                    type="button"
                                    className={styles.cancel}
                                    onClick={() => setDeclining(r.id)}
                                    disabled={pending}
                                >
                                    Decline
                                </button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
