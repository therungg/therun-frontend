import { splitLevelBoards } from '~src/lib/levels/display';
import { normalizeSlug } from '~src/lib/normalize-slug';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../types/leaderboards.types';

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
 *
 * Level boards are Featured too — an instance copies its level category's
 * isMain — but they are not cards on the wall: a 30-level game with four
 * level categories would render 120 of them, and the count alone would push
 * every such game onto an overview it doesn't want. They are reached through
 * the level picker on a board instead, so `groups` is used to keep them out of
 * the count and the wall. A `?category=` deep link to one still resolves: the
 * board exists and is public, it just isn't advertised here.
 */
export function decideGameRootView(
    categories: ResolvedCategory[],
    categoryParam: string | undefined,
    groups: ResolvedGroup[] = [],
): RootViewDecision {
    const featured = categories.filter((c) => !c.archived && c.isMain);

    if (categoryParam) {
        const norm = normalizeSlug(categoryParam);
        const match = featured.find((c) => c.name === norm);
        return match
            ? { view: 'board', category: match }
            : { view: 'redirect' };
    }

    const { fullGame } = splitLevelBoards(featured, groups);
    if (fullGame.length === 0) {
        // A levels-only game has no wall to show — its boards all live under
        // the level picker, so the first one is the way in.
        if (featured.length > 0)
            return { view: 'board', category: featured[0] };
        return { view: 'empty' };
    }
    if (fullGame.length === 1) {
        return { view: 'board', category: fullGame[0] };
    }
    return { view: 'overview', featured: fullGame };
}
