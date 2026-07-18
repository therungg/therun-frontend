// Pure client-side sort comparator for the roster table. Sorting happens
// entirely over already-loaded rows (no round trip) — see roster-view.tsx's
// column-header click handler for the toggle state machine this backs.

export type RosterSortKey = 'runner' | 'rt' | 'gt' | 'status';
export type SortDirection = 'ascending' | 'descending';

export interface RosterSortState {
    key: RosterSortKey;
    direction: SortDirection;
}

/** The minimal row shape the comparator needs — kept independent of the full
 * LeaderboardRosterRow type so this module has no import surface. */
export interface SortableRosterRow {
    runId: number;
    runnerName: string;
    time: number | null;
    gameTime: number | null;
    verificationStatus: string;
}

/**
 * Compare two nullable times for a given direction. `null` (no time)
 * always sorts last regardless of direction — flipping ascending/descending
 * only reorders the runs that actually have a time, not where the
 * no-time rows land.
 */
function compareNullableTime(
    a: number | null,
    b: number | null,
    dir: 1 | -1,
): number {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return (a - b) * dir;
}

/**
 * Sort roster rows by the given column/direction. Returns a new array — the
 * input is never mutated. `sort: null` is the default/unsorted state: the
 * rows are returned in their original (loaded) order.
 */
export function sortRosterRows<T extends SortableRosterRow>(
    rows: readonly T[],
    sort: RosterSortState | null,
): T[] {
    if (!sort) return [...rows];
    const dir: 1 | -1 = sort.direction === 'ascending' ? 1 : -1;
    return [...rows].sort((a, b) => {
        switch (sort.key) {
            case 'runner':
                return a.runnerName.localeCompare(b.runnerName) * dir;
            case 'status':
                return (
                    a.verificationStatus.localeCompare(b.verificationStatus) *
                    dir
                );
            case 'rt':
                return compareNullableTime(a.time, b.time, dir);
            case 'gt':
                return compareNullableTime(a.gameTime, b.gameTime, dir);
            default:
                return 0;
        }
    });
}

/**
 * Click-to-sort state machine for a column header: first click sorts
 * ascending, a second click on the same column flips to descending, a third
 * click clears back to the default (unsorted) order. Clicking a different
 * column always starts fresh at ascending.
 */
export function nextRosterSort(
    current: RosterSortState | null,
    key: RosterSortKey,
): RosterSortState | null {
    if (!current || current.key !== key) return { key, direction: 'ascending' };
    if (current.direction === 'ascending')
        return { key, direction: 'descending' };
    return null;
}
