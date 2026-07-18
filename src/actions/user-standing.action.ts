'use server';

import { getSession } from '~src/actions/session.action';
import { getUserRankingsByName } from '~src/lib/leaderboards-v1';
import type { UserRanking } from '../../types/leaderboards.types';

/**
 * The signed-in user's current standing on a specific board (game +
 * category + subcategory), for the submit form's "your current best"
 * context line. Wraps the already-cached `getUserRankingsByName` and
 * matches client-side selection against it. Null when signed out or the
 * user has no ranking on this exact board.
 */
export async function getMyStandingAction(
    gameSlug: string,
    categorySlug: string,
    subcategoryKey: string,
): Promise<UserRanking | null> {
    const session = await getSession();
    if (!session?.username) return null;

    const rankings = await getUserRankingsByName(session.username);
    return (
        rankings.find(
            (r) =>
                r.gameSlug === gameSlug &&
                r.categorySlug === categorySlug &&
                r.subcategoryKey === subcategoryKey,
        ) ?? null
    );
}
