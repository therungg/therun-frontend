import { describe, expect, it } from 'vitest';
import type {
    ResolvedCategory,
    VariableDef,
} from '../../../../../types/leaderboards.types';
import { effectiveSubcategoryLabel, groupShowsEmblems } from './board-identity';

function def(
    overrides: Partial<VariableDef> & { nameNormalized: string },
): VariableDef {
    return {
        id: 1,
        gameId: 1,
        categoryId: null,
        name: overrides.nameNormalized,
        role: 'subcategory',
        values: [['A'], ['B']],
        defaultValueIndex: null,
        sortOrder: 0,
        description: null,
        version: 1,
        published: true,
        scope: 'game',
        ...overrides,
    };
}

function cat(
    overrides: Partial<ResolvedCategory> & { id: number },
): ResolvedCategory {
    return {
        name: `cat-${overrides.id}`,
        display: `Cat ${overrides.id}`,
        primaryTiming: 'rt',
        archived: false,
        sortOrder: 0,
        ...overrides,
    };
}

describe('effectiveSubcategoryLabel', () => {
    it('uses the selected value', () => {
        const defs = [
            def({
                nameNormalized: 'character',
                values: [['Mario'], ['Luigi']],
            }),
        ];
        expect(effectiveSubcategoryLabel(defs, { character: 'Luigi' })).toBe(
            'Luigi',
        );
    });

    it('falls back to the default when nothing is selected', () => {
        const defs = [
            def({
                nameNormalized: 'character',
                values: [['Mario'], ['Luigi']],
                defaultValueIndex: 0,
            }),
        ];
        expect(effectiveSubcategoryLabel(defs, {})).toBe('Mario');
    });

    it('omits a variable with no selection and no default', () => {
        const defs = [
            def({
                nameNormalized: 'character',
                values: [['Mario']],
                defaultValueIndex: 0,
            }),
            def({
                nameNormalized: 'ruleset',
                values: [['NMS']],
                defaultValueIndex: null,
                sortOrder: 1,
            }),
        ];
        expect(effectiveSubcategoryLabel(defs, {})).toBe('Mario');
    });

    it('joins several variables in sortOrder with a middle dot', () => {
        const defs = [
            def({
                nameNormalized: 'ruleset',
                values: [['NMS']],
                defaultValueIndex: 0,
                sortOrder: 2,
            }),
            def({
                nameNormalized: 'character',
                values: [['Mario']],
                defaultValueIndex: 0,
                sortOrder: 1,
            }),
        ];
        expect(effectiveSubcategoryLabel(defs, {})).toBe('Mario · NMS');
    });

    it('ignores filter-role variables', () => {
        const defs = [
            def({
                nameNormalized: 'character',
                values: [['Mario']],
                defaultValueIndex: 0,
            }),
            def({
                nameNormalized: 'platform',
                role: 'filter',
                values: [['N64']],
                defaultValueIndex: 0,
                sortOrder: 1,
            }),
        ];
        expect(effectiveSubcategoryLabel(defs, {})).toBe('Mario');
    });

    it('returns an empty string when there are no subcategory variables', () => {
        expect(effectiveSubcategoryLabel([], {})).toBe('');
    });
});

describe('groupShowsEmblems', () => {
    it('is true only when every category in the group has art', () => {
        expect(
            groupShowsEmblems([
                cat({ id: 1, imageUrl: 'https://x/1.png' }),
                cat({ id: 2, imageUrl: 'https://x/2.png' }),
            ]),
        ).toBe(true);
    });

    it('is false when one category is missing art, so the row stays uniform', () => {
        expect(
            groupShowsEmblems([
                cat({ id: 1, imageUrl: 'https://x/1.png' }),
                cat({ id: 2 }),
            ]),
        ).toBe(false);
    });

    it('treats null art as missing', () => {
        expect(groupShowsEmblems([cat({ id: 1, imageUrl: null })])).toBe(false);
    });

    it('is false for an empty group', () => {
        expect(groupShowsEmblems([])).toBe(false);
    });
});
