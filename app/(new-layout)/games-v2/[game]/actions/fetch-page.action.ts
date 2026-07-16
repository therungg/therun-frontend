'use server';

import {
    getLeaderboard,
    type LeaderboardQuery,
} from '~src/lib/leaderboards-v1';
import type { LeaderboardResponse } from '../../../../../types/leaderboards.types';

// Public read — same data the page itself renders; no auth gate.
export async function fetchLeaderboardPage(
    q: LeaderboardQuery,
): Promise<LeaderboardResponse | null> {
    const res = await getLeaderboard(q);
    return res.ok ? res.result : null;
}
