import { describe, expect, it } from 'vitest';
import {
    addFilterValue,
    removeFilterValue,
    toggleFilterValue,
} from './filter-values';

describe('addFilterValue', () => {
    it('appends a value not already present', () => {
        expect(addFilterValue(['pc'], 'ps4')).toEqual(['pc', 'ps4']);
    });

    it('is a no-op when the value is already present', () => {
        expect(addFilterValue(['pc', 'ps4'], 'pc')).toEqual(['pc', 'ps4']);
    });

    it('does not mutate the input array', () => {
        const input = ['pc'];
        addFilterValue(input, 'ps4');
        expect(input).toEqual(['pc']);
    });
});

describe('removeFilterValue', () => {
    it('removes a present value', () => {
        expect(removeFilterValue(['pc', 'ps4'], 'pc')).toEqual(['ps4']);
    });

    it('is a no-op when the value is absent', () => {
        expect(removeFilterValue(['pc'], 'ps4')).toEqual(['pc']);
    });

    it('returns an empty array when the last value is removed', () => {
        expect(removeFilterValue(['pc'], 'pc')).toEqual([]);
    });
});

describe('toggleFilterValue', () => {
    it('adds an absent value', () => {
        expect(toggleFilterValue(['pc'], 'ps4')).toEqual(['pc', 'ps4']);
    });

    it('removes a present value', () => {
        expect(toggleFilterValue(['pc', 'ps4'], 'pc')).toEqual(['ps4']);
    });
});
