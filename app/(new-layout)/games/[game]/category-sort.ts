/** sortOrder <= 0 is the "unset" sentinel — treated as Infinity so unordered rows sort last. */
export function effectiveSortKey(sortOrder: number): number {
    return sortOrder > 0 ? sortOrder : Infinity;
}

/**
 * Display order for a category scope: explicit sortOrder ascending with
 * unset (<= 0) last, playtime descending as the tiebreak — so a game
 * nobody reordered keeps its historical playtime order, and categories
 * created after a reorder append at the end instead of jumping first.
 */
export function sortCategoriesForDisplay<
    T extends { sortOrder: number; totalRunTime?: number },
>(categories: T[]): T[] {
    return [...categories].sort(
        (a, b) =>
            effectiveSortKey(a.sortOrder) - effectiveSortKey(b.sortOrder) ||
            (b.totalRunTime ?? 0) - (a.totalRunTime ?? 0),
    );
}
