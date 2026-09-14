'use client';

import { FormEvent, useState } from 'react';
import styles from '../admin.module.scss';
import {
    clearSrcIdentityAction,
    getSrcIdentityAction,
    type SrcIdentity,
    setSrcIdentityAction,
} from './actions/src-identity.action';

const errorText = (err: unknown) =>
    err instanceof Error ? err.message : 'An error occurred';

export const SrcIdentityForm = () => {
    const [username, setUsername] = useState('');
    const [current, setCurrent] = useState<SrcIdentity | null>(null);
    const [srcName, setSrcName] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const run = async (fn: () => Promise<void>) => {
        setLoading(true);
        setMessage('');
        setErrorMessage('');
        try {
            await fn();
        } catch (err) {
            setErrorMessage(errorText(err));
        } finally {
            setLoading(false);
        }
    };

    const handleLookup = (e: FormEvent) => {
        e.preventDefault();
        const name = username.trim();
        if (!name) return;
        setCurrent(null);
        run(async () => {
            const identity = await getSrcIdentityAction(name);
            setCurrent(identity);
            setSrcName(identity.srcUsername ?? '');
        });
    };

    const handleSave = (e: FormEvent) => {
        e.preventDefault();
        if (!current || !srcName.trim()) return;
        run(async () => {
            const res = await setSrcIdentityAction(
                current.username,
                srcName.trim(),
            );
            setCurrent({ ...current, ...res });
            setSrcName(res.srcUsername ?? '');
            setMessage(
                `Linked ${current.username} to ${res.srcUsername ?? res.srcUserId}.`,
            );
        });
    };

    const handleUnlink = () => {
        if (!current?.srcUserId) return;
        if (
            !window.confirm(
                `Remove the speedrun.com link for ${current.username}?`,
            )
        )
            return;
        run(async () => {
            await clearSrcIdentityAction(current.username);
            setCurrent({ ...current, srcUserId: null, srcUsername: null });
            setSrcName('');
            setMessage(`Unlinked ${current.username}.`);
        });
    };

    return (
        <div className={styles.page} style={{ maxWidth: '600px' }}>
            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <h4 className={styles.panelTitle}>speedrun.com Identity</h4>
                </div>
                <div className={styles.panelBody}>
                    <p
                        className={styles.pageSubtitle}
                        style={{ marginBottom: '1.5rem' }}
                    >
                        Link a therun.gg user to their speedrun.com account.
                    </p>
                    <form onSubmit={handleLookup}>
                        <div className={styles.formGroup}>
                            <label
                                htmlFor="username"
                                className={styles.formLabel}
                            >
                                therun.gg username
                            </label>
                            <input
                                type="text"
                                id="username"
                                className={styles.formInput}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Username"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className={styles.btnOutline}
                            disabled={loading || !username.trim()}
                            style={{ width: '100%' }}
                        >
                            Look up
                        </button>
                    </form>

                    {current && (
                        <form
                            onSubmit={handleSave}
                            style={{ marginTop: '1.5rem' }}
                        >
                            <p className={styles.pageSubtitle}>
                                <strong>{current.username}</strong> is{' '}
                                {current.srcUserId ? (
                                    <>
                                        linked to{' '}
                                        <strong>
                                            {current.srcUsername ??
                                                current.srcUserId}
                                        </strong>{' '}
                                        ({current.srcUserId})
                                    </>
                                ) : (
                                    'not linked'
                                )}
                            </p>
                            <div className={styles.formGroup}>
                                <label
                                    htmlFor="srcName"
                                    className={styles.formLabel}
                                >
                                    speedrun.com username or user id
                                </label>
                                <input
                                    type="text"
                                    id="srcName"
                                    className={styles.formInput}
                                    value={srcName}
                                    onChange={(e) => setSrcName(e.target.value)}
                                    placeholder="speedrun.com username"
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    type="submit"
                                    className={styles.btnPrimary}
                                    disabled={loading || !srcName.trim()}
                                    style={{ flex: 1 }}
                                >
                                    {loading ? 'Saving...' : 'Save'}
                                </button>
                                {current.srcUserId && (
                                    <button
                                        type="button"
                                        className={styles.btnDanger}
                                        disabled={loading}
                                        onClick={handleUnlink}
                                    >
                                        Unlink
                                    </button>
                                )}
                            </div>
                        </form>
                    )}

                    {message && (
                        <div className={styles.alertSuccess}>{message}</div>
                    )}

                    {errorMessage && (
                        <div className={styles.alertDanger}>{errorMessage}</div>
                    )}
                </div>
            </div>
        </div>
    );
};
