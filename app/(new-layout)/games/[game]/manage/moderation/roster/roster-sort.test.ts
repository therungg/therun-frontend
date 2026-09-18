import { describe, expect, it } from 'vitest';
import {
    nextRosterSort,
    type SortableRosterRow,
    sortRosterRows,
} from './roster-sort';

function row(overrides: Partial<SortableRosterRow>): SortableRosterRow {
    return {
        runId: 1,
        runnerName: 'runner',
        time: null,
        gameTime: null,
        verificationStatus: 'unverified',
        ...overrides,
    };
}

describe('sortRosterRows', () => {
    it('returns rows in original order when sort is null (default)', () => {
        const rows = [
            row({ runId: 3, runnerName: 'c' }),
            row({ runId: 1, runnerName: 'a' }),
            row({ runId: 2, runnerName: 'b' }),
        ];
        expect(sortRosterRows(rows, null).map((r) => r.runId)).toEqual([
            3, 1, 2,
        ]);
    });

    it('does not mutate the input array', () => {
        const rows = [row({ runId: 2 }), row({ runId: 1 })];
        sortRosterRows(rows, { key: 'runner', direction: 'ascending' });
        expect(rows.map((r) => r.runId)).toEqual([2, 1]);
    });

    it('sorts by runner name ascending / descending', () => {
        const rows = [
            row({ runId: 1, runnerName: 'Charlie' }),
            row({ runId: 2, runnerName: 'alice' }),
            row({ runId: 3, runnerName: 'Bob' }),
        ];
        expect(
            sortRosterRows(rows, {
                key: 'runner',
                direction: 'ascending',
            }).map((r) => r.runId),
        ).toEqual([2, 3, 1]);
        expect(
            sortRosterRows(rows, {
                key: 'runner',
                direction: 'descending',
            }).map((r) => r.runId),
        ).toEqual([1, 3, 2]);
    });

    it('sorts by verification status ascending / descending', () => {
        const rows = [
            row({ runId: 1, verificationStatus: 'verified' }),
            row({ runId: 2, verificationStatus: 'rejected' }),
            row({ runId: 3, verificationStatus: 'unverified' }),
        ];
        expect(
            sortRosterRows(rows, {
                key: 'status',
                direction: 'ascending',
            }).map((r) => r.runId),
        ).toEqual([2, 3, 1]);
    });

    it('sorts RT ascending, with null times sorting last', () => {
        const rows = [
            row({ runId: 1, time: 5000 }),
            row({ runId: 2, time: null }),
            row({ runId: 3, time: 1000 }),
        ];
        expect(
            sortRosterRows(rows, {
                key: 'rt',
                direction: 'ascending',
            }).map((r) => r.runId),
        ).toEqual([3, 1, 2]);
    });

    it('sorts RT descending, and null times STILL sort last (not first)', () => {
        const rows = [
            row({ runId: 1, time: 5000 }),
            row({ runId: 2, time: null }),
            row({ runId: 3, time: 1000 }),
        ];
        expect(
            sortRosterRows(rows, {
                key: 'rt',
                direction: 'descending',
            }).map((r) => r.runId),
        ).toEqual([1, 3, 2]);
    });

    it('sorts GT ascending/descending independently of RT, nulls last', () => {
        const rows = [
            row({ runId: 1, gameTime: 2000 }),
            row({ runId: 2, gameTime: null }),
            row({ runId: 3, gameTime: 4000 }),
        ];
        expect(
            sortRosterRows(rows, {
                key: 'gt',
                direction: 'ascending',
            }).map((r) => r.runId),
        ).toEqual([1, 3, 2]);
        expect(
            sortRosterRows(rows, {
                key: 'gt',
                direction: 'descending',
            }).map((r) => r.runId),
        ).toEqual([3, 1, 2]);
    });

    it('treats two rows with no time as equal (stable, both trail)', () => {
        const rows = [
            row({ runId: 1, time: null }),
            row({ runId: 2, time: 1000 }),
            row({ runId: 3, time: null }),
        ];
        const sorted = sortRosterRows(rows, {
            key: 'rt',
            direction: 'ascending',
        });
        expect(sorted[0].runId).toBe(2);
        expect(
            sorted
                .slice(1)
                .map((r) => r.runId)
                .sort(),
        ).toEqual([1, 3]);
    });
});

describe('nextRosterSort', () => {
    it('starts a new column at ascending', () => {
        expect(nextRosterSort(null, 'rt')).toEqual({
            key: 'rt',
            direction: 'ascending',
        });
    });

    it('flips ascending to descending on the same column', () => {
        expect(
            nextRosterSort({ key: 'rt', direction: 'ascending' }, 'rt'),
        ).toEqual({ key: 'rt', direction: 'descending' });
    });

    it('clears back to null (default order) on the third click', () => {
        expect(
            nextRosterSort({ key: 'rt', direction: 'descending' }, 'rt'),
        ).toBeNull();
    });

    it('switching to a different column resets to ascending on the new column', () => {
        expect(
            nextRosterSort({ key: 'rt', direction: 'descending' }, 'gt'),
        ).toEqual({ key: 'gt', direction: 'ascending' });
    });
});
