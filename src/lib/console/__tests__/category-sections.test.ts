import { describe, expect, it } from 'vitest';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../types/leaderboards.types';
import { sectionsFor } from '../category-sections';

function mkCat(overrides: Partial<ResolvedCategory> = {}): ResolvedCategory {
    return {
        id: 1,
        name: 'any',
        display: 'Any%',
        primaryTiming: 'rt',
        archived: false,
        sortOrder: 0,
        ...overrides,
    };
}

function mkGroup(overrides: Partial<ResolvedGroup> = {}): ResolvedGroup {
    return { id: 1, name: 'Main', sortOrder: 0, ...overrides };
}

describe('sectionsFor', () => {
    it('flattens to one unlabeled section when there are no groups', () => {
        const cats = [mkCat({ id: 1 }), mkCat({ id: 2 })];
        expect(sectionsFor(cats, [])).toEqual([
            { id: null, name: null, items: cats },
        ]);
    });

    it('flattens when a single group is the only one in use', () => {
        const cats = [mkCat({ id: 1, groupId: 5 }), mkCat({ id: 2 })];
        const sections = sectionsFor(cats, [mkGroup({ id: 5 })]);
        expect(sections).toHaveLength(1);
        expect(sections[0].name).toBeNull();
        expect(sections[0].items.map((c) => c.id)).toEqual([1, 2]);
    });

    it('splits into named sections ordered by group sortOrder, preserving item order', () => {
        const cats = [
            mkCat({ id: 1, groupId: 20 }),
            mkCat({ id: 2, groupId: 10 }),
            mkCat({ id: 3, groupId: 20 }),
        ];
        const groups = [
            mkGroup({ id: 20, name: 'Second', sortOrder: 2 }),
            mkGroup({ id: 10, name: 'First', sortOrder: 1 }),
        ];
        expect(sectionsFor(cats, groups)).toEqual([
            { id: 10, name: 'First', items: [cats[1]] },
            { id: 20, name: 'Second', items: [cats[0], cats[2]] },
        ]);
    });

    it('trails ungrouped categories in an unlabeled section', () => {
        const cats = [
            mkCat({ id: 1 }),
            mkCat({ id: 2, groupId: 10 }),
            mkCat({ id: 3, groupId: 11 }),
        ];
        const groups = [
            mkGroup({ id: 10, name: 'A', sortOrder: 1 }),
            mkGroup({ id: 11, name: 'B', sortOrder: 2 }),
        ];
        const sections = sectionsFor(cats, groups);
        expect(sections.map((s) => s.id)).toEqual([10, 11, null]);
        expect(sections[2].items.map((c) => c.id)).toEqual([1]);
    });

    it('keeps an in-use empty-of-featured group as an empty section', () => {
        const cats = [
            mkCat({ id: 1, groupId: 10 }),
            mkCat({ id: 2, groupId: 11 }),
        ];
        const groups = [
            mkGroup({ id: 10, name: 'A', sortOrder: 1 }),
            mkGroup({ id: 11, name: 'B', sortOrder: 2 }),
            mkGroup({ id: 12, name: 'C', sortOrder: 3 }),
        ];
        const sections = sectionsFor(cats, groups);
        expect(sections.map((s) => s.id)).toEqual([10, 11, 12]);
        expect(sections[2].items).toEqual([]);
    });
});
