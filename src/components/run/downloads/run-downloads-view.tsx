'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BackupVersionsResponse } from 'types/backups.types';
import { getBackupVersions } from '~src/actions/backup-versions.action';
import type { Run } from '~src/common/types';
import { Backups } from './backups';
import { CurrentSplits } from './current-splits';

type FetchState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'loaded'; data: BackupVersionsResponse; fetchedAt: number }
    | {
          status: 'empty';
          viewerIsSupporter: boolean;
          viewerIsOwner: boolean;
          fetchedAt: number;
      }
    | { status: 'error' };

const FRESHNESS_MS = 13 * 60 * 1000;

interface RunDownloadsViewProps {
    run: Run;
    /**
     * Username of the run owner (used for backup API calls). Usually
     * `run.user` but kept explicit so callers can forward a route param.
     */
    username: string;
    /**
     * Set true when the surrounding tab/panel is visible so we lazy-load.
     */
    isActive: boolean;
}

export function RunDownloadsView({
    run,
    username,
    isActive,
}: RunDownloadsViewProps) {
    const [state, setState] = useState<FetchState>({ status: 'idle' });
    const loadedFor = useRef<string | null>(null);

    const splitsKey = run.splitsFile ?? `__no-splits__/${run.game}/${run.run}`;

    const load = useCallback(async () => {
        if (!run.splitsFile) {
            setState({
                status: 'empty',
                viewerIsSupporter: false,
                viewerIsOwner: false,
                fetchedAt: Date.now(),
            });
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
            setState({
                status: 'empty',
                viewerIsSupporter: result.viewerIsSupporter,
                viewerIsOwner: result.viewerIsOwner,
                fetchedAt: Date.now(),
            });
        } else {
            setState({ status: 'error' });
        }
    }, [username, run.splitsFile]);

    // Refetch when switching to a different run, or on first activation.
    useEffect(() => {
        if (!isActive) return;
        if (loadedFor.current === splitsKey) return;
        loadedFor.current = splitsKey;
        void load();
    }, [isActive, splitsKey, load]);

    // Refetch stale data on re-activation.
    useEffect(() => {
        if (!isActive) return;
        if (state.status !== 'loaded' && state.status !== 'empty') return;
        if (Date.now() - state.fetchedAt < FRESHNESS_MS) return;
        void load();
    }, [isActive, state, load]);

    const filenameBase = `${run.user}_${run.game}_${run.run}`;

    return (
        <>
            <CurrentSplits run={run} />
            <Backups
                state={
                    state.status === 'loaded'
                        ? { status: 'loaded', data: state.data }
                        : state.status === 'empty'
                          ? {
                                status: 'empty',
                                viewerIsSupporter: state.viewerIsSupporter,
                                viewerIsOwner: state.viewerIsOwner,
                            }
                          : state.status === 'error'
                            ? { status: 'error' }
                            : { status: 'loading' }
                }
                filenameBase={filenameBase}
                onRetry={load}
            />
        </>
    );
}
