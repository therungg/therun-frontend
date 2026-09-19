import { splitLevelBoards } from '~src/lib/levels/display';
import { normalizeSlug } from '~src/lib/normalize-slug';
import type {
    LandingView,
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../types/leaderboards.types';

export type RootViewDecision =
    | { view: 'redirect' }
    | { view: 'empty' }
    | { view: 'overview'; featured: ResolvedCategory[] }
    | { view: 'board'; category: ResolvedCategory }
    /** The root hands off to the standings route. */
    | { view: 'standings' };

/**
 * The game root's render decision. Site policy: only Featured
 * (isMain && !archived) categories are publicly viewable — anything else
 * requested via ?board redirects to the game root (never 404s, so old
 * shared links degrade gracefully). Without a param: 0 Featured -> empty
 * state, 1 -> straight to that board (an overview of one card is noise),
 * 2+ -> overview.
 *
 * A game can override that count rule with `landingView`: 'categories' keeps
 * the wall even for a game down to one board, 'board' opens its first
 * featured full-game board, 'levels' opens its first level board, and
 * 'standings' hands off to the standings route. Null leaves the count
 * deciding. None of them conjures a view out of nothing — a setting whose
 * view has no boards behind it falls through to the rules below rather than
 * rendering an empty page.
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
    /** The `?board=` value; `?category=` is a subcategory variable now. */
    categoryParam: string | undefined,
    groups: ResolvedGroup[] = [],
    /** games_pg.landing_view; null = decide from the board count. */
    landingView: LandingView | null = null,
): RootViewDecision {
    const featured = categories.filter((c) => !c.archived && c.isMain);

    if (categoryParam) {
        // Exact match on the canonical backend slug, then a normalized fallback
        // (case/space/hyphen-folded) so older display-derived links still land.
        const norm = normalizeSlug(categoryParam);
        const match =
            featured.find((c) => c.name === categoryParam) ??
            featured.find((c) => normalizeSlug(c.name) === norm);
        return match
            ? { view: 'board', category: match }
            : { view: 'redirect' };
    }

    const { fullGame, levelBoards } = splitLevelBoards(featured, groups);

    if (landingView === 'board' && fullGame.length > 0) {
        return { view: 'board', category: fullGame[0] };
    }
    if (landingView === 'categories' && fullGame.length > 0) {
        return { view: 'overview', featured: fullGame };
    }
    if (landingView === 'levels' && levelBoards.length > 0) {
        return { view: 'board', category: levelBoards[0] };
    }
    // Standings across one board is that board, which is what the route
    // itself says; asking for it on a game that has only one is a no-op.
    if (landingView === 'standings' && fullGame.length > 1) {
        return { view: 'standings' };
    }

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
