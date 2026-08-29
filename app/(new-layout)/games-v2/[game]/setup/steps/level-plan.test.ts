import { describe, expect, it } from 'vitest';
import { buildLevelSetupPlan } from './level-plan';

const empty = {
    levelGroups: [],
    templates: [],
    categories: [],
    exclusions: [],
};

describe('buildLevelSetupPlan', () => {
    it('no-op when the game has no levels', () => {
        expect(
            buildLevelSetupPlan(
                {
                    hasLevels: false,
                    levelNames: ['E1M1'],
                    hasSubcategories: false,
                    subcategoryNames: [],
                    excluded: [],
                },
                empty,
            ),
        ).toEqual([]);
    });

    it('creates a level-only board when no category matches and no subcategories', () => {
        const plan = buildLevelSetupPlan(
            {
                hasLevels: true,
                levelNames: ['E1M1'],
                hasSubcategories: false,
                subcategoryNames: [],
                excluded: [],
            },
            empty,
        );
        expect(plan).toEqual([
            { kind: 'create-level', levelName: 'E1M1' },
            {
                kind: 'create-level-only-board',
                display: 'E1M1',
                levelName: 'E1M1',
            },
        ]);
    });

    it('moves a matching category in instead of creating (dedup + 500-avoidance)', () => {
        const plan = buildLevelSetupPlan(
            {
                hasLevels: true,
                levelNames: ['E1M1'],
                hasSubcategories: false,
                subcategoryNames: [],
                excluded: [],
            },
            { ...empty, categories: [{ id: 42, name: 'e1m1' }] },
        );
        expect(plan).toEqual([
            { kind: 'create-level', levelName: 'E1M1' },
            { kind: 'move-category', categoryId: 42, levelName: 'E1M1' },
        ]);
    });

    it('skips levels that already exist as level groups', () => {
        const plan = buildLevelSetupPlan(
            {
                hasLevels: true,
                levelNames: ['E1M1', 'E1M2'],
                hasSubcategories: false,
                subcategoryNames: [],
                excluded: [],
            },
            { ...empty, levelGroups: [{ id: 9, name: 'E1M1' }] },
        );
        expect(plan).toEqual([
            { kind: 'create-level', levelName: 'E1M2' },
            {
                kind: 'create-level-only-board',
                display: 'E1M2',
                levelName: 'E1M2',
            },
        ]);
    });

    it('with subcategories: creates levels + templates, no board ops, all-on = no exclusions', () => {
        const plan = buildLevelSetupPlan(
            {
                hasLevels: true,
                levelNames: ['E1M1'],
                hasSubcategories: true,
                subcategoryNames: ['Any%', '100%'],
                excluded: [],
            },
            empty,
        );
        expect(plan).toEqual([
            { kind: 'create-level', levelName: 'E1M1' },
            { kind: 'create-subcategory', display: 'Any%' },
            { kind: 'create-subcategory', display: '100%' },
        ]);
    });

    it('emits set-exclusion for unchecked cells', () => {
        const plan = buildLevelSetupPlan(
            {
                hasLevels: true,
                levelNames: ['E1M1'],
                hasSubcategories: true,
                subcategoryNames: ['Any%'],
                excluded: [{ levelName: 'E1M1', subcategoryName: 'Any%' }],
            },
            empty,
        );
        expect(plan).toContainEqual({
            kind: 'set-exclusion',
            levelName: 'E1M1',
            subcategoryName: 'Any%',
            excluded: true,
        });
    });
});
