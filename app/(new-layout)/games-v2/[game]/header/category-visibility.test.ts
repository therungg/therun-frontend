import { describe, expect, it } from 'vitest';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import { computeCategoryVisibility } from './category-visibility';

function cat(
    overrides: Partial<ResolvedCategory> & { id: number },
): ResolvedCategory {
    return {
        name: `cat-${overrides.id}`,
        display: `Cat ${overrides.id}`,
        primaryTiming: 'rt',
        archived: false,
        ...overrides,
    };
}

describe('computeCategoryVisibility', () => {
    it('shows only featured categories, overflowing the rest', () => {
        const categories = [
            cat({ id: 1, isMain: true }),
            cat({ id: 2, isMain: true }),
            cat({ id: 3, isMain: false }),
        ];
        const result = computeCategoryVisibility(categories, [], 'cat-1');
        expect(result.sections).toHaveLength(1);
        expect(result.sections[0].pills.map((c) => c.id)).toEqual([1, 2]);
        expect(result.overflow.map((c) => c.id)).toEqual([3]);
    });

    it('appends the selected non-featured category to the visible band, excludes it from overflow', () => {
        const categories = [
            cat({ id: 1, isMain: true }),
            cat({ id: 2, isMain: false }),
            cat({ id: 3, isMain: false }),
        ];
        const result = computeCategoryVisibility(categories, [], 'cat-2');
        expect(result.sections[0].pills.map((c) => c.id)).toEqual([1, 2]);
        expect(result.overflow.map((c) => c.id)).toEqual([3]);
    });

    it('excludes inactive categories from overflow', () => {
        const categories = [
            cat({ id: 1, isMain: true }),
            cat({ id: 2, isMain: false, archived: true }),
            cat({ id: 3, isMain: false }),
        ];
        const result = computeCategoryVisibility(categories, [], 'cat-1');
        expect(result.overflow.map((c) => c.id)).toEqual([3]);
    });

    it('overflow is empty when every category is featured or selected', () => {
        const categories = [
            cat({ id: 1, isMain: true }),
            cat({ id: 2, isMain: true }),
        ];
        const result = computeCategoryVisibility(categories, [], 'cat-1');
        expect(result.overflow).toEqual([]);
    });

    it('falls back to top-N by playtime when nothing is featured, overflows the rest', () => {
        const categories = Array.from({ length: 7 }, (_, i) =>
            cat({ id: i + 1, isMain: false, totalRunTime: 7 - i }),
        );
        const result = computeCategoryVisibility(categories, [], 'cat-1');
        expect(result.sections[0].pills.map((c) => c.id)).toEqual([
            1, 2, 3, 4, 5,
        ]);
        expect(result.overflow.map((c) => c.id).sort()).toEqual([6, 7]);
    });

    it('splits featured categories into labeled group sections', () => {
        const groups: ResolvedGroup[] = [
            { id: 10, name: 'Main Game', sortOrder: 0 },
            { id: 20, name: 'DLC', sortOrder: 1 },
        ];
        const categories = [
            cat({ id: 1, isMain: true, groupId: 10 }),
            cat({ id: 2, isMain: true, groupId: 20 }),
            cat({ id: 3, isMain: false, groupId: 10 }),
        ];
        const result = computeCategoryVisibility(categories, groups, 'cat-1');
        expect(result.sections.map((s) => s.name)).toEqual([
            'Main Game',
            'DLC',
        ]);
        expect(result.sections[0].pills.map((c) => c.id)).toEqual([1]);
        expect(result.sections[1].pills.map((c) => c.id)).toEqual([2]);
        expect(result.overflow.map((c) => c.id)).toEqual([3]);
    });
});
