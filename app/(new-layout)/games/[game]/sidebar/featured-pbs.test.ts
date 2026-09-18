import { describe, expect, it } from 'vitest';
import type {
    RecentPb,
    ResolvedCategory,
} from '../../../../../types/leaderboards.types';
import { filterPbsToFeatured } from './featured-pbs';

function cat(id: number, name: string, display = name): ResolvedCategory {
    return {
        id,
        name,
        display,
        primaryTiming: 'rt',
        archived: false,
        isMain: true,
        sortOrder: 0,
    };
}

function pb(over: Partial<RecentPb>): RecentPb {
    return {
        id: 1,
        username: 'runner',
        game: 'Super Mario 64',
        category: 'Any%',
        time: 1000,
        endedAt: '2026-07-01T00:00:00Z',
        isPb: true,
        ...over,
    };
}

const featured = [cat(1, 'any', 'Any%'), cat(2, '120star', '120 Star')];

describe('filterPbsToFeatured', () => {
    it('keeps PBs whose categoryId is featured', () => {
        const kept = filterPbsToFeatured(
            [pb({ id: 10, categoryId: 1 }), pb({ id: 11, categoryId: 2 })],
            featured,
        );
        expect(kept.map((p) => p.id)).toEqual([10, 11]);
    });

    it('drops PBs from non-featured categories', () => {
        const kept = filterPbsToFeatured(
            [
                pb({ id: 10, categoryId: 1 }),
                pb({ id: 11, categoryId: 99, category: '16 Star' }),
            ],
            featured,
        );
        expect(kept.map((p) => p.id)).toEqual([10]);
    });

    it('trusts categoryId over the display name when they disagree', () => {
        // A row whose display string collides with a featured category but
        // whose id says otherwise is not featured — ids are the source of
        // truth, names are only a fallback.
        const kept = filterPbsToFeatured(
            [pb({ id: 10, categoryId: 99, category: 'Any%' })],
            featured,
        );
        expect(kept).toEqual([]);
    });

    it('falls back to the normalized display name when categoryId is absent', () => {
        const kept = filterPbsToFeatured(
            [
                pb({ id: 10, category: 'Any%' }),
                pb({ id: 11, category: '120 star' }),
                pb({ id: 12, category: '16 Star' }),
            ],
            featured,
        );
        expect(kept.map((p) => p.id)).toEqual([10, 11]);
    });

    it('drops rows it cannot place at all', () => {
        expect(
            filterPbsToFeatured([pb({ id: 10, category: '' })], featured),
        ).toEqual([]);
        expect(
            filterPbsToFeatured(
                [pb({ id: 10, categoryId: null, category: '' })],
                featured,
            ),
        ).toEqual([]);
    });

    it('returns nothing when the game has no featured categories', () => {
        expect(filterPbsToFeatured([pb({ categoryId: 1 })], [])).toEqual([]);
    });

    it('preserves feed order', () => {
        const kept = filterPbsToFeatured(
            [
                pb({ id: 30, categoryId: 2 }),
                pb({ id: 20, categoryId: 99 }),
                pb({ id: 10, categoryId: 1 }),
            ],
            featured,
        );
        expect(kept.map((p) => p.id)).toEqual([30, 10]);
    });
});
