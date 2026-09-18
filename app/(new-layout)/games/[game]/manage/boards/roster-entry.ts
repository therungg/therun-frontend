import type {
    LeaderboardEntry,
    LeaderboardResponse,
    ResolvedCategory,
} from '../../../../../../types/leaderboards.types';
import type { LeaderboardRosterRow } from '../../../../../../types/moderation.types';

/**
 * The one seam between the moderator roster endpoint and the public board
 * table.
 *
 * Curation used to hand-roll its own table, which meant every presentation
 * decision the board made — column order, tie-aware ranks, the RTA-fallback
 * tag, milliseconds — had to be re-made here, and they drifted. Now curation
 * renders `LeaderboardTable`, and this is the only code that knows the two
 * endpoints describe the same runs with different field names.
 *
 * Fields the roster genuinely does not carry (`variables`/`rawVariables`)
 * come back absent rather than empty, so the table's own auto-hide rules
 * drop the columns instead of drawing them full of dashes.
 */
export function rosterEntry(
    row: LeaderboardRosterRow,
    rank: number,
): LeaderboardEntry {
    return {
        runId: row.runId,
        rank,
        runnerName: row.runnerName,
        userId: row.userId,
        isGuest: row.userId == null,
        // `time` is the roster's real time; the board splits the two clocks
        // and reads `time` only as a legacy alias, so both are stated.
        time: row.time,
        realTime: row.time,
        gameTime: row.gameTime,
        runDate: row.endedAt,
        vodUrl: row.vodUrl,
        verificationStatus:
            row.verificationStatus === 'verified' ||
            row.verificationStatus === 'rejected'
                ? row.verificationStatus
                : 'pending',
        picture: row.picture ?? null,
        country: row.country ?? null,
    };
}

/**
 * Wraps adapted rows in the response envelope `LeaderboardTable` reads.
 *
 * `hideRealTime`/`hideGameTime` come off the category rather than the
 * response because curation reads the roster endpoint, which has no board
 * config on it — the same two flags the public response would carry.
 */
export function rosterLeaderboard(
    rows: { row: LeaderboardRosterRow; rank: number }[],
    category: ResolvedCategory | null,
    page: number,
    pageSize: number,
    totalItems: number,
): LeaderboardResponse {
    return {
        entries: rows.map(({ row, rank }) => rosterEntry(row, rank)),
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
        hideRealTime: category?.hideRealTime ?? false,
        hideGameTime: category?.hideGameTime ?? false,
    };
}
