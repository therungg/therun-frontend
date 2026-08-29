// Deep links from before the category IA change — bookmarks, the
// /manage/moderation/* redirects, and per-game localStorage last-pane values.
//
// `?pane=rules&cat=12` was one of six category-scoped panes; that work now
// lives at /manage/category/12#rules. A retired pane with no category can't
// name a destination, so it lands on the index.

// `?pane=variables&cat=12` is a legacy category-scoped deep link that lands
// on the category detail's variables section. The bare `?pane=variables`
// (no `cat`) is NOT retired: the game-level Variables pane exists again as
// its own sidebar item, so a bare link is a normal landing, not a legacy
// redirect. `variables` therefore only appears in the `cat`-required set
// below, never in RETIRED_CATEGORY_PANES.
const RETIRED_CATEGORY_PANES: ReadonlySet<string> = new Set([
    'standards',
    'timing',
    'rules',
    'combinations',
    'category-settings',
]);

// Panes retired only in their category-scoped shape — a bare link with no
// `cat` is a live pane elsewhere in the console and must NOT redirect.
const CATEGORY_SCOPED_ONLY_PANES: ReadonlySet<string> = new Set(['variables']);

export type LegacyRedirect =
    | { kind: 'detail'; categoryId: number; hash: string }
    | { kind: 'pane'; pane: string };

export function legacyPaneRedirect(
    pane: string | null,
    cat: string | null,
): LegacyRedirect | null {
    if (!pane) return null;
    if (pane === 'categories-visibility') {
        return { kind: 'pane', pane: 'categories' };
    }

    const categoryId = cat ? Number.parseInt(cat, 10) : Number.NaN;
    const hasCategory = Number.isFinite(categoryId);

    if (CATEGORY_SCOPED_ONLY_PANES.has(pane)) {
        // Bare `?pane=variables` isn't legacy — it's a real landing pane —
        // so only redirect when a category is present.
        return hasCategory ? { kind: 'detail', categoryId, hash: pane } : null;
    }

    if (!RETIRED_CATEGORY_PANES.has(pane)) return null;

    if (!hasCategory) {
        return { kind: 'pane', pane: 'categories' };
    }
    return { kind: 'detail', categoryId, hash: pane };
}

/** True when a stored last-pane value can no longer be landed on. */
export function isRetiredPaneId(id: string | null | undefined): boolean {
    return (
        !!id &&
        (RETIRED_CATEGORY_PANES.has(id) || id === 'categories-visibility')
    );
}
