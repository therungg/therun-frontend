import { normalizeSlug } from '~src/lib/normalize-slug';
import type {
    RecentPb,
    ResolvedCategory,
} from '../../../../../types/leaderboards.types';

/**
 * How many PBs to pull. `/v1/finished-runs` now filters to Featured boards
 * server-side (`is_main`/`active`, see getRecentPbs), so this window is
 * already all-Featured.
 *
 * It is sized for the Most active panel, not for the five rows Recent PBs
 * shows: that panel counts each runner's PBs over a 30-day window off this
 * same response (deriveActiveRunners), so the window has to be wide enough
 * to hold a busy game's month. One fetch feeds both panels.
 */
export const RECENT_PB_FETCH_LIMIT = 100;

/**
 * Narrows the Recent PBs feed to the game's Featured categories.
 *
 * `/v1/finished-runs` does this server-side when asked (`is_main`/`active`,
 * see getRecentPbs) — that's what makes the "recent" window honest. This
 * stays as the guarantee's floor: it holds for a payload cached from before
 * the filter existed, for a backend rollback, and for any future caller that
 * forgets the params. Linking a runner to a board that isn't publicly
 * reachable is the bug both layers close.
 *
 * Matching is by category id (the backend returns `categoryId` on every row).
 * The display-name fallback exists for rows that arrive without one — a
 * cached payload from before the field was mirrored, say. It compares against
 * both `name` and `display` because the API's `category` string is the
 * category's display form while `name` is its slug, and normalizeSlug folds
 * the two together. A row we can't place in either way is dropped: "unknown
 * category" must not read as "featured".
 */
export function filterPbsToFeatured(
    pbs: RecentPb[],
    featured: ResolvedCategory[],
): RecentPb[] {
    if (featured.length === 0) return [];

    const ids = new Set(featured.map((c) => c.id));
    const slugs = new Set(
        featured.flatMap((c) => [
            normalizeSlug(c.name),
            normalizeSlug(c.display),
        ]),
    );

    return pbs.filter((pb) => {
        if (typeof pb.categoryId === 'number') return ids.has(pb.categoryId);
        if (typeof pb.category === 'string' && pb.category.length > 0) {
            return slugs.has(normalizeSlug(pb.category));
        }
        return false;
    });
}
