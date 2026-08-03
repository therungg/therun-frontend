// Deep links from before the category IA change — bookmarks, the
// /manage/moderation/* redirects, and per-game localStorage last-pane values.
//
// `?pane=rules&cat=12` was one of six category-scoped panes; that work now
// lives at /manage/category/12#rules. A retired pane with no category can't
// name a destination, so it lands on the index.

// `variables` is deliberately absent: it is a live game-level pane again
// (shared subcategories & filters). Only the category-scoped legacy shape
// (`?pane=variables&cat=12`) redirects to the category detail — handled as a
// special case in legacyPaneRedirect below; bare `?pane=variables` opens the
// real pane.
const RETIRED_CATEGORY_PANES: ReadonlySet<string> = new Set([
    'standards',
    'timing',
    'rules',
    'combinations',
    'category-settings',
]);

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
    // Legacy category-scoped variables link — the modern pane never carries
    // `cat`, so the param's presence is what marks the link as legacy.
    if (pane === 'variables' && cat) {
        const categoryId = Number.parseInt(cat, 10);
        return Number.isFinite(categoryId)
            ? { kind: 'detail', categoryId, hash: 'variables' }
            : { kind: 'pane', pane: 'categories' };
    }
    if (!RETIRED_CATEGORY_PANES.has(pane)) return null;

    const categoryId = cat ? Number.parseInt(cat, 10) : Number.NaN;
    if (!Number.isFinite(categoryId)) {
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
