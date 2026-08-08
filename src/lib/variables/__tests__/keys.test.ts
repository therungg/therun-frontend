import { describe, expect, it } from 'vitest';
import { buildSubcategoryKey, parseSubcategoryKey } from '../keys';

describe('parseSubcategoryKey', () => {
    it('splits pipe-joined name=value pairs', () => {
        expect(parseSubcategoryKey('platform=pc|version=1.0')).toEqual([
            { name: 'platform', value: 'pc' },
            { name: 'version', value: '1.0' },
        ]);
    });
    it('returns [] for the empty key (the no-variables board)', () => {
        expect(parseSubcategoryKey('')).toEqual([]);
    });
    it('tolerates a pair without =', () => {
        expect(parseSubcategoryKey('weird')).toEqual([
            { name: 'weird', value: '' },
        ]);
    });
});

describe('buildSubcategoryKey', () => {
    it('round-trips parse, sorted by name', () => {
        const key = buildSubcategoryKey([
            { name: 'version', value: '1.0' },
            { name: 'platform', value: 'pc' },
        ]);
        expect(key).toBe('platform=pc|version=1.0');
    });
    it('builds the empty key from no parts', () => {
        expect(buildSubcategoryKey([])).toBe('');
    });
});
