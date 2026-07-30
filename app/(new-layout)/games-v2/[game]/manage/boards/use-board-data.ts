'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import type {
    LeaderboardRosterRow,
    RosterFilter,
} from '../../../../../../types/moderation.types';
import { loadRosterAction } from '../moderation/roster/actions/load-roster.action';

export interface UseBoardData {
    rows: LeaderboardRosterRow[];
    loading: boolean;
    error: string | null;
    reload: () => void;
}

/**
 * Loads one board's roster through the mod roster endpoint
 * (`loadRosterAction` — the same `eligible-runs` read `RosterView` uses),
 * narrowed to one subcategory key. `BoardCuration` filters the returned
 * rows down to actual leaderboard entries itself; this hook is just the
 * fetch/loading/error/reload plumbing every curation task builds on —
 * every mutation (Tasks 10-12) calls `reload()` after a successful action
 * rather than optimistically patching local state here.
 */
export function useBoardData(
    gameSlug: string,
    categoryId: number | null,
    subcategoryKey: string,
): UseBoardData {
    const [rows, setRows] = useState<LeaderboardRosterRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const load = useCallback(() => {
        if (categoryId == null) {
            setRows([]);
            setError(null);
            return;
        }
        const filter: RosterFilter = {
            subcategoryKey: subcategoryKey || undefined,
        };
        startTransition(async () => {
            const res = await loadRosterAction(gameSlug, categoryId, filter);
            if ('error' in res) {
                setError(res.error);
                setRows([]);
                return;
            }
            setError(null);
            setRows(res.rows);
        });
    }, [gameSlug, categoryId, subcategoryKey]);

    useEffect(() => {
        load();
    }, [load]);

    return { rows, loading: isPending, error, reload: load };
}
