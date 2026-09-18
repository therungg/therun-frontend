export type PaginationItem = number | 'gap';

/**
 * The page numbers a pagination bar renders, with runs of skipped pages
 * collapsed to a 'gap'. Always includes page 1, the last page, and the
 * current page's neighbours; a "gap" of exactly one page renders as that
 * page instead (an ellipsis hiding a single number is silly).
 *
 * Example (current 6 of 20): [1, 'gap', 5, 6, 7, 'gap', 20].
 */
export function paginationItems(
    current: number,
    total: number,
): PaginationItem[] {
    if (total <= 1) return total === 1 ? [1] : [];
    const wanted = new Set<number>([
        1,
        total,
        current - 1,
        current,
        current + 1,
    ]);
    const pages = Array.from(wanted)
        .filter((p) => p >= 1 && p <= total)
        .sort((a, b) => a - b);

    const items: PaginationItem[] = [];
    let prev = 0;
    for (const page of pages) {
        if (page === prev + 2) items.push(prev + 1);
        else if (page > prev + 2) items.push('gap');
        items.push(page);
        prev = page;
    }
    return items;
}
