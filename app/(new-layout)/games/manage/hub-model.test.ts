import { describe, expect, it } from 'vitest';
import {
    chunk,
    formatCountBadge,
    type HubRowOk,
    settleHubRow,
} from './hub-model';

describe('chunk', () => {
    it('splits into fixed-size batches, preserving order', () => {
        expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('returns one batch when size >= length', () => {
        expect(chunk([1, 2], 4)).toEqual([[1, 2]]);
    });

    it('returns an empty array for an empty input', () => {
        expect(chunk([], 4)).toEqual([]);
    });

    it('treats a non-positive size as "one batch"', () => {
        expect(chunk([1, 2, 3], 0)).toEqual([[1, 2, 3]]);
    });
});

describe('formatCountBadge', () => {
    it('renders the plain count when not degraded', () => {
        expect(formatCountBadge(0, false)).toBe('0');
        expect(formatCountBadge(5, false)).toBe('5');
    });

    it('appends "+" for a degraded non-zero count', () => {
        expect(formatCountBadge(3, true)).toBe('3+');
    });

    it('renders "!" instead of "0+" for a degraded zero count', () => {
        expect(formatCountBadge(0, true)).toBe('!');
    });
});

describe('settleHubRow', () => {
    const okRow: HubRowOk = {
        kind: 'ok',
        slug: 'celeste',
        display: 'Celeste',
        image: null,
        count: 3,
        degraded: false,
    };

    it('passes through a fulfilled row unchanged', () => {
        expect(
            settleHubRow('celeste', { status: 'fulfilled', value: okRow }),
        ).toEqual(okRow);
    });

    it('drops a fulfilled-null row (clean 404 — the game is gone)', () => {
        expect(
            settleHubRow('stale-slug', { status: 'fulfilled', value: null }),
        ).toBeNull();
    });

    it('maps a rejection to a failed row carrying the original slug', () => {
        expect(
            settleHubRow('flaky-game', {
                status: 'rejected',
                reason: new Error('backend 500'),
            }),
        ).toEqual({ kind: 'failed', slug: 'flaky-game' });
    });
});
