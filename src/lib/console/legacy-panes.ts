// Deep links from before the console's IA changes — bookmarks, the
// /manage/moderation/* redirects, per-game localStorage last-pane values and
// the wizard's old wayfinding links.
//
// `?pane=rules&cat=12` was one of six category-scoped panes; that work now
// lives at /manage/category/12#rules. The Categories, Groups, Levels,
// Subcategories and Filters panes became one page per workspace screen.

const RETIRED_CATEGORY_PANES: ReadonlySet<string> = new Set([
    'standards',
    'timing',
    'rules',
    'combinations',
    'category-settings',
]);

/** Whole panes that became a workspace page. */
const RENAMED_PANES: Readonly<Record<string, string>> = {
    categories: 'categories/list',
    'categories-visibility': 'categories/list',
    groups: 'categories/groups',
    subcategories: 'categories/subcategories',
    filters: 'categories/subcategories',
    levels: 'levels/list',
    'level-categories': 'levels/subcategories',
};

export type LegacyRedirect =
    | { kind: 'detail'; categoryId: number; hash: string }
    | { kind: 'pane'; pane: string };

export function legacyPaneRedirect(
    pane: string | null,
    cat: string | null,
): LegacyRedirect | null {
    if (!pane) return null;
    if (Object.hasOwn(RENAMED_PANES, pane)) {
        return { kind: 'pane', pane: RENAMED_PANES[pane] };
    }

    const categoryId = cat ? Number.parseInt(cat, 10) : Number.NaN;
    const hasCategory = Number.isFinite(categoryId);

    // `?pane=variables&cat=12` is the category page's variables section; a
    // bare `?pane=variables` was the game-level editor.
    if (pane === 'variables') {
        return hasCategory
            ? { kind: 'detail', categoryId, hash: pane }
            : { kind: 'pane', pane: 'categories/subcategories' };
    }

    if (!RETIRED_CATEGORY_PANES.has(pane)) return null;
    return hasCategory
        ? { kind: 'detail', categoryId, hash: pane }
        : { kind: 'pane', pane: 'categories/settings' };
}

/** True when a stored last-pane value can no longer be landed on. */
export function isRetiredPaneId(id: string | null | undefined): boolean {
    return (
        !!id &&
        (RETIRED_CATEGORY_PANES.has(id) ||
            id === 'variables' ||
            Object.hasOwn(RENAMED_PANES, id))
    );
}
