'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SrcImportJob } from '../../../../../../types/src-import.types';
import type { ActionResult } from './src-import-actions';

const TERMINAL = new Set<SrcImportJob['status']>(['done', 'failed']);
// Commit-phase statuses where a worker is running async and the UI must keep
// polling until it settles. The staging `status` is already 'done' throughout
// the commit phase, so without this the poll would stop and the console would
// sit on "Applying configuration…" forever even after the worker finished.
const COMMIT_IN_PROGRESS = new Set<NonNullable<SrcImportJob['commitStatus']>>([
    'applying',
    'importing',
    'reconciling',
    'undoing',
]);
export const POLL_MS = 5000;

/**
 * Loads the game's latest import job on mount and keeps polling while either
 * the staging job is queued/running OR a commit-phase worker is in progress.
 * `refresh()` forces an immediate read — the pane calls it right after a POST
 * so the new state shows up without waiting a tick.
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

    // Poll while staging is running, or while a commit-phase worker is. The
    // key changes identity when the reason to poll changes, so the interval
    // re-subscribes correctly and stops the moment the job settles.
    const pollKey =
        job === null
            ? null
            : !TERMINAL.has(job.status)
              ? `status:${job.status}`
              : job.commitStatus && COMMIT_IN_PROGRESS.has(job.commitStatus)
                ? `commit:${job.commitStatus}`
                : null;

    useEffect(() => {
        if (pollKey === null) return;
        const interval = setInterval(() => void read(), POLL_MS);
        return () => clearInterval(interval);
    }, [pollKey, read]);

    return { job, loading, error, refresh: read };
}
