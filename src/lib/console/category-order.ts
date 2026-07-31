import type { ResolvedCategory } from '../../../types/leaderboards.types';

/**
 * Board order for admin/setup surfaces — the category-setup hub, the
 * category detail page's prev/next walk, and board curation's category
 * switcher: explicit `sortOrder` ascending with unset (0) sorting last,
 * tiebroken by display name.
 *
 * Distinct from the public board's `sortCategoriesForDisplay`
 * (`app/(new-layout)/games-v2/[game]/category-sort.ts`), which tiebreaks on
 * playtime instead — that reflects what a *reader* wants (an unordered game
 * keeps its historical playtime order); this reflects what a *moderator*
 * scanning a list wants (alphabetical, so a new category is easy to find).
 */
export function compareByBoardOrder(
    a: ResolvedCategory,
    b: ResolvedCategory,
): number {
    return (
        (a.sortOrder || Number.MAX_SAFE_INTEGER) -
            (b.sortOrder || Number.MAX_SAFE_INTEGER) ||
        a.display.localeCompare(b.display)
    );
}
