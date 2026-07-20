import { normalizeSlug } from '~src/lib/normalize-slug';
import type { ResolvedCategory } from '../../../../types/leaderboards.types';

export type RootViewDecision =
    | { view: 'redirect' }
    | { view: 'empty' }
    | { view: 'overview'; featured: ResolvedCategory[] }
    | { view: 'board'; category: ResolvedCategory };

/**
 * The game root's render decision. Site policy: only Featured
 * (isMain && !archived) categories are publicly viewable — anything else
 * requested via ?category redirects to the game root (never 404s, so old
 * shared links degrade gracefully). Without a param: 0 Featured -> empty
 * state, 1 -> straight to that board (an overview of one card is noise),
 * 2+ -> overview.
 */
export function decideGameRootView(
    categories: ResolvedCategory[],
    categoryParam: string | undefined,
): RootViewDecision {
    const featured = categories.filter((c) => !c.archived && c.isMain);

    if (categoryParam) {
        const norm = normalizeSlug(categoryParam);
        const match = featured.find((c) => c.name === norm);
        return match
            ? { view: 'board', category: match }
            : { view: 'redirect' };
    }

    if (featured.length === 0) return { view: 'empty' };
    if (featured.length === 1) {
        return { view: 'board', category: featured[0] };
    }
    return { view: 'overview', featured };
}
