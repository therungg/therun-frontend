import { cacheLife, cacheTag } from 'next/cache';
import type { PublicModLogPage } from '../../../types/moderation.types';
import { modFetch } from './mod-fetch';

export interface PublicModLogQuery {
    gameId: number;
    limit?: number;
    offset?: number;
    categoryId?: number;
    /** Filters to a single actor — reserved for a future "by moderator" filter. */
    targetUserId?: number;
    /** Omit for "all time". */
    days?: number;
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/**
 * Public per-game moderation log — no auth. Rides `/mod/v1/leaderboards/games/{gameId}/mod-log`
 * (backend branch board-mod-unified-log). Cached like the board itself
 * (`getLeaderboard`): short `'use cache'` window, invalidated immediately by
 * the mod path's own writes via `updateTag(modLogTag(gameId))` — see
 * revalidate-boards.ts.
 */
export async function getPublicModLog(
    q: PublicModLogQuery,
): Promise<PublicModLogPage> {
    'use cache';
    cacheLife('minutes');
    cacheTag(modLogTag(q.gameId));

    const limit = Math.min(MAX_LIMIT, Math.max(1, q.limit ?? DEFAULT_LIMIT));
    const offset = Math.max(0, q.offset ?? 0);

    return modFetch<PublicModLogPage>(
        `/v1/leaderboards/games/${q.gameId}/mod-log`,
        {
            query: {
                limit,
                offset,
                categoryId: q.categoryId,
                targetUserId: q.targetUserId,
                days: q.days,
            },
        },
    );
}

/** Shared with revalidate-boards.ts so mutations bust exactly this tag. */
export function modLogTag(gameId: number): string {
    return `mod-log:${gameId}`;
}
