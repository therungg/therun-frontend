import { describe, expect, it } from 'vitest';
import { describeConsequences, type VariablePreview } from '../consequences';

const empty: VariablePreview = { moved: 0, unresolved: 0, categories: [] };

const oneCategory: VariablePreview = {
    moved: 412,
    unresolved: 0,
    categories: [
        {
            categoryId: 1,
            display: 'Any%',
            moved: 412,
            boards: [
                {
                    key: 'platform=nintendo64',
                    label: 'Nintendo 64',
                    before: 1204,
                    after: 792,
                },
                {
                    key: 'platform=emulator',
                    label: 'Emulator',
                    before: 18,
                    after: 430,
                },
            ],
        },
    ],
};

describe('describeConsequences', () => {
    it('says nothing moves when nothing moves', () => {
        const copy = describeConsequences(empty, {
            variableName: 'Platform',
            action: 'save',
        });
        expect(copy.nothingMoves).toBe(true);
        expect(copy.headline).toBe('Nothing moves.');
        expect(copy.boards).toEqual([]);
    });

    it('counts runs, not entries, in user-facing copy', () => {
        const copy = describeConsequences(oneCategory, {
            variableName: 'Platform',
            action: 'save',
        });
        expect(copy.nothingMoves).toBe(false);
        expect(copy.headline).toBe('412 runs move to a different board.');
        expect(copy.boards).toHaveLength(2);
    });

    it('names the affected category count when more than one', () => {
        const many: VariablePreview = {
            moved: 30,
            unresolved: 0,
            categories: [
                { categoryId: 1, display: 'Any%', moved: 20, boards: [] },
                { categoryId: 2, display: '100%', moved: 10, boards: [] },
            ],
        };
        const copy = describeConsequences(many, {
            variableName: 'Platform',
            action: 'save',
        });
        expect(copy.detail).toBe('This changes 2 categories.');
        expect(copy.boards).toEqual([]);
    });

    it('mentions values that match nothing', () => {
        const copy = describeConsequences(
            { ...oneCategory, unresolved: 7 },
            { variableName: 'Platform', action: 'save' },
        );
        expect(copy.detail).toContain(
            '7 runs have a Platform that matches none of your values',
        );
    });

    it('uses delete phrasing for a delete', () => {
        const copy = describeConsequences(oneCategory, {
            variableName: 'Platform',
            action: 'delete',
        });
        expect(copy.headline).toBe(
            '412 runs move to a different board when Platform is deleted.',
        );
    });

    it('singularizes one run', () => {
        const one: VariablePreview = {
            moved: 1,
            unresolved: 0,
            categories: [
                { categoryId: 1, display: 'Any%', moved: 1, boards: [] },
            ],
        };
        expect(
            describeConsequences(one, { variableName: 'P', action: 'save' })
                .headline,
        ).toBe('1 run moves to a different board.');
    });

    it('appends unresolved sentence when nothing moves but some runs unmatched', () => {
        const copy = describeConsequences(
            { moved: 0, unresolved: 5, categories: [] },
            { variableName: 'Platform', action: 'save' },
        );
        expect(copy.nothingMoves).toBe(true);
        expect(copy.headline).toBe('Nothing moves.');
        expect(copy.detail).toContain(
            '5 runs have a Platform that matches none',
        );
        expect(copy.boards).toEqual([]);
    });
});
