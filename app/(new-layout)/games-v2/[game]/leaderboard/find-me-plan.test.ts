import { describe, expect, it } from 'vitest';
import { planFindMeSearch } from './find-me-plan';

describe('planFindMeSearch', () => {
    it('searches forward only when already on page 1', () => {
        expect(planFindMeSearch(1, 3, 10, 10)).toEqual([4, 5, 6, 7, 8, 9, 10]);
    });

    it('caps the forward search at the budget', () => {
        expect(planFindMeSearch(1, 3, 100, 5)).toEqual([4, 5, 6, 7, 8]);
    });

    it('falls back to backward search once forward is exhausted', () => {
        // deep link past the board's end, nothing left to fetch forward
        expect(planFindMeSearch(5, 10, 10, 10)).toEqual([4, 3, 2, 1]);
    });

    it('combines forward and backward, forward first, budget shared', () => {
        // deep link to page 5 of 8, budget 4: 2 pages forward, 2 backward
        expect(planFindMeSearch(5, 6, 8, 4)).toEqual([7, 8, 4, 3]);
    });

    it('stops backward search at page 1', () => {
        expect(planFindMeSearch(2, 8, 8, 10)).toEqual([1]);
    });

    it('returns an empty plan when the whole board is already loaded', () => {
        expect(planFindMeSearch(1, 10, 10, 10)).toEqual([]);
    });

    it('lists backward pages in strictly decreasing order (contiguous fetch order)', () => {
        expect(planFindMeSearch(6, 6, 6, 10)).toEqual([5, 4, 3, 2, 1]);
    });
});
