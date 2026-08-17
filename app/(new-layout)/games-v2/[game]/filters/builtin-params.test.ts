import { describe, expect, it } from 'vitest';
import {
    countBuiltinFilters,
    hasBuiltinFilters,
    parseBuiltinParams,
} from './builtin-params';

describe('parseBuiltinParams', () => {
    it('is all-off for empty input', () => {
        const s = parseBuiltinParams({});
        expect(s).toEqual({
            verified: false,
            video: null,
            from: null,
            to: null,
            country: null,
        });
        expect(hasBuiltinFilters(s)).toBe(false);
        expect(countBuiltinFilters(s)).toBe(0);
    });
    it('accepts valid values and upper-cases country', () => {
        const s = parseBuiltinParams({
            verified: 'true',
            video: 'missing',
            from: '2024-01-01',
            to: '2024-06-30',
            country: 'nl',
        });
        expect(s).toEqual({
            verified: true,
            video: 'missing',
            from: '2024-01-01',
            to: '2024-06-30',
            country: 'NL',
        });
        expect(countBuiltinFilters(s)).toBe(4); // verified, video, range (once), country
    });
    it('drops junk instead of forwarding it', () => {
        const s = parseBuiltinParams({
            verified: 'yes',
            video: 'maybe',
            from: '2024-02-30',
            to: 'x',
            country: 'NLD',
        });
        expect(s).toEqual({
            verified: false,
            video: null,
            from: null,
            to: null,
            country: null,
        });
    });
    it('a lone from or to still counts as one range filter', () => {
        expect(
            countBuiltinFilters(parseBuiltinParams({ from: '2020-01-01' })),
        ).toBe(1);
        expect(
            countBuiltinFilters(parseBuiltinParams({ to: '2020-01-01' })),
        ).toBe(1);
    });
});
