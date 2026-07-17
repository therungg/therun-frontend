/**
 * Ordered list of pages to fetch for a single Find-me search.
 *
 * Searches forward from `maxPage` toward `totalPages` first — the common
 * case, since deep links and prior "Show more" clicks tend to undershoot
 * the user's actual rank. If budget remains and `minPage > 1`, continues
 * backward from `minPage - 1` down toward page 1 — covers deep links that
 * land *past* the user's rank (e.g. `?page=8` but they're rank 12).
 *
 * Backward pages are listed in strictly decreasing order (`minPage - 1`,
 * `minPage - 2`, …) so a caller that fetches and applies them in this
 * order keeps the loaded-page window contiguous, no gaps.
 *
 * `budget` caps the combined forward + backward page count so a
 * genuinely-absent user's search terminates.
 */
export function planFindMeSearch(
    minPage: number,
    maxPage: number,
    totalPages: number,
    budget: number,
): number[] {
    const plan: number[] = [];
    for (
        let page = maxPage + 1;
        page <= totalPages && plan.length < budget;
        page++
    ) {
        plan.push(page);
    }
    for (let page = minPage - 1; page >= 1 && plan.length < budget; page--) {
        plan.push(page);
    }
    return plan;
}
