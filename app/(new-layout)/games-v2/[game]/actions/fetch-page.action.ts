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
    const page = Math.max(1, Math.floor(q.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Math.floor(q.pageSize ?? 25)));
    const res = await getLeaderboard({ ...q, page, pageSize });
    return res.ok ? res.result : null;
}
