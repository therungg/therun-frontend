'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SrcImportJob } from '../../../../../../types/src-import.types';
import type { ActionResult } from './src-import-actions';

// Commit-phase statuses where a worker is running async.
const COMMIT_IN_PROGRESS = new Set<NonNullable<SrcImportJob['commitStatus']>>([
    'applying',
    'importing',
    'pruning',
    'reconciling',
    'undoing',
]);
export const POLL_MS = 5000;

/**
 * Whether a job has nothing more to do. A one-click kind auto-chains after
 * staging (settings: apply-config; resync: apply-config → import-runs →
 * prune), so "staging done, no commit yet" means the next step is queued —
 * not finished. A manual job is finished once staging ends and no commit
 * worker is running.
 */
export function isSettled(job: SrcImportJob): boolean {
    if (job.status === 'failed' || job.commitStatus === 'failed') return true;
    if (job.status !== 'done') return false;
    switch (job.kind) {
        case 'settings':
            return job.commitStatus === 'applied';
        case 'resync':
            return (
                job.commitStatus === 'pruned' ||
                job.commitStatus === 'reconciled'
            );
        default:
            return (
                job.commitStatus === null ||
                !COMMIT_IN_PROGRESS.has(job.commitStatus)
            );
    }
}

/**
 * Loads a job on mount and keeps polling until it settles. `refresh()` forces
 * an immediate read — the pane calls it right after a POST so the new state
 * shows up without waiting a tick.
 */
export function useSrcImportJob(
    fetcher: () => Promise<ActionResult<SrcImportJob | null>>,
): {
    job: SrcImportJob | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
} {
    const [job, setJob] = useState<SrcImportJob | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;
    const activeRef = useRef(true);

    const read = useCallback(async () => {
        const res = await fetcherRef.current();
        if (!activeRef.current) return;
        if ('error' in res) {
            setError(res.error);
        } else {
            setJob(res.result);
            setError(null);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        activeRef.current = true;
        void read();
        return () => {
            activeRef.current = false;
        };
    }, [read]);

    // The key changes identity whenever the reason to poll changes, so the
    // interval re-subscribes and stops the moment the job settles.
    const pollKey =
        job === null || isSettled(job)
            ? null
            : `${job.id}:${job.status}:${job.commitStatus ?? ''}`;

    useEffect(() => {
        if (pollKey === null) return;
        const interval = setInterval(() => void read(), POLL_MS);
        return () => clearInterval(interval);
    }, [pollKey, read]);

    return { job, loading, error, refresh: read };
}
