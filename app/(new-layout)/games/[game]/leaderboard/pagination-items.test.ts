import { describe, expect, it } from 'vitest';
import { paginationItems } from './pagination-items';

describe('paginationItems', () => {
    it('returns every page when there are no gaps to collapse', () => {
        expect(paginationItems(1, 1)).toEqual([1]);
        expect(paginationItems(2, 3)).toEqual([1, 2, 3]);
        expect(paginationItems(1, 4)).toEqual([1, 2, 3, 4]);
    });

    it('returns nothing for an empty board', () => {
        expect(paginationItems(1, 0)).toEqual([]);
    });

    it('collapses long runs on both sides of the current page', () => {
        expect(paginationItems(6, 20)).toEqual([1, 'gap', 5, 6, 7, 'gap', 20]);
    });

    it('keeps the edges dense when current sits near one', () => {
        expect(paginationItems(1, 20)).toEqual([1, 2, 'gap', 20]);
        expect(paginationItems(20, 20)).toEqual([1, 'gap', 19, 20]);
        expect(paginationItems(2, 20)).toEqual([1, 2, 3, 'gap', 20]);
    });

    it('renders a single skipped page as the page, not an ellipsis', () => {
        // 1 [gap of exactly page 2] 3 4 5 … 20 -> the 2 comes back.
        expect(paginationItems(4, 20)).toEqual([1, 2, 3, 4, 5, 'gap', 20]);
    });
});
