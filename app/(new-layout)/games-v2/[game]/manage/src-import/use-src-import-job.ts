'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SrcImportJob } from '../../../../../../types/src-import.types';
import type { ActionResult } from './src-import-actions';

const TERMINAL = new Set<SrcImportJob['status']>(['done', 'failed']);
export const POLL_MS = 5000;

/**
 * Loads the game's latest import job on mount and keeps polling while it is
 * queued/running. `refresh()` forces an immediate read — the pane calls it
 * right after a POST so the new job shows up without waiting a tick.
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

    const inFlight =
        job !== null && !TERMINAL.has(job.status) ? job.status : null;

    useEffect(() => {
        if (inFlight === null) return;
        const interval = setInterval(() => void read(), POLL_MS);
        return () => clearInterval(interval);
    }, [inFlight, read]);

    return { job, loading, error, refresh: read };
}
