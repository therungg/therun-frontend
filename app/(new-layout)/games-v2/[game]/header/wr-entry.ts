import type {
    LeaderboardEntry,
    LeaderboardResponse,
} from '../../../../../types/leaderboards.types';

/**
 * The record for the board being displayed — filters included, so it always
 * agrees with the run count beside it in the masthead.
 *
 * Page 1 already carries rank 1. A deep-linked later page doesn't, and costs
 * one page-1 read; callers must route that through the cached `getLeaderboard`
 * so it is never a fresh hit and never a client waterfall. An empty board or a
 * failed read resolves to null and the masthead simply omits the record.
 */
export async function resolveWrEntry(
    leaderboard: LeaderboardResponse,
    fetchFirstPage: () => Promise<LeaderboardEntry[] | null>,
): Promise<LeaderboardEntry | null> {
    if (leaderboard.totalItems === 0) return null;
    if (leaderboard.page === 1) return leaderboard.entries[0] ?? null;
    const entries = await fetchFirstPage();
    return entries?.[0] ?? null;
}
