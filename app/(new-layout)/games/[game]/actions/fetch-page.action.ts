'use server';

import {
    findRunnerOnBoard,
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

// "Find me": the backend locates the runner and returns their page in one
// round trip (findRunnerFound says whether it succeeded). Public read — the
// board only ever shows public rows, so no auth gate here either.
export async function findRunnerPage(
    q: LeaderboardQuery,
    runnerName: string,
): Promise<LeaderboardResponse | null> {
    const pageSize = Math.min(100, Math.max(1, Math.floor(q.pageSize ?? 25)));
    return findRunnerOnBoard({ ...q, page: 1, pageSize }, runnerName);
}
