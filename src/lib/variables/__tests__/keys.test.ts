import { describe, expect, it } from 'vitest';
import {
    buildSubcategoryKey,
    normalizeVariableName,
    parseSubcategoryKey,
    slugifyVariableKey,
} from '../keys';

describe('slugifyVariableKey', () => {
    it('turns a messy display name into a clean url key', () => {
        expect(slugifyVariableKey('Solo or Co-op?')).toBe('solo-or-co-op');
    });
    it('collapses runs of punctuation/whitespace to single hyphens', () => {
        expect(slugifyVariableKey('  Any % !!! Route  ')).toBe('any-route');
    });
    it('is idempotent', () => {
        const once = slugifyVariableKey('Solo or Co-op?');
        expect(slugifyVariableKey(once)).toBe(once);
    });
    it('survives normalizeVariableName unchanged (matches read-time keys)', () => {
        const slug = slugifyVariableKey('Solo or Co-op?');
        expect(normalizeVariableName(slug)).toBe(slug);
    });
    it('is empty when there is nothing alphanumeric', () => {
        expect(slugifyVariableKey('???')).toBe('');
    });
});

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
