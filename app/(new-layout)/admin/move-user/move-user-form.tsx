'use client';

import { FormEvent, useState } from 'react';
import styles from '../admin.module.scss';
import { moveUserAction } from './actions/move-user.action';

export const MoveUserForm = () => {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [status, setStatus] = useState<
        'idle' | 'loading' | 'success' | 'error'
    >('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!from.trim() || !to.trim()) return;

        setStatus('loading');
        setErrorMessage('');

        try {
            await moveUserAction(from.trim(), to.trim());
            setStatus('success');
            setFrom('');
            setTo('');
        } catch (err) {
            setStatus('error');
            setErrorMessage(
                err instanceof Error ? err.message : 'An error occurred',
            );
        }
    };

    return (
        <div className={styles.page} style={{ maxWidth: '600px' }}>
            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <h4 className={styles.panelTitle}>Move User</h4>
                </div>
                <div className={styles.panelBody}>
                    <p
                        className={styles.pageSubtitle}
                        style={{ marginBottom: '1.5rem' }}
                    >
                        Move a user from one username to another. This will
                        transfer all data to the new username.
                    </p>
                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label htmlFor="from" className={styles.formLabel}>
                                From (current username)
                            </label>
                            <input
                                type="text"
                                id="from"
                                className={styles.formInput}
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                placeholder="Current username"
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="to" className={styles.formLabel}>
                                To (new username)
                            </label>
                            <input
                                type="text"
                                id="to"
                                className={styles.formInput}
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                placeholder="New username"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className={styles.btnPrimary}
                            disabled={
                                status === 'loading' ||
                                !from.trim() ||
                                !to.trim()
                            }
                            style={{ width: '100%' }}
                        >
                            {status === 'loading'
                                ? 'Moving user...'
                                : 'Move User'}
                        </button>
                    </form>

                    {status === 'success' && (
                        <div className={styles.alertSuccess}>
                            User moved successfully.
                        </div>
                    )}

                    {status === 'error' && (
                        <div className={styles.alertDanger}>{errorMessage}</div>
                    )}
                </div>
            </div>
        </div>
    );
};
