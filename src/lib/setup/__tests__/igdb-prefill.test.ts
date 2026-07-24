import { describe, expect, it } from 'vitest';
import { igdbPrefillPlatforms, igdbPrefillYear } from '../igdb-prefill';

describe('igdbPrefillYear', () => {
    it('extracts the year from an ISO date', () => {
        expect(igdbPrefillYear('1998-11-21T00:00:00.000Z')).toBe(1998);
    });

    it('returns null for null input', () => {
        expect(igdbPrefillYear(null)).toBeNull();
    });

    it('returns null for an unparseable date', () => {
        expect(igdbPrefillYear('not-a-date')).toBeNull();
    });

    it('uses UTC so late-Dec-31 releases keep their year', () => {
        expect(igdbPrefillYear('1999-12-31T23:00:00.000Z')).toBe(1999);
    });
});

describe('igdbPrefillPlatforms', () => {
    it('prefers abbreviation over name', () => {
        expect(
            igdbPrefillPlatforms([
                { name: 'Nintendo Switch', abbreviation: 'Switch' },
                { name: 'PC (Microsoft Windows)', abbreviation: 'PC' },
            ]),
        ).toEqual(['Switch', 'PC']);
    });

    it('falls back to name when abbreviation is null', () => {
        expect(
            igdbPrefillPlatforms([
                { name: 'Sega Dreamcast', abbreviation: null },
            ]),
        ).toEqual(['Sega Dreamcast']);
    });

    it('dedupes and drops empty labels', () => {
        expect(
            igdbPrefillPlatforms([
                { name: 'PC', abbreviation: 'PC' },
                { name: 'PC (Windows)', abbreviation: 'PC' },
                { name: '  ', abbreviation: null },
            ]),
        ).toEqual(['PC']);
    });

    it('returns empty for empty input', () => {
        expect(igdbPrefillPlatforms([])).toEqual([]);
    });
});
