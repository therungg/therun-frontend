import { describe, expect, it } from 'vitest';
import type { VariableRow } from '../../../../types/leaderboards.types';
import {
    describeSource,
    findShadowed,
    normalizeVariableName,
    toEffective,
} from '../effective';

const row = (over: Partial<VariableRow>): VariableRow =>
    ({
        id: 1,
        gameId: 1,
        categoryId: null,
        name: 'Platform',
        nameNormalized: 'platform',
        role: 'subcategory',
        values: [['Nintendo 64'], ['Emulator']],
        defaultValueIndex: 0,
        sortOrder: 0,
        description: null,
        version: 1,
        published: true,
        ...over,
    }) as VariableRow;

describe('toEffective', () => {
    it('labels a game-wide row as shared', () => {
        const merged = [row({})];
        expect(toEffective(merged, merged)[0].source).toBe('shared');
    });

    it('labels a category row with no shared twin as category-only', () => {
        const merged = [
            row({ categoryId: 7, name: 'Version', nameNormalized: 'version' }),
        ];
        expect(toEffective(merged, [])[0].source).toBe('category');
    });

    it('flags a category row that shadows a shared one', () => {
        const shared = [row({})];
        const merged = [row({ id: 2, categoryId: 7 })];
        expect(toEffective(merged, shared)[0].source).toBe(
            'category-overrides-shared',
        );
    });

    it('sorts by sortOrder', () => {
        const merged = [
            row({ id: 1, nameNormalized: 'b', sortOrder: 2 }),
            row({ id: 2, nameNormalized: 'a', sortOrder: 1 }),
        ];
        expect(toEffective(merged, []).map((v) => v.nameNormalized)).toEqual([
            'a',
            'b',
        ]);
    });
});

describe('describeSource', () => {
    it('names the category in every category-scoped phrasing', () => {
        expect(describeSource('shared', 'Any%', 'Platform')).toBe(
            'Shared by all categories',
        );
        expect(describeSource('category', 'Any%', 'Platform')).toBe(
            'Any% only',
        );
        expect(
            describeSource('category-overrides-shared', 'Any%', 'Platform'),
        ).toBe('Any% only — replaces the shared Platform');
    });
});

describe('findShadowed', () => {
    const shared = [row({})];

    it('matches on the normalized name, not the typed one', () => {
        expect(findShadowed(' PLAT FORM ', shared)?.name).toBe('Platform');
    });

    it('returns undefined when nothing is shadowed', () => {
        expect(findShadowed('Version', shared)).toBeUndefined();
    });
});

describe('normalizeVariableName', () => {
    it('matches the backend normalization', () => {
        expect(normalizeVariableName(' Plat form =|')).toBe('platform');
    });
});
