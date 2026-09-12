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
    const dir: BoardSortDir =
        sp.dir === 'asc' || sp.dir === 'desc'
            ? sp.dir
            : // No explicit direction: a fresh date sort reads newest-first,
              // the backend's own per-field default is 'asc' either way.
              sort === 'date'
              ? 'desc'
              : 'asc';
    return { sort, dir };
}
