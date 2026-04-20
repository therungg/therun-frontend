'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BackupVersionsResponse } from 'types/backups.types';
import { getBackupVersions } from '~src/actions/backup-versions.action';
import type { Run } from '~src/common/types';
import { Backups } from './backups';
import { CurrentSplits } from './current-splits';

interface DownloadsTabProps {
    run: Run;
    username: string;
    isActive: boolean;
}

type FetchState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'loaded'; data: BackupVersionsResponse; fetchedAt: number }
    | { status: 'empty'; fetchedAt: number }
    | { status: 'error' };

const FRESHNESS_MS = 13 * 60 * 1000; // refetch if older than 13 min

export function DownloadsTab({ run, username, isActive }: DownloadsTabProps) {
    const [state, setState] = useState<FetchState>({ status: 'idle' });
    const hasLoadedOnce = useRef(false);

    const load = useCallback(async () => {
        if (!run.splitsFile) {
            setState({ status: 'empty', fetchedAt: Date.now() });
            return;
        }
        setState({ status: 'loading' });
        const result = await getBackupVersions(username, run.splitsFile);
        if (result.status === 'ok') {
            setState({
                status: 'loaded',
                data: result.data,
                fetchedAt: Date.now(),
            });
        } else if (result.status === 'not-found') {
            setState({ status: 'empty', fetchedAt: Date.now() });
        } else {
            setState({ status: 'error' });
        }
    }, [username, run.splitsFile]);

    useEffect(() => {
        if (!isActive) return;
        if (hasLoadedOnce.current) return;
        hasLoadedOnce.current = true;
        void load();
    }, [isActive, load]);

    // Refetch on every tab activation if the cached data is stale.
    useEffect(() => {
        if (!isActive) return;
        if (state.status !== 'loaded' && state.status !== 'empty') return;
        if (Date.now() - state.fetchedAt < FRESHNESS_MS) return;
        void load();
    }, [isActive, state, load]);

    const filenameBase = `${run.game}_${run.run}`;

    return (
        <div>
            <CurrentSplits run={run} />
            <Backups
                state={
                    state.status === 'loaded'
                        ? { status: 'loaded', data: state.data }
                        : state.status === 'empty'
                          ? { status: 'empty' }
                          : state.status === 'error'
                            ? { status: 'error' }
                            : { status: 'loading' }
                }
                filenameBase={filenameBase}
                onRetry={load}
            />
        </div>
    );
}
