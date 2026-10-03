import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';

/** Board bulk-selection key: `r:<runId>`. */
export type BoardSelectionKey = string;

/** The selection key for an entry, or null when the row isn't selectable. */
export function entrySelectionKey(
    entry: LeaderboardEntry,
): BoardSelectionKey | null {
    return entry.runId != null ? `r:${entry.runId}` : null;
}
