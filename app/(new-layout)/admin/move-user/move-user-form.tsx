'use client';

import { FormEvent, useState } from 'react';
import type {
    MergeApplyResponse,
    MergePreviewResponse,
    MergeResult,
} from '../../../../types/username-change.types';
import styles from '../admin.module.scss';
import {
    mergeUsersAction,
    moveUserAction,
    previewMergeAction,
} from './actions/move-user.action';

function PerTableRows({ perTable }: { perTable: MergeResult['perTable'] }) {
    const rows = Object.entries(perTable).filter(
        ([, counts]) => counts.moved > 0 || counts.dropped > 0,
    );

    if (rows.length === 0) {
        return (
            <tr>
                <td colSpan={3}>
                    <span className={styles.noData}>
                        Nothing to move on either side.
                    </span>
                </td>
            </tr>
        );
    }

    return (
        <>
            {rows.map(([table, counts]) => (
                <tr key={table}>
                    <td>{table}</td>
                    <td>{counts.moved}</td>
                    <td>{counts.dropped}</td>
                </tr>
            ))}
        </>
    );
}

function MergeResultPanel({ result }: { result: MergeResult }) {
    return (
        <>
            <div style={{ overflowX: 'auto' }}>
                <table className={styles.table}>
                    <thead className={styles.tableHeader}>
                        <tr>
                            <th>Table</th>
                            <th>Moved</th>
                            <th>Dropped</th>
                        </tr>
                    </thead>
                    <tbody className={styles.tableBody}>
                        <PerTableRows perTable={result.perTable} />
                    </tbody>
                </table>
            </div>

            {result.suspectedDuplicateRuns.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                    <p className={styles.formLabel}>
                        Suspected duplicate runs — the same attempt logged on
                        both accounts. The merge does not resolve these.
                    </p>
                    <ul>
                        {result.suspectedDuplicateRuns.map((dup) => (
                            <li
                                key={dup.ids.join('-')}
                                className={styles.pageSubtitle}
                                style={{ marginBottom: 0 }}
                            >
                                game {dup.gameId}
                                {dup.categoryId !== null
                                    ? `, category ${dup.categoryId}`
                                    : ''}{' '}
                                · {dup.time}ms · runs {dup.ids.join(', ')}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </>
    );
}

function MergeAccountsPanel() {
    const [twitchUserId, setTwitchUserId] = useState('');
    const [previewStatus, setPreviewStatus] = useState<
        'idle' | 'loading' | 'error'
    >('idle');
    const [previewError, setPreviewError] = useState('');
    const [preview, setPreview] = useState<MergePreviewResponse | null>(null);

    const [mergeStatus, setMergeStatus] = useState<
        'idle' | 'loading' | 'success' | 'error'
    >('idle');
    const [mergeError, setMergeError] = useState('');
    const [merged, setMerged] = useState<MergeApplyResponse | null>(null);

    const resetOutcome = () => {
        setPreview(null);
        setPreviewStatus('idle');
        setPreviewError('');
        setMerged(null);
        setMergeStatus('idle');
        setMergeError('');
    };

    const handlePreview = async (e: FormEvent) => {
        e.preventDefault();
        if (!twitchUserId.trim()) return;

        setPreviewStatus('loading');
        setPreviewError('');
        setMerged(null);
        setMergeStatus('idle');
        setMergeError('');

        try {
            const result = await previewMergeAction(twitchUserId.trim());
            setPreview(result);
            setPreviewStatus('idle');
        } catch (err) {
            setPreview(null);
            setPreviewStatus('error');
            setPreviewError(
                err instanceof Error ? err.message : 'An error occurred',
            );
        }
    };

    const handleMerge = async () => {
        if (!preview) return;

        const { plan } = preview;
        const confirmed = confirm(
            `This merges account ${plan.losingUserId} into ${plan.survivingUserId} and renames the` +
                ` survivor to "${plan.finalUsername}". This cannot be undone. Continue?`,
        );
        if (!confirmed) return;

        setMergeStatus('loading');
        setMergeError('');

        try {
            const result = await mergeUsersAction(twitchUserId.trim());
            setMerged(result);
            setMergeStatus('success');
        } catch (err) {
            setMergeStatus('error');
            setMergeError(
                err instanceof Error ? err.message : 'An error occurred',
            );
        }
    };

    return (
        <div className={styles.panel} style={{ marginTop: '1.5rem' }}>
            <div className={styles.panelHeader}>
                <h4 className={styles.panelTitle}>Merge duplicate accounts</h4>
            </div>
            <div className={styles.panelBody}>
                <p
                    className={styles.pageSubtitle}
                    style={{ marginBottom: '1.5rem' }}
                >
                    Folds two accounts that share a Twitch id into one, keeping
                    Twitch's current login as the surviving username. Preview
                    first — the merge itself cannot be undone.
                </p>

                <form onSubmit={handlePreview}>
                    <div className={styles.formGroup}>
                        <label
                            htmlFor="twitchUserId"
                            className={styles.formLabel}
                        >
                            Twitch user id
                        </label>
                        <input
                            type="text"
                            id="twitchUserId"
                            className={styles.formInput}
                            value={twitchUserId}
                            onChange={(e) => {
                                setTwitchUserId(e.target.value);
                                resetOutcome();
                            }}
                            placeholder="Shared Twitch id"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className={styles.btnOutline}
                        disabled={
                            previewStatus === 'loading' || !twitchUserId.trim()
                        }
                    >
                        {previewStatus === 'loading'
                            ? 'Previewing…'
                            : 'Preview'}
                    </button>
                </form>

                {previewStatus === 'error' && (
                    <div className={styles.alertDanger}>{previewError}</div>
                )}

                {preview && (
                    <div style={{ marginTop: '1.5rem' }}>
                        <p className={styles.formLabel}>
                            Account {preview.plan.losingUserId} moves into{' '}
                            {preview.plan.survivingUserId}, which is renamed to
                            &quot;{preview.plan.finalUsername}&quot;.
                        </p>
                        <MergeResultPanel result={preview.preview} />
                    </div>
                )}

                <button
                    type="button"
                    className={styles.btnDanger}
                    style={{ marginTop: '1rem' }}
                    disabled={!preview || mergeStatus === 'loading'}
                    onClick={handleMerge}
                >
                    {mergeStatus === 'loading' ? 'Merging…' : 'Merge accounts'}
                </button>

                {mergeStatus === 'error' && (
                    <div className={styles.alertDanger}>{mergeError}</div>
                )}

                {mergeStatus === 'success' && merged && (
                    <div style={{ marginTop: '1.5rem' }}>
                        <div className={styles.alertSuccess}>
                            Merged. Rename job {merged.jobId} queued — check the
                            queues page for its progress.
                        </div>
                        <MergeResultPanel result={merged.merged} />
                    </div>
                )}
            </div>
        </div>
    );
}

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

            <MergeAccountsPanel />
        </div>
    );
};
