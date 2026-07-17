import { describe, expect, it } from 'vitest';
import { computeBoardRange } from './board-range';

describe('computeBoardRange', () => {
    it('computes the first page range', () => {
        expect(computeBoardRange(1, 25, 25, 312)).toEqual({
            first: 1,
            last: 25,
            total: 312,
        });
    });

    it('computes a deep-linked page range', () => {
        // ?page=3, only that page loaded
        expect(computeBoardRange(3, 25, 25, 312)).toEqual({
            first: 51,
            last: 75,
            total: 312,
        });
    });

    it('extends the low end after Show previous, keeping the same high end', () => {
        // deep link to page 3, then Show previous pulls in page 2 too
        expect(computeBoardRange(2, 25, 50, 312)).toEqual({
            first: 26,
            last: 75,
            total: 312,
        });
    });

    it('handles a short final page', () => {
        expect(computeBoardRange(13, 25, 12, 312)).toEqual({
            first: 301,
            last: 312,
            total: 312,
        });
    });

    it('returns null when nothing is loaded', () => {
        expect(computeBoardRange(1, 25, 0, 312)).toBeNull();
    });

    it('returns null when the board is empty', () => {
        expect(computeBoardRange(1, 25, 0, 0)).toBeNull();
    });
});
