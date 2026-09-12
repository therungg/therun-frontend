// URL <-> state for the board's date sort. Deliberately separate from
// builtin-params.ts: sort reorders the same rows rather than narrowing them,
// so it must stay OUT of BuiltinFilterState / countBuiltinFilters /
// hasBuiltinFilters — folding it in would wrongly light up the "filters
// active" chip and the Clear-filters affordance for a plain reorder.

export type BoardSort = 'time' | 'date';
export type BoardSortDir = 'asc' | 'desc';

export interface BoardSortState {
    sort: BoardSort;
    dir: BoardSortDir;
}

export const BOARD_SORT_PARAM_KEYS = ['sort', 'dir'] as const;

/** The board's default order: real-time rank, ascending. */
export const DEFAULT_BOARD_SORT: BoardSortState = { sort: 'time', dir: 'asc' };

export function parseBoardSortParams(
    sp: Record<string, string | undefined>,
): BoardSortState {
    const sort: BoardSort = sp.sort === 'date' ? 'date' : 'time';
    // An absent direction always means ascending, whatever the sort field is
    // — matching the backend, which defaults `dir` to 'asc' unconditionally.
    // Newest-first comes from the header toggle (nextSort in
    // leaderboard-pager), which writes an explicit dir=desc. Defaulting a
    // bare `?sort=date` to 'desc' here would invert oldest-first on reload:
    // setUrlSort omits dir when it is 'asc', so oldest-first is written to
    // the URL as a bare `?sort=date` and has to read back the same way.
    const dir: BoardSortDir = sp.dir === 'desc' ? 'desc' : 'asc';
    return { sort, dir };
}
