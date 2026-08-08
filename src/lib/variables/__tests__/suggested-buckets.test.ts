import { describe, expect, it } from 'vitest';
import {
    bucketsFromValues,
    bucketsToValueGroups,
    mergeBuckets,
} from '../suggested-buckets';

const v = (value: string, count: number) => ({
    variable: 'Platform',
    value,
    count,
});

describe('bucketsFromValues', () => {
    it('auto-collapses spellings that normalize the same, canonical = top count', () => {
        const buckets = bucketsFromValues([
            v('Nintendo 64', 30),
            v('nintendo64', 12),
        ]);
        expect(buckets).toHaveLength(1);
        expect(buckets[0].label).toBe('Nintendo 64');
        expect(buckets[0].aliases).toEqual(['Nintendo 64', 'nintendo64']);
    });

    it('keeps semantically-equal but differently-normalized spellings apart', () => {
        // "N64" -> n64, "Nintendo 64" -> nintendo64: different keys, so two
        // buckets until a human merges them.
        const buckets = bucketsFromValues([v('Nintendo 64', 30), v('N64', 8)]);
        expect(buckets.map((b) => b.label)).toEqual(['Nintendo 64', 'N64']);
    });

    it('orders buckets by count desc', () => {
        const buckets = bucketsFromValues([
            v('PC', 5),
            v('N64', 40),
            v('Wii', 20),
        ]);
        expect(buckets.map((b) => b.label)).toEqual(['N64', 'Wii', 'PC']);
    });

    it('drops blank submissions', () => {
        const buckets = bucketsFromValues([v('', 99), v('N64', 3)]);
        expect(buckets.map((b) => b.label)).toEqual(['N64']);
    });
});

describe('mergeBuckets', () => {
    it('folds source spellings into the target and keeps the target label', () => {
        const start = bucketsFromValues([v('Nintendo 64', 30), v('N64', 8)]);
        const merged = mergeBuckets(start, 'N64', 'Nintendo 64');
        expect(merged).toHaveLength(1);
        expect(merged[0].label).toBe('Nintendo 64');
        expect(merged[0].aliases).toEqual(['Nintendo 64', 'N64']);
        // Counts sum so the merge shows in the number.
        expect(merged[0].count).toBe(38);
        // Backend value shape carries every spelling so old runs resolve.
        expect(bucketsToValueGroups(merged)).toEqual([['Nintendo 64', 'N64']]);
    });

    it('re-sorts so a merged bucket that overtakes keeps its rank', () => {
        // N64(8)+VC(7) = 15 overtakes Nintendo 64(12) after the merge.
        const start = bucketsFromValues([
            v('Nintendo 64', 12),
            v('N64', 8),
            v('VC', 7),
        ]);
        const merged = mergeBuckets(start, 'VC', 'N64');
        expect(merged.map((b) => b.label)).toEqual(['N64', 'Nintendo 64']);
        expect(merged[0].count).toBe(15);
    });

    it('is a no-op for an unknown or self merge', () => {
        const start = bucketsFromValues([v('N64', 8)]);
        expect(mergeBuckets(start, 'N64', 'N64')).toEqual(start);
        expect(mergeBuckets(start, 'Missing', 'N64')).toEqual(start);
    });
});
