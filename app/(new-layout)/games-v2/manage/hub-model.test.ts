import { describe, expect, it } from 'vitest';
import { chunk, formatCountBadge } from './hub-model';

describe('chunk', () => {
    it('splits into fixed-size batches, preserving order', () => {
        expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('returns one batch when size >= length', () => {
        expect(chunk([1, 2], 4)).toEqual([[1, 2]]);
    });

    it('returns an empty array for an empty input', () => {
        expect(chunk([], 4)).toEqual([]);
    });

    it('treats a non-positive size as "one batch"', () => {
        expect(chunk([1, 2, 3], 0)).toEqual([[1, 2, 3]]);
    });
});

describe('formatCountBadge', () => {
    it('renders the plain count when not degraded', () => {
        expect(formatCountBadge(0, false)).toBe('0');
        expect(formatCountBadge(5, false)).toBe('5');
    });

    it('appends "+" for a degraded non-zero count', () => {
        expect(formatCountBadge(3, true)).toBe('3+');
    });

    it('renders "!" instead of "0+" for a degraded zero count', () => {
        expect(formatCountBadge(0, true)).toBe('!');
    });
});
