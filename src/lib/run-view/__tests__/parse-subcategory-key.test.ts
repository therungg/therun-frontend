import { describe, expect, test } from 'vitest';
import { parseSubcategoryKey } from '../parse-subcategory-key';

describe('parseSubcategoryKey', () => {
    test('empty key', () => expect(parseSubcategoryKey('')).toEqual([]));
    test('single pair', () =>
        expect(parseSubcategoryKey('platform=n64')).toEqual([
            { name: 'platform', value: 'n64' },
        ]));
    test('multiple pairs keep order', () =>
        expect(parseSubcategoryKey('platform=n64|region=us')).toEqual([
            { name: 'platform', value: 'n64' },
            { name: 'region', value: 'us' },
        ]));
    test('skips malformed segments', () =>
        expect(parseSubcategoryKey('junk|platform=n64')).toEqual([
            { name: 'platform', value: 'n64' },
        ]));
});
