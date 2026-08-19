'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { levelOverviewAction } from '~src/actions/levels/level-overview.action';
import type { LevelOverview } from '../../../../../../types/levels.types';

/**
 * The overview both level panes are built on. It is the only read either pane
 * makes, and every write is followed by a reload — the server is the single
 * source of truth for which boards exist and how they've drifted, so nothing
 * here tries to patch the shape locally.
 */
export function useLevelOverview(gameSlug: string, gameId: number) {
    const [overview, setOverview] = useState<LevelOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        const res = await levelOverviewAction({ gameSlug, gameId });
        if ('error' in res) {
            setError(res.error);
            setLoading(false);
            return;
        }
        setError(null);
        setOverview(res.result);
        setLoading(false);
    }, [gameId, gameSlug]);

    useEffect(() => {
        void reload();
    }, [reload]);

    return { overview, loading, error, reload, setError };
}

/** What every levels server action resolves to. */
export type ActionResult = { error: string } | { result: unknown };

/**
 * One write, one error slot, one reload — the shape all seven level writes
 * share. Kept deliberately thin: it exists because the copies proved the
 * pattern, not to grow into a general action framework.
 */
export function useActionRunner(
    setError: (message: string | null) => void,
    onDone: () => void | Promise<void>,
) {
    const [isPending, startPending] = useTransition();

    const run = useCallback(
        (
            action: () => Promise<ActionResult>,
            /** Runs only on success — clearing a form the write consumed.
             * What a failed write does with the typed value is the caller's
             * call (create forms keep it; level rows reset to the server
             * value in their error sink). */
            onSuccess?: () => void,
        ) => {
            startPending(async () => {
                const res = await action();
                if ('error' in res) {
                    setError(res.error);
                    return;
                }
                setError(null);
                onSuccess?.();
                await onDone();
            });
        },
        [setError, onDone],
    );

    return { isPending, run };
}
