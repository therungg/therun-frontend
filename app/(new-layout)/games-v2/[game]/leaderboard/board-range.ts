export interface BoardRange {
    first: number;
    last: number;
    total: number;
}

/**
 * Row range currently rendered by the pager, e.g. "Showing 51–75 of 312".
 * The pager only ever grows the loaded window contiguously (Show
 * previous/more, Find me) — `minPage` and `loadedCount` alone are enough
 * to derive the first/last row, no explicit "which pages are loaded"
 * bookkeeping needed. Returns null when there's nothing to show a range
 * for (empty board or total not yet known).
 */
export function computeBoardRange(
    minPage: number,
    pageSize: number,
    loadedCount: number,
    total: number,
): BoardRange | null {
    if (loadedCount <= 0 || total <= 0) return null;
    const first = (minPage - 1) * pageSize + 1;
    return { first, last: first + loadedCount - 1, total };
}
