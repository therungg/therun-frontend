'use client';

import moment from 'moment';
import { useState } from 'react';
import type { SrcRunSyncStatus } from '../../../../../../types/src-board-sync.types';
import styles from './src-sync.module.scss';
import { type Result, syncRunsNow } from './src-sync-actions';

export function RunsPart({
    gameId,
    status,
    canEdit,
    onStatus,
    onRefresh,
}: {
    gameId: number;
    status: SrcRunSyncStatus;
    canEdit: boolean;
    onStatus: (status: SrcRunSyncStatus) => void;
    onRefresh: () => void;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [now, setNow] = useState(() => Date.now());

    const run = async (action: () => Promise<Result<SrcRunSyncStatus>>) => {
        setBusy(true);
        setError(null);
        const res = await action();
        setBusy(false);
        setNow(Date.now());
        if ('result' in res) onStatus(res.result);
        else if (res.code === 429) onRefresh();
        else setError(res.error);
    };

    if (status.needsSettings && status.srcMode !== 'copy') {
        return (
            <div className={styles.part}>
                <h4 className={styles.listTitle}>Runs</h4>
                <p className={styles.counts}>Sync the settings first.</p>
            </div>
        );
    }

    const wait = status.syncNow.availableAt;
    const minutes = wait
        ? Math.max(1, Math.ceil((new Date(wait).getTime() - now) / 60000))
        : 0;
    const next = status.nextSyncAt ? moment(status.nextSyncAt) : null;
    const when =
        !next || !next.isAfter(now)
            ? 'soon'
            : next.isSame(now, 'day')
              ? `at ${next.format('HH:mm')}`
              : next.from(now);

    return (
        <div className={styles.part}>
            <h4 className={styles.listTitle}>Runs</h4>
            {status.running ? (
                <p className={styles.muted} aria-live="polite">
                    Syncing...
                </p>
            ) : (
                status.lastSync && (
                    <p className={styles.counts}>
                        Last sync {moment(status.lastSync.at).fromNow()}:{' '}
                        {status.lastSync.added} new, {status.lastSync.changed}{' '}
                        changed.
                    </p>
                )
            )}
            {!status.running &&
                status.lastError &&
                (next ? (
                    <p className={styles.muted}>
                        The last sync failed. We try again {when}.
                    </p>
                ) : (
                    <p className={styles.muted}>The last sync failed.</p>
                ))}
            {error && (
                <p className={styles.error} role="alert">
                    {error}
                </p>
            )}
            {canEdit &&
                !status.running &&
                (status.syncNow.allowed ? (
                    <div className={styles.footer}>
                        <button
                            type="button"
                            className={styles.secondary}
                            onClick={() => run(() => syncRunsNow(gameId))}
                            disabled={busy}
                        >
                            Sync now
                        </button>
                    </div>
                ) : (
                    wait &&
                    status.lastSyncAt && (
                        <p className={styles.muted}>
                            Synced {moment(status.lastSyncAt).fromNow()}. You
                            can sync again in {minutes}{' '}
                            {minutes === 1 ? 'minute' : 'minutes'}.
                        </p>
                    )
                ))}
        </div>
    );
}
