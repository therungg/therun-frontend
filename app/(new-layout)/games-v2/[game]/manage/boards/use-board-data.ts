'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
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

    // What this render is actually showing — checked before an in-flight
    // fetch's result gets applied. `reload` is handed out to callers (undo
    // toasts, sibling-row mutations) that stash it in a closure and may not
    // invoke it until well after the mod has switched category/subcategory.
    // Since `rows`/`setRows` live in this one hook instance across that
    // switch (the component isn't remounted), an old closure's `load` — built
    // from the *previous* categoryId/subcategoryKey — would otherwise
    // overwrite the *new* selection's rows with the old board's data once its
    // request finally resolves.
    const selectionRef = useRef({ categoryId, subcategoryKey });
    selectionRef.current = { categoryId, subcategoryKey };

    const load = useCallback(() => {
        if (categoryId == null) {
            setRows([]);
            setError(null);
            return;
        }
        const filter: RosterFilter = {
            subcategoryKey: subcategoryKey || undefined,
        };
        const requested = { categoryId, subcategoryKey };
        startTransition(async () => {
            const res = await loadRosterAction(gameSlug, categoryId, filter);
            const current = selectionRef.current;
            if (
                current.categoryId !== requested.categoryId ||
                current.subcategoryKey !== requested.subcategoryKey
            ) {
                // Selection moved on while this request was in flight —
                // this result belongs to a board the mod isn't looking at
                // anymore.
                return;
            }
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
