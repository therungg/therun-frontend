import { describe, expect, it } from 'vitest';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../types/moderation.types';
import {
    buildCategoryRows,
    disagreementsByColumn,
    subBoardCount,
    toPrimaryTiming,
} from '../category-rows';

const cat = (over: Partial<ResolvedCategory> = {}): ResolvedCategory => ({
    id: 1,
    name: 'any',
    display: 'Any%',
    primaryTiming: 'rt',
    archived: false,
    sortOrder: 1,
    isMain: true,
    ...over,
});

const policy = (categoryId: number, minTimeMs: number): BoardPolicyRow => ({
    id: 100 + categoryId,
    gameId: 7,
    categoryId,
    subcategoryKey: null,
    policyType: 'min_time',
    value: { minTimeMs },
    createdBy: 1,
    reason: '',
    createdAt: '2026-01-01T00:00:00Z',
});

const variable = (over: Partial<VariableRow> = {}): VariableRow => ({
    id: 1,
    gameId: 7,
    categoryId: null,
    name: 'Platform',
    nameNormalized: 'platform',
    role: 'subcategory',
    values: [['N64'], ['VC'], ['Emu'], ['Switch']],
    defaultValueIndex: 0,
    sortOrder: 1,
    description: null,
    version: 1,
    published: true,
    ...over,
});

describe('toPrimaryTiming', () => {
    it('maps the resolved enum onto the write enum', () => {
        expect(toPrimaryTiming('rt')).toBe('realtime');
        expect(toPrimaryTiming('gt')).toBe('gametime');
    });
});

describe('subBoardCount', () => {
    it('multiplies the value counts of subcategory variables', () => {
        const vars = [
            variable(),
            variable({
                id: 2,
                name: 'Version',
                nameNormalized: 'version',
                values: [['1.0'], ['1.1']],
            }),
        ];
        expect(subBoardCount(vars, 1)).toBe(8);
    });

    it('ignores filter-role variables', () => {
        expect(subBoardCount([variable({ role: 'filter' })], 1)).toBe(1);
    });

    it('ignores unpublished variables', () => {
        expect(subBoardCount([variable({ published: false })], 1)).toBe(1);
    });

    it('lets a category row wholesale-replace the game-wide row of that name', () => {
        const vars = [
            variable(),
            variable({ id: 9, categoryId: 1, values: [['N64'], ['Emu']] }),
        ];
        expect(subBoardCount(vars, 1)).toBe(2);
    });

    it('does not apply another categorys override', () => {
        const vars = [
            variable(),
            variable({ id: 9, categoryId: 2, values: [['N64'], ['Emu']] }),
        ];
        expect(subBoardCount(vars, 1)).toBe(4);
    });

    it('is 1 when the game has no variables', () => {
        expect(subBoardCount([], 1)).toBe(1);
    });
});

describe('buildCategoryRows', () => {
    it('normalises timing and attaches the minimum', () => {
        const rows = buildCategoryRows({
            categories: [cat({ id: 1, primaryTiming: 'gt' })],
            policies: [policy(1, 4500000)],
            variables: [],
        });
        expect(rows[0].timing).toBe('gametime');
        expect(rows[0].minTimeMs).toBe(4500000);
    });

    it('reads minTimeMs, not rtMs', () => {
        const bad = { ...policy(1, 0), value: { rtMs: 999 } };
        const rows = buildCategoryRows({
            categories: [cat({ id: 1 })],
            policies: [bad],
            variables: [],
        });
        expect(rows[0].minTimeMs).toBeNull();
    });

    it('ignores policies for other categories and non-min_time policies', () => {
        const rows = buildCategoryRows({
            categories: [cat({ id: 1 })],
            policies: [
                policy(2, 1000),
                { ...policy(1, 2000), policyType: 'max_time' as const },
            ],
            variables: [],
        });
        expect(rows[0].minTimeMs).toBeNull();
    });

    it('derives hasRules from non-blank rules text', () => {
        const rows = buildCategoryRows({
            categories: [
                cat({ id: 1, rules: '  ' }),
                cat({ id: 2, rules: 'No BLJ' }),
            ],
            policies: [],
            variables: [],
        });
        expect(rows[0].hasRules).toBe(false);
        expect(rows[1].hasRules).toBe(true);
    });
});

describe('disagreementsByColumn', () => {
    it('compares featured categories only', () => {
        const rows = buildCategoryRows({
            categories: [
                cat({ id: 1, primaryTiming: 'rt' }),
                cat({ id: 2, primaryTiming: 'rt' }),
                cat({ id: 3, primaryTiming: 'gt', isMain: false }),
            ],
            policies: [],
            variables: [],
        });
        expect(disagreementsByColumn(rows).timing.size).toBe(0);
    });

    it('excludes archived categories from the comparison', () => {
        const rows = buildCategoryRows({
            categories: [
                cat({ id: 1, primaryTiming: 'rt' }),
                cat({ id: 2, primaryTiming: 'rt' }),
                cat({ id: 3, primaryTiming: 'gt', archived: true }),
            ],
            policies: [],
            variables: [],
        });
        expect(disagreementsByColumn(rows).timing.size).toBe(0);
    });

    it('marks the featured outlier', () => {
        const rows = buildCategoryRows({
            categories: [
                cat({ id: 1 }),
                cat({ id: 2 }),
                cat({ id: 3, primaryTiming: 'gt' }),
            ],
            policies: [],
            variables: [],
        });
        expect([...disagreementsByColumn(rows).timing]).toEqual([3]);
    });

    it('marks a missing minimum as the outlier', () => {
        const rows = buildCategoryRows({
            categories: [cat({ id: 1 }), cat({ id: 2 }), cat({ id: 3 })],
            policies: [policy(1, 60000), policy(2, 60000)],
            variables: [],
        });
        expect([...disagreementsByColumn(rows).minimum]).toEqual([3]);
    });
});
