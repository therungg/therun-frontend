'use server';

import { getPublicModLog } from '~src/lib/moderation/public-mod-log';
import type { PublicModLogPage } from '../../../../../types/moderation.types';

// Public read — same public per-game moderation log the Moderation view
// renders on first load; no auth gate. "Load more" and the category filter
// both page through here.
export async function fetchModLogPage(q: {
    gameId: number;
    offset: number;
    categoryId?: number;
}): Promise<PublicModLogPage | null> {
    try {
        return await getPublicModLog({
            gameId: q.gameId,
            offset: Math.max(0, Math.floor(q.offset)),
            categoryId: q.categoryId,
        });
    } catch {
        return null;
    }
}
