'use server';

import {
    getLeaderboardExport,
    type LeaderboardQuery,
} from '~src/lib/leaderboards-v1';
import type { LeaderboardExportResponse } from '../../../../../types/leaderboards.types';

// Public read — same visibility as the board itself; no auth gate. Returns
// null on a vanished game/category/combination so the client can show a
// retryable error instead of crashing the page.
export async function exportLeaderboard(
    q: Omit<LeaderboardQuery, 'page' | 'pageSize'>,
): Promise<LeaderboardExportResponse | null> {
    try {
        return await getLeaderboardExport(q);
    } catch {
        return null;
    }
}
