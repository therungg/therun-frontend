import { describe, expect, it } from 'vitest';
import { computeGroupSaveChanges, moveWithinScope } from './group-order';

describe('moveWithinScope', () => {
    // Global list interleaves two columns: A = {1,3,5}, B = {2,4}.
    const ids = [1, 2, 3, 4, 5];
    const colA = new Set([1, 3, 5]);

    it('swaps with the column-neighbor, skipping other columns', () => {
        // Moving 3 up in column A swaps it with 1, leaving B untouched.
        expect(moveWithinScope(ids, colA, 3, -1)).toEqual([3, 2, 1, 4, 5]);
    });

    it('moves down across a foreign id without disturbing it', () => {
        expect(moveWithinScope(ids, colA, 3, 1)).toEqual([1, 2, 5, 4, 3]);
    });

    it('is a no-op at the column edges', () => {
        expect(moveWithinScope(ids, colA, 1, -1)).toBe(ids);
        expect(moveWithinScope(ids, colA, 5, 1)).toBe(ids);
    });

    it('is a no-op for an id outside the scope', () => {
        expect(moveWithinScope(ids, colA, 2, 1)).toBe(ids);
    });
});

describe('computeGroupSaveChanges', () => {
    const mains = [
        { id: 1, groupId: 10, sortOrder: 1 },
        { id: 2, groupId: 10, sortOrder: 2 },
        { id: 3, groupId: null, sortOrder: 0 },
    ];

    it('emits only groupId for moved categories when order was never touched', () => {
        expect(
            computeGroupSaveChanges({
                mains,
                columns: [
                    { groupId: 10, ids: [1] },
                    { groupId: null, ids: [3, 2] },
                ],
                writeOrder: false,
            }),
        ).toEqual([{ id: 2, groupId: null }]);
    });

    it('never writes sortOrder on an untouched board — filing categories must not stamp explicit orders', () => {
        expect(
            computeGroupSaveChanges({
                mains,
                columns: [
                    { groupId: 10, ids: [1, 2] },
                    { groupId: null, ids: [3] },
                ],
                writeOrder: false,
            }),
        ).toEqual([]);
    });

    it('renumbers each column 1..N when order was touched, diffing against stored values', () => {
        expect(
            computeGroupSaveChanges({
                mains,
                columns: [
                    { groupId: 10, ids: [2, 1] },
                    { groupId: null, ids: [3] },
                ],
                writeOrder: true,
            }),
        ).toEqual([
            { id: 2, sortOrder: 1 },
            { id: 1, sortOrder: 2 },
            // id 3: stored 0 !== target 1 — the touched save normalizes it.
            { id: 3, sortOrder: 1 },
        ]);
    });

    it('combines a group move and an order write in one change', () => {
        expect(
            computeGroupSaveChanges({
                mains,
                columns: [
                    { groupId: 10, ids: [1] },
                    { groupId: null, ids: [2, 3] },
                ],
                writeOrder: true,
            }),
        ).toEqual([
            { id: 2, groupId: null, sortOrder: 1 },
            { id: 3, sortOrder: 2 },
        ]);
    });

    it('ignores ids with no stored row', () => {
        expect(
            computeGroupSaveChanges({
                mains,
                columns: [{ groupId: null, ids: [99] }],
                writeOrder: true,
            }),
        ).toEqual([]);
    });
});
