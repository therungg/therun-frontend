'use server';

import { getLeaderboard } from '~src/lib/leaderboards-v1';
import type { LeaderboardEntry } from '../../../../../../types/leaderboards.types';

interface Input {
    gameSlug: string;
    categorySlug: string;
    timing: 'rt' | 'gt';
}

export type PreviewEntry = Pick<
    LeaderboardEntry,
    | 'rank'
    | 'runnerName'
    | 'time'
    | 'realTime'
    | 'gameTime'
    | 'vodUrl'
    | 'verificationStatus'
>;

/**
 * Public read for the category-config live preview. Mirrors the public
 * board's own defaults — every field beyond gameSlug/categorySlug/timing is
 * omitted so the server applies the same subcategory/verified defaults the
 * game page uses. No session gate: this is public leaderboard data.
 */
export async function loadLeaderboardPreviewAction(
    input: Input,
): Promise<{ entries: PreviewEntry[] } | { error: string }> {
    try {
        const res = await getLeaderboard({
            gameSlug: input.gameSlug,
            categorySlug: input.categorySlug,
            timing: input.timing,
            pageSize: 20,
        });
        if (!res.ok) {
            return { error: 'This category has no valid leaderboard yet.' };
        }
        const entries: PreviewEntry[] = res.result.entries.map((e) => ({
            rank: e.rank,
            runnerName: e.runnerName,
            time: e.time,
            realTime: e.realTime,
            gameTime: e.gameTime,
            vodUrl: e.vodUrl,
            verificationStatus: e.verificationStatus,
        }));
        return { entries };
    } catch {
        return { error: 'Failed to load the leaderboard preview.' };
    }
}
