import { describe, expect, it } from 'vitest';
import { effectiveSortKey, sortCategoriesForDisplay } from './category-sort';

function c(id: number, sortOrder: number, totalRunTime: number) {
    return { id, sortOrder, totalRunTime };
}

describe('effectiveSortKey', () => {
    it('passes positive orders through', () => {
        expect(effectiveSortKey(3)).toBe(3);
    });
    it('treats 0 and negatives as unset (Infinity)', () => {
        expect(effectiveSortKey(0)).toBe(Infinity);
        expect(effectiveSortKey(-1)).toBe(Infinity);
    });
});

describe('sortCategoriesForDisplay', () => {
    it('all-unset preserves playtime-desc order', () => {
        const rows = [c(1, 0, 50), c(2, 0, 200), c(3, 0, 100)];
        expect(sortCategoriesForDisplay(rows).map((r) => r.id)).toEqual([
            2, 3, 1,
        ]);
    });
    it('explicit order beats playtime', () => {
        const rows = [c(1, 2, 999), c(2, 1, 5)];
        expect(sortCategoriesForDisplay(rows).map((r) => r.id)).toEqual([2, 1]);
    });
    it('unset rows sort after ordered rows, playtime tiebroken', () => {
        const rows = [c(1, 0, 300), c(2, 1, 5), c(3, 0, 400)];
        expect(sortCategoriesForDisplay(rows).map((r) => r.id)).toEqual([
            2, 3, 1,
        ]);
    });
    it('does not mutate the input array', () => {
        const rows = [c(1, 0, 1), c(2, 1, 1)];
        const copy = rows.slice();
        sortCategoriesForDisplay(rows);
        expect(rows).toEqual(copy);
    });
    it('missing totalRunTime is treated as 0', () => {
        const rows = [
            { id: 1, sortOrder: 0 },
            { id: 2, sortOrder: 0, totalRunTime: 10 },
        ];
        expect(sortCategoriesForDisplay(rows).map((r) => r.id)).toEqual([2, 1]);
    });
});
