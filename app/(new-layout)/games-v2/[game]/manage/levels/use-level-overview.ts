'use client';

import { useCallback, useEffect, useState } from 'react';
import { levelOverviewAction } from '~src/actions/levels/level-overview.action';
import type { LevelOverview } from '../../../../../../types/levels.types';

/**
 * The overview the Levels pane is built on. It is the only read the pane
 * makes, and every save is followed by a reload — the server is the single
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

    return { overview, loading, error, reload };
}
