import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import type { LeaderboardRosterRow } from '../../../../../types/moderation.types';

/**
 * Adapts a public-board entry to the roster-row shape the console's mod
 * dialogs (MoveDialog, AdjustDialog, RunnerDialog) consume. The entry flags
 * are asserted true — anything rendered on the public board IS the runner's
 * current entry. Returns null when the entry has no finished_run to act on
 * (manual times).
 *
 * `subcategoryKey` is the entry's OWN key (built by the caller from
 * `entry.variables` + the board's subcategory defs), not the board's active
 * filter — a combined/filtered view can show entries from other slices.
 */
export function entryToRosterRow(
    entry: LeaderboardEntry,
    subcategoryKey: string,
): LeaderboardRosterRow | null {
    if (entry.runId == null) return null;
    return {
        runId: entry.runId,
        userId: entry.userId ?? null,
        runnerName: entry.runnerName,
        subcategoryKey,
        time: entry.realTime ?? entry.time,
        gameTime: entry.gameTime,
        verificationStatus: entry.verificationStatus,
        vodUrl: entry.vodUrl ?? null,
        endedAt: entry.runDate ?? '',
        isLeaderboardEntry: true,
        isLeaderboardEntryGt: true,
    };
}
