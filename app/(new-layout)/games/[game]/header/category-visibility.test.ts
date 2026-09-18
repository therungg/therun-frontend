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

function grp(
    overrides: Partial<ResolvedGroup> & {
        id: number;
        name: string;
        sortOrder: number;
    },
): ResolvedGroup {
    return { kind: 'normal', rules: null, ...overrides };
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
            grp({ id: 10, name: 'Main Game', sortOrder: 0 }),
            grp({ id: 20, name: 'DLC', sortOrder: 1 }),
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

    it('orders group sections by sortOrder, not by arrival order', () => {
        const groups: ResolvedGroup[] = [
            grp({ id: 20, name: 'DLC', sortOrder: 1 }),
            grp({ id: 10, name: 'Main Game', sortOrder: 0 }),
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
    });

    it('appends a trailing ungrouped section after labeled groups', () => {
        const groups: ResolvedGroup[] = [
            grp({ id: 10, name: 'Main Game', sortOrder: 0 }),
            grp({ id: 20, name: 'DLC', sortOrder: 1 }),
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
            grp({ id: 10, name: 'Main Game', sortOrder: 0 }),
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
            grp({ id: 10, name: 'Main Game', sortOrder: 0 }),
            grp({ id: 20, name: 'DLC', sortOrder: 1 }),
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
            grp({ id: 10, name: 'Main Game', sortOrder: 0 }),
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
            grp({ id: 10, name: 'Main Game', sortOrder: 0 }),
            grp({
                id: 20,
                name: 'Category Extensions',
                sortOrder: 1,
                hiddenByDefault: true,
            }),
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
            grp({
                id: 10,
                name: 'Main Game',
                sortOrder: 0,
                hiddenByDefault: true,
            }),
        ];
        const categories = [cat({ id: 1, groupId: 10 })];
        const result = computeCategoryVisibility(categories, groups);
        expect(result.sections[0].collapsedByDefault).toBe(false);
    });

    it('pulls level groups out of the sections and returns them as levels', () => {
        const groups = [
            {
                id: 1,
                name: 'World 1',
                sortOrder: 1,
                kind: 'normal' as const,
                rules: null,
            },
            {
                id: 2,
                name: 'E1M1',
                sortOrder: 2,
                kind: 'level' as const,
                rules: 'lvl',
            },
            {
                id: 3,
                name: 'E1M2',
                sortOrder: 3,
                kind: 'level' as const,
                rules: null,
            },
        ];
        const cats = [
            cat({ id: 10, groupId: 1, display: 'Any%' }),
            cat({
                id: 20,
                groupId: 2,
                display: 'E1M1 — Any%',
                levelTemplateId: 9,
            }),
            cat({
                id: 30,
                groupId: 3,
                display: 'E1M2 — Any%',
                levelTemplateId: 9,
                // The fixture's default name (`cat-30`) doesn't carry the
                // real instance-slug convention — set it explicitly so
                // `activeCategoryName` below can match a level board by name.
                name: 'e1m2-any',
            }),
        ];
        const v = computeCategoryVisibility(cats, groups, null, 'e1m2-any');
        expect(v.sections.map((s) => s.id)).toEqual([1]);
        expect(
            v.levels.groups.map((g) => [g.id, g.boards.map((b) => b.id)]),
        ).toEqual([
            [2, [20]],
            [3, [30]],
        ]);
        expect(v.levels.activeLevelId).toBe(3);
    });

    it('returns no levels for a game without level groups', () => {
        const v = computeCategoryVisibility([cat({ id: 1 })], [], null);
        expect(v.levels).toEqual({ groups: [], activeLevelId: null });
    });

    it('emits no empty flattened section for a levels-only game', () => {
        const groups: ResolvedGroup[] = [
            grp({ id: 1, name: 'E1M1', sortOrder: 1, kind: 'level' }),
        ];
        const cats = [
            cat({
                id: 20,
                groupId: 1,
                display: 'E1M1 — Any%',
                levelTemplateId: 9,
            }),
        ];
        const v = computeCategoryVisibility(cats, groups);
        expect(v.sections).toEqual([]);
        expect(v.levels.groups).toEqual([
            { id: 1, name: 'E1M1', rules: null, boards: [cats[0]] },
        ]);
    });

    it('never collapses the trailing ungrouped section', () => {
        const groups: ResolvedGroup[] = [
            grp({
                id: 10,
                name: 'Main Game',
                sortOrder: 0,
                hiddenByDefault: true,
            }),
            grp({ id: 20, name: 'DLC', sortOrder: 1, hiddenByDefault: true }),
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
        const result = computeCategoryVisibility(
            many(AUTO_PILL_LIMIT),
            [],
            'auto',
        );
        expect(result.sections[0].displayMode).toBe('pills');
    });

    it('auto reaches for a dropdown one past the limit', () => {
        const result = computeCategoryVisibility(
            many(AUTO_PILL_LIMIT + 1),
            [],
            'auto',
        );
        expect(result.sections[0].displayMode).toBe('dropdown');
    });

    it('an unset board defaults to pills, even past the auto limit', () => {
        const result = computeCategoryVisibility(many(AUTO_PILL_LIMIT + 1), []);
        expect(result.sections[0].displayMode).toBe('pills');
    });

    it('the game default carries the flat case, which has no group row', () => {
        const result = computeCategoryVisibility(many(2), [], 'dropdown');
        expect(result.sections[0].displayMode).toBe('dropdown');
    });

    it('a group overrides the game default', () => {
        const groups: ResolvedGroup[] = [
            grp({
                id: 10,
                name: 'Main Game',
                sortOrder: 0,
                displayMode: 'pills',
            }),
            grp({ id: 20, name: 'DLC', sortOrder: 1 }),
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

    it('one group set to dropdown keeps dropdown when it flattens', () => {
        const groups: ResolvedGroup[] = [
            grp({
                id: 10,
                name: 'Main',
                sortOrder: 0,
                displayMode: 'dropdown',
            }),
        ];
        const result = computeCategoryVisibility(many(2, 10), groups);
        // One group flattens to a single unlabeled section, but its dropdown
        // choice still applies.
        expect(result.sections).toHaveLength(1);
        expect(result.sections[0].name).toBeNull();
        expect(result.sections[0].displayMode).toBe('dropdown');
    });

    it('a stated auto beats an inherited dropdown, then counts', () => {
        const groups: ResolvedGroup[] = [
            grp({
                id: 10,
                name: 'Main Game',
                sortOrder: 0,
                displayMode: 'auto',
            }),
            grp({ id: 20, name: 'DLC', sortOrder: 1 }),
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
