import type {
    ModQueueFilter,
    ModQueuePage,
} from '../../../types/moderation.types';
import { meFetch } from './mod-fetch';

/**
 * The verification queue for a game: every run on a *visible* board (main +
 * active, else the top five by playtime) that still needs a verdict.
 *
 * Unlike the per-category roster (`getCategoryRoster`) this is one call for
 * the whole game and it pages server-side — the queue is the daily loop, so
 * it must not depend on the moderator picking a category first.
 *
 * Read through the `/mod` proxy like every other moderation call: the main
 * gateway's custom domain drops the Authorization header on GET.
 */
export function listModQueue(
    sessionId: string,
    gameId: number,
    filter?: ModQueueFilter,
): Promise<ModQueuePage> {
    return meFetch(`/v1/leaderboards/mod-queue/${gameId}`, {
        sessionId,
        query: {
            categoryId: filter?.categoryId,
            status: filter?.status,
            page: filter?.page,
            pageSize: filter?.pageSize,
        },
    });
}
