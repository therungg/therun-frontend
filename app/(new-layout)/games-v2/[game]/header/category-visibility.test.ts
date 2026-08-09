import { describe, expect, it } from 'vitest';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import {
    AUTO_PILL_LIMIT,
    computeCategoryVisibility,
} from './category-visibility';

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
            {
                id: null,
                name: null,
                pills: categories,
                collapsedByDefault: false,
                displayMode: 'pills',
            },
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

    it('applies sortOrder within each group section, over playtime', () => {
        const groups: ResolvedGroup[] = [
            { id: 10, name: 'Main Game', sortOrder: 0 },
            { id: 20, name: 'DLC', sortOrder: 1 },
        ];
        const categories = [
            cat({ id: 1, groupId: 10, sortOrder: 2, totalRunTime: 999 }),
            cat({ id: 2, groupId: 10, sortOrder: 1, totalRunTime: 5 }),
            cat({ id: 3, groupId: 20, sortOrder: 1 }),
        ];
        const result = computeCategoryVisibility(categories, groups);
        expect(result.sections[0].pills.map((c) => c.id)).toEqual([2, 1]);
        expect(result.sections[1].pills.map((c) => c.id)).toEqual([3]);
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
            {
                id: null,
                name: null,
                pills: [categories[0], categories[1]],
                collapsedByDefault: false,
                displayMode: 'pills',
            },
        ]);
    });

    it('marks a hidden-by-default group as collapsed', () => {
        const groups: ResolvedGroup[] = [
            { id: 10, name: 'Main Game', sortOrder: 0 },
            {
                id: 20,
                name: 'Category Extensions',
                sortOrder: 1,
                hiddenByDefault: true,
            },
        ];
        const categories = [
            cat({ id: 1, groupId: 10 }),
            cat({ id: 2, groupId: 20 }),
        ];
        const result = computeCategoryVisibility(categories, groups);
        expect(result.sections.map((s) => s.collapsedByDefault)).toEqual([
            false,
            true,
        ]);
    });

    it('ignores hidden-by-default on the flattened single-group section', () => {
        const groups: ResolvedGroup[] = [
            { id: 10, name: 'Main Game', sortOrder: 0, hiddenByDefault: true },
        ];
        const categories = [cat({ id: 1, groupId: 10 })];
        const result = computeCategoryVisibility(categories, groups);
        expect(result.sections[0].collapsedByDefault).toBe(false);
    });

    it('never collapses the trailing ungrouped section', () => {
        const groups: ResolvedGroup[] = [
            { id: 10, name: 'Main Game', sortOrder: 0, hiddenByDefault: true },
            { id: 20, name: 'DLC', sortOrder: 1, hiddenByDefault: true },
        ];
        const categories = [
            cat({ id: 1, groupId: 10 }),
            cat({ id: 2, groupId: null }),
        ];
        const result = computeCategoryVisibility(categories, groups);
        expect(result.sections.at(-1)).toMatchObject({
            name: null,
            collapsedByDefault: false,
        });
    });
});

describe('computeCategoryVisibility — display mode', () => {
    const many = (n: number, groupId: number | null = null) =>
        Array.from({ length: n }, (_, i) => cat({ id: i + 1, groupId }));

    it('auto stays on pills while the band still fits', () => {
        const result = computeCategoryVisibility(many(AUTO_PILL_LIMIT), []);
        expect(result.sections[0].displayMode).toBe('pills');
    });

    it('auto reaches for a dropdown one past the limit', () => {
        const result = computeCategoryVisibility(many(AUTO_PILL_LIMIT + 1), []);
        expect(result.sections[0].displayMode).toBe('dropdown');
    });

    it('the game default carries the flat case, which has no group row', () => {
        const result = computeCategoryVisibility(many(2), [], 'dropdown');
        expect(result.sections[0].displayMode).toBe('dropdown');
    });

    it('a group overrides the game default', () => {
        const groups: ResolvedGroup[] = [
            { id: 10, name: 'Main Game', sortOrder: 0, displayMode: 'pills' },
            { id: 20, name: 'DLC', sortOrder: 1 },
        ];
        const categories = [
            cat({ id: 1, groupId: 10 }),
            cat({ id: 2, groupId: 20 }),
        ];
        const result = computeCategoryVisibility(
            categories,
            groups,
            'dropdown',
        );
        expect(result.sections.map((s) => s.displayMode)).toEqual([
            'pills',
            'dropdown',
        ]);
    });

    it('a stated auto beats an inherited dropdown, then counts', () => {
        const groups: ResolvedGroup[] = [
            { id: 10, name: 'Main Game', sortOrder: 0, displayMode: 'auto' },
            { id: 20, name: 'DLC', sortOrder: 1 },
        ];
        const categories = [...many(2, 10), cat({ id: 99, groupId: 20 })];
        const result = computeCategoryVisibility(
            categories,
            groups,
            'dropdown',
        );
        expect(result.sections[0].displayMode).toBe('pills');
    });
});
