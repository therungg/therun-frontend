// Deep links from before the console's IA changes — bookmarks, the
// /manage/moderation/* redirects, per-game localStorage last-pane values and
// the wizard's old wayfinding links.
//
// `?pane=rules&cat=12` was one of six category-scoped panes; that work is the
// categories settings table, which the shell sends a `detail` redirect to,
// carrying the category along. The Categories, Groups, Levels, Subcategories
// and Filters panes became one page per workspace screen.

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
    // The Needs attention, Decided runs and Browse runs panes folded into
    // the Queue and All runs.
    attention: 'mod-queue',
    reports: 'mod-queue',
    'queue-history': 'all-runs',
    roster: 'all-runs',
};

export type LegacyRedirect =
    /** A link that named a category. The caller resolves which workspace the
     *  category belongs to — a level's settings are on the Levels screen, not
     *  the Categories one — and lands on `screen` there. */
    | {
          kind: 'detail';
          categoryId: number;
          screen: 'settings' | 'subcategories';
          /** Only a `rules` link was pointing at the rules text. The other
           *  retired panes land on the table and open nothing: a dialog
           *  nobody asked for is in the way of the screen they wanted. */
          openRules: boolean;
      }
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

    // `?pane=variables&cat=12` was the category page's variables section —
    // subcategories, which is its own screen now, not a row in the settings
    // table. A bare `?pane=variables` was the game-level editor.
    if (pane === 'variables') {
        return hasCategory
            ? {
                  kind: 'detail',
                  categoryId,
                  screen: 'subcategories',
                  openRules: false,
              }
            : { kind: 'pane', pane: 'categories/subcategories' };
    }

    if (!RETIRED_CATEGORY_PANES.has(pane)) return null;
    return hasCategory
        ? {
              kind: 'detail',
              categoryId,
              screen: 'settings',
              openRules: pane === 'rules',
          }
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
