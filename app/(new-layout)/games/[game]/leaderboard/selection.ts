import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';

/**
 * Board bulk-selection key. Runs and manual (set) times live in different
 * id spaces on the backend, so a bare number can't identify a selected row —
 * `r:<runId>` / `m:<manualTimeId>` keeps both selectable in one Set.
 */
export type BoardSelectionKey = string;

/** The selection key for an entry, or null when the row isn't selectable. */
export function entrySelectionKey(
    entry: LeaderboardEntry,
): BoardSelectionKey | null {
    if (entry.runId != null) return `r:${entry.runId}`;
    if (entry.source === 'manual' && entry.manualTimeId != null) {
        return `m:${entry.manualTimeId}`;
    }
    return null;
}

/** Splits a selection back into the two backend id spaces. */
export function splitSelectionKeys(keys: Iterable<BoardSelectionKey>): {
    runIds: number[];
    manualTimeIds: number[];
} {
    const runIds: number[] = [];
    const manualTimeIds: number[] = [];
    for (const key of keys) {
        const id = Number(key.slice(2));
        if (key.startsWith('r:')) runIds.push(id);
        else if (key.startsWith('m:')) manualTimeIds.push(id);
    }
    return { runIds, manualTimeIds };
}
