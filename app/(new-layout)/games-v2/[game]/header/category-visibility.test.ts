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
        sortOrder: 0,
        isMain: true,
        ...overrides,
    };
}

describe('computeCategoryVisibility', () => {
    it('lists all passed-in (Featured) categories, sorted by playtime', () => {
        const categories = [
            cat({ id: 1, totalRunTime: 10 }),
            cat({ id: 2, totalRunTime: 30 }),
            cat({ id: 3, totalRunTime: 20 }),
        ];
        const result = computeCategoryVisibility(categories, []);
        expect(result.sections).toHaveLength(1);
        expect(result.sections[0].pills.map((c) => c.id)).toEqual([2, 3, 1]);
    });

    it('returns a single trivial section when there are no groups', () => {
        const categories = [cat({ id: 1 }), cat({ id: 2 })];
        const result = computeCategoryVisibility(categories, []);
        expect(result.sections).toEqual([
            { id: null, name: null, pills: categories },
        ]);
    });

    it('splits categories into labeled group sections in sortOrder', () => {
        const groups: ResolvedGroup[] = [
            { id: 10, name: 'Main Game', sortOrder: 0 },
            { id: 20, name: 'DLC', sortOrder: 1 },
        ];
        const categories = [
            cat({ id: 1, groupId: 10 }),
            cat({ id: 2, groupId: 20 }),
        ];
        const result = computeCategoryVisibility(categories, groups);
        expect(result.sections.map((s) => s.name)).toEqual([
            'Main Game',
            'DLC',
        ]);
        expect(result.sections[0].pills.map((c) => c.id)).toEqual([1]);
        expect(result.sections[1].pills.map((c) => c.id)).toEqual([2]);
    });

    it('appends a trailing ungrouped section after labeled groups', () => {
        const groups: ResolvedGroup[] = [
            { id: 10, name: 'Main Game', sortOrder: 0 },
            { id: 20, name: 'DLC', sortOrder: 1 },
        ];
        const categories = [
            cat({ id: 1, groupId: 10 }),
            cat({ id: 2, groupId: null }),
        ];
        const result = computeCategoryVisibility(categories, groups);
        expect(result.sections.map((s) => s.name)).toEqual([
            'Main Game',
            'DLC',
            null,
        ]);
        expect(result.sections[2].pills.map((c) => c.id)).toEqual([2]);
    });

    it('orders pills within a section by playtime descending', () => {
        const groups: ResolvedGroup[] = [
            { id: 10, name: 'Main Game', sortOrder: 0 },
        ];
        const categories = [
            cat({ id: 1, groupId: 10, totalRunTime: 5 }),
            cat({ id: 2, groupId: 10, totalRunTime: 50 }),
            cat({ id: 3, groupId: 10, totalRunTime: 25 }),
        ];
        const result = computeCategoryVisibility(categories, groups);
        expect(result.sections[0].pills.map((c) => c.id)).toEqual([2, 3, 1]);
    });

    it('explicit sortOrder beats playtime within a section', () => {
        const cats = [
            cat({ id: 1, name: 'a', totalRunTime: 999, sortOrder: 2 }),
            cat({ id: 2, name: 'b', totalRunTime: 5, sortOrder: 1 }),
        ];
        const { sections } = computeCategoryVisibility(cats, []);
        expect(sections[0].pills.map((c) => c.id)).toEqual([2, 1]);
    });

    it('unset sortOrder rows trail ordered rows', () => {
        const cats = [
            cat({ id: 1, name: 'a', totalRunTime: 999, sortOrder: 0 }),
            cat({ id: 2, name: 'b', totalRunTime: 5, sortOrder: 1 }),
        ];
        const { sections } = computeCategoryVisibility(cats, []);
        expect(sections[0].pills.map((c) => c.id)).toEqual([2, 1]);
    });

    it('treats a single group with all categories in it as trivial', () => {
        const groups: ResolvedGroup[] = [
            { id: 10, name: 'Main Game', sortOrder: 0 },
        ];
        const categories = [
            cat({ id: 1, groupId: 10 }),
            cat({ id: 2, groupId: 10 }),
        ];
        const result = computeCategoryVisibility(categories, groups);
        expect(result.sections).toEqual([
            { id: null, name: null, pills: [categories[0], categories[1]] },
        ]);
    });
});
