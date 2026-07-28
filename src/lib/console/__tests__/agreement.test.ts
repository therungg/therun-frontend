import { describe, expect, it } from 'vitest';
import { differingIds, modalValue } from '../agreement';

describe('modalValue', () => {
    it('returns null for an empty list', () => {
        expect(modalValue([])).toBeNull();
    });

    it('returns the only value when they all agree', () => {
        expect(modalValue(['rt', 'rt', 'rt'])).toEqual({
            value: 'rt',
            count: 3,
        });
    });

    it('returns the clear majority', () => {
        expect(modalValue(['rt', 'rt', 'gt'])).toEqual({
            value: 'rt',
            count: 2,
        });
    });

    it('returns null when the top two tie', () => {
        expect(modalValue(['rt', 'gt'])).toBeNull();
        expect(modalValue(['rt', 'rt', 'gt', 'gt'])).toBeNull();
    });

    it('treats a single value as its own consensus', () => {
        expect(modalValue(['rt'])).toEqual({ value: 'rt', count: 1 });
    });

    it('distinguishes null from a value', () => {
        expect(modalValue([null, null, 5])).toEqual({ value: null, count: 2 });
    });
});

describe('differingIds', () => {
    it('marks nothing when every row agrees', () => {
        const rows = [
            { id: 1, value: 'rt' },
            { id: 2, value: 'rt' },
        ];
        expect(differingIds(rows).size).toBe(0);
    });

    it('marks only the odd one out', () => {
        const rows = [
            { id: 1, value: 'rt' },
            { id: 2, value: 'rt' },
            { id: 3, value: 'gt' },
        ];
        expect([...differingIds(rows)]).toEqual([3]);
    });

    it('marks nothing when there is no majority', () => {
        const rows = [
            { id: 1, value: 'rt' },
            { id: 2, value: 'gt' },
        ];
        expect(differingIds(rows).size).toBe(0);
    });

    it('marks nothing for a single row', () => {
        expect(differingIds([{ id: 1, value: 'rt' }]).size).toBe(0);
    });

    it('marks nothing for no rows', () => {
        expect(differingIds([]).size).toBe(0);
    });

    it('treats a null value as comparable, not as missing', () => {
        const rows = [
            { id: 1, value: null },
            { id: 2, value: null },
            { id: 3, value: 900 },
        ];
        expect([...differingIds(rows)]).toEqual([3]);
    });
});
