import { describe, expect, it } from 'vitest';
import { computeReorderChanges } from './reorder-changes';

const row = (id: number, sortOrder: number) => ({ id, sortOrder });

describe('computeReorderChanges', () => {
    it('moves a row down and renumbers 1..N, diffing unchanged rows away', () => {
        // Rows already ordered 1,2,3 — move first to last.
        const res = computeReorderChanges(
            [row(10, 1), row(20, 2), row(30, 3)],
            0,
            2,
        );
        expect(res.orderedIds).toEqual([20, 30, 10]);
        expect(res.changes).toEqual([
            { categoryId: 20, sortOrder: 1 },
            { categoryId: 30, sortOrder: 2 },
            { categoryId: 10, sortOrder: 3 },
        ]);
    });
    it('first move over an all-unset scope renumbers every row', () => {
        const res = computeReorderChanges(
            [row(10, 0), row(20, 0), row(30, 0)],
            2,
            0,
        );
        expect(res.orderedIds).toEqual([30, 10, 20]);
        expect(res.changes).toEqual([
            { categoryId: 30, sortOrder: 1 },
            { categoryId: 10, sortOrder: 2 },
            { categoryId: 20, sortOrder: 3 },
        ]);
    });
    it('adjacent swap emits only the two changed rows', () => {
        const res = computeReorderChanges(
            [row(10, 1), row(20, 2), row(30, 3)],
            1,
            2,
        );
        expect(res.orderedIds).toEqual([10, 30, 20]);
        expect(res.changes).toEqual([
            { categoryId: 30, sortOrder: 2 },
            { categoryId: 20, sortOrder: 3 },
        ]);
    });
    it('no-op move returns empty changes', () => {
        const res = computeReorderChanges([row(10, 1), row(20, 2)], 1, 1);
        expect(res.orderedIds).toEqual([10, 20]);
        expect(res.changes).toEqual([]);
    });
    it('out-of-range indices return the scope unchanged', () => {
        const res = computeReorderChanges([row(10, 1)], 0, 5);
        expect(res.orderedIds).toEqual([10]);
        expect(res.changes).toEqual([]);
    });
});
