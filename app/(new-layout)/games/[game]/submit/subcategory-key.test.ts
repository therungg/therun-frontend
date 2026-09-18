import { describe, expect, it } from 'vitest';
import { buildSubcategoryKey } from './subcategory-key';

describe('buildSubcategoryKey', () => {
    it('returns an empty string for no values', () => {
        expect(buildSubcategoryKey({})).toBe('');
    });

    it('builds a single name=value fragment', () => {
        expect(buildSubcategoryKey({ platform: 'pc' })).toBe('platform=pc');
    });

    it('sorts multiple keys alphabetically regardless of insertion order', () => {
        expect(buildSubcategoryKey({ region: 'ntsc', platform: 'pc' })).toBe(
            'platform=pc|region=ntsc',
        );
    });

    it('is stable across different key orderings of the same values', () => {
        const a = buildSubcategoryKey({ b: '1', a: '2', c: '3' });
        const b = buildSubcategoryKey({ c: '3', a: '2', b: '1' });
        expect(a).toBe(b);
        expect(a).toBe('a=2|b=1|c=3');
    });
});
