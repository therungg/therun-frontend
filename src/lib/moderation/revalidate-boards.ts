import { revalidateTag } from 'next/cache';
import { resolveCategory } from '~src/lib/games-v1';
import type { AffectedLeaderboard } from '../../../types/moderation.types';

/**
 * Invalidate the Next.js `'use cache'` leaderboard tags for the boards a
 * moderation action touched. Mirrors the tag scheme in `getLeaderboard`
 * (`lb:{gameSlug}:{categorySlug}:{subcategoryKey}:{rt|gt}:{v|a}`) and the
 * invalidation pattern in the shared verdict/exclude actions.
 *
 * The backend enqueues its own Redis rebuild; this only clears the frontend's
 * cached reads so the board reflects the change on next load. Best-effort.
 */
export async function revalidateAffectedBoards(
    gameId: number,
    gameSlug: string,
    affected: AffectedLeaderboard[],
): Promise<void> {
    if (affected.length === 0) return;
    try {
        const { categories } = await resolveCategory(gameId);
        const slugById = new Map(categories.map((c) => [c.id, c.name]));
        for (const { categoryId, subcategoryKey } of affected) {
            const categorySlug = slugById.get(categoryId);
            if (!categorySlug) continue;
            for (const timing of ['rt', 'gt'] as const) {
                for (const v of ['v', 'a'] as const) {
                    revalidateTag(
                        `lb:${gameSlug}:${categorySlug}:${subcategoryKey}:${timing}:${v}`,
                        'minutes',
                    );
                }
            }
        }
    } catch {
        // Best-effort cache invalidation; the TTL will catch up regardless.
    }
}
