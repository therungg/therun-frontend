import { describe, expect, it } from 'vitest';
import {
    deriveDeveloper,
    deriveGenres,
    derivePlatforms,
    deriveReleaseYear,
} from './game-facts';

describe('deriveReleaseYear', () => {
    it('prefers the moderator-set year', () => {
        expect(deriveReleaseYear(1994, '2007-10-10T00:00:00.000Z')).toBe(
            '1994',
        );
    });
    it('falls back to the IGDB first release date (UTC year)', () => {
        expect(deriveReleaseYear(null, '1996-06-23T00:00:00.000Z')).toBe(
            '1996',
        );
    });
    it('returns null when neither exists', () => {
        expect(deriveReleaseYear(null, null)).toBeNull();
    });
    it('returns null for an unparseable date', () => {
        expect(deriveReleaseYear(null, 'not-a-date')).toBeNull();
    });
});

describe('derivePlatforms', () => {
    const igdb = [
        { name: 'Nintendo 64', abbreviation: 'N64' },
        { name: 'Wii U', abbreviation: 'WiiU' },
        { name: 'Wii', abbreviation: null },
    ];
    it('prefers moderator-set platforms verbatim', () => {
        expect(derivePlatforms(['SNES'], igdb)).toBe('SNES');
    });
    it('falls back to IGDB abbreviations, using name when abbreviation is null', () => {
        expect(derivePlatforms([], igdb)).toBe('N64, WiiU, Wii');
    });
    it('caps IGDB platforms at 4 with +N overflow', () => {
        const many = ['A', 'B', 'C', 'D', 'E', 'F'].map((n) => ({
            name: n,
            abbreviation: n,
        }));
        expect(derivePlatforms([], many)).toBe('A, B, C, D +2');
    });
    it('exactly 4 IGDB platforms join with no +N marker', () => {
        const four = ['A', 'B', 'C', 'D'].map((n) => ({
            name: n,
            abbreviation: n,
        }));
        expect(derivePlatforms([], four)).toBe('A, B, C, D');
    });
    it('falls back to name when abbreviation is an empty string', () => {
        expect(
            derivePlatforms([], [{ name: 'Super Nintendo', abbreviation: '' }]),
        ).toBe('Super Nintendo');
    });
    it('returns null when both sources are empty', () => {
        expect(derivePlatforms([], [])).toBeNull();
    });
});

describe('deriveDeveloper', () => {
    it('joins developer-flagged companies and ignores publisher-only rows', () => {
        expect(
            deriveDeveloper([
                { name: 'Gradiente', isDeveloper: false, isPublisher: true },
                {
                    name: 'Nintendo EAD',
                    isDeveloper: true,
                    isPublisher: false,
                },
            ]),
        ).toBe('Nintendo EAD');
    });
    it('joins multiple developers', () => {
        expect(
            deriveDeveloper([
                { name: 'A', isDeveloper: true, isPublisher: false },
                { name: 'B', isDeveloper: true, isPublisher: true },
            ]),
        ).toBe('A, B');
    });
    it('falls back to the first company when none is developer-flagged', () => {
        expect(
            deriveDeveloper([
                { name: 'Valve', isDeveloper: false, isPublisher: true },
            ]),
        ).toBe('Valve');
    });
    it('returns null for no companies', () => {
        expect(deriveDeveloper([])).toBeNull();
    });
});

describe('deriveGenres', () => {
    it('joins up to three genres', () => {
        expect(deriveGenres(['Platform', 'Adventure'])).toBe(
            'Platform, Adventure',
        );
    });
    it('caps at three without overflow marker', () => {
        expect(deriveGenres(['A', 'B', 'C', 'D'])).toBe('A, B, C');
    });
    it('exactly three genres joins all with no truncation', () => {
        expect(deriveGenres(['A', 'B', 'C'])).toBe('A, B, C');
    });
    it('returns null when empty', () => {
        expect(deriveGenres([])).toBeNull();
    });
});
