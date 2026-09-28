'use server';

import { getPublicBoardRuns } from '~src/lib/leaderboards-profile';
import type { PublicBoardRuns } from '../../types/leaderboards-profile.types';

/** The History list's All runs, for anyone: states only, no reasons. */
export async function loadPublicBoardRunsAction(
    name: string,
    categoryId: number,
    subcategoryKey: string,
    page: number,
): Promise<({ ok: true } & PublicBoardRuns) | { error: string }> {
    try {
        const res = await getPublicBoardRuns(
            name,
            categoryId,
            subcategoryKey,
            page,
        );
        if (!res) return { ok: true, items: [], page, hasMore: false };
        return { ok: true, ...res };
    } catch {
        return { error: 'Something went wrong.' };
    }
}
