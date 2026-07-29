import { describe, expect, it } from 'vitest';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../types/moderation.types';
import {
    type CopyChoices,
    eligibleCopySources,
    planCategoryCopy,
} from '../copy-category';

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

function mkVar(overrides: Partial<VariableRow> = {}): VariableRow {
    return {
        id: 1,
        gameId: 1,
        categoryId: null,
        name: 'Platform',
        nameNormalized: 'platform',
        role: 'subcategory',
        values: [['PC'], ['Switch']],
        defaultValueIndex: 0,
        sortOrder: 0,
        description: null,
        version: 1,
        published: true,
        ...overrides,
    };
}

function mkPolicy(overrides: Partial<BoardPolicyRow> = {}): BoardPolicyRow {
    return {
        id: 1,
        gameId: 1,
        categoryId: null,
        subcategoryKey: null,
        policyType: 'min_time',
        value: {},
        createdBy: 1,
        reason: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        ...overrides,
    };
}

const NO_CHOICES: CopyChoices = {
    rules: false,
    timing: false,
    proof: false,
    minimum: false,
    variables: false,
};

describe('planCategoryCopy', () => {
    it('adds a rules step and flags an overwrite when the target already has rules', () => {
        const source = mkCat({ id: 1, rules: 'No major skips.' });
        const target = mkCat({ id: 2, rules: 'Old rules text.' });

        const plan = planCategoryCopy({
            source,
            target,
            choices: { ...NO_CHOICES, rules: true },
            variables: [],
            policies: [],
        });

        expect(plan.steps).toEqual([
            { kind: 'rules', rules: 'No major skips.' },
        ]);
        expect(plan.overwrites).toContain('Rules');
    });

    it('emits no rules step when the source has none', () => {
        const source = mkCat({ id: 1, rules: null });
        const target = mkCat({ id: 2, rules: 'Old rules text.' });

        const plan = planCategoryCopy({
            source,
            target,
            choices: { ...NO_CHOICES, rules: true },
            variables: [],
            policies: [],
        });

        expect(plan.steps).toEqual([]);
        expect(plan.overwrites).not.toContain('Rules');
    });

    it("maps the source's realtime-scoped primary timing to 'realtime'", () => {
        const source = mkCat({
            id: 1,
            primaryTiming: 'rt',
            hideRealTime: false,
            hideGameTime: true,
        });
        const target = mkCat({ id: 2 });

        const plan = planCategoryCopy({
            source,
            target,
            choices: { ...NO_CHOICES, timing: true },
            variables: [],
            policies: [],
        });

        expect(plan.steps).toEqual([
            {
                kind: 'timing',
                primaryTiming: 'realtime',
                hideRealTime: false,
                hideGameTime: true,
            },
        ]);
    });

    it("maps the source's gametime-scoped primary timing to 'gametime'", () => {
        const source = mkCat({ id: 1, primaryTiming: 'gt' });
        const target = mkCat({ id: 2 });

        const plan = planCategoryCopy({
            source,
            target,
            choices: { ...NO_CHOICES, timing: true },
            variables: [],
            policies: [],
        });

        expect(plan.steps[0]).toMatchObject({ primaryTiming: 'gametime' });
    });

    it('carries the source minimum-time policy value verbatim and targets the existing target policy', () => {
        const source = mkCat({ id: 1, primaryTiming: 'rt' });
        const target = mkCat({ id: 2 });
        const policies: BoardPolicyRow[] = [
            mkPolicy({
                id: 10,
                categoryId: 1,
                value: { minTimeMs: 5000 },
            }),
            mkPolicy({
                id: 20,
                categoryId: 2,
                value: { minTimeMs: 1000 },
            }),
        ];

        const plan = planCategoryCopy({
            source,
            target,
            choices: { ...NO_CHOICES, minimum: true },
            variables: [],
            policies,
        });

        expect(plan.steps).toEqual([
            {
                kind: 'minimum',
                value: { minTimeMs: 5000 },
                targetPolicyId: 20,
            },
        ]);
        expect(plan.overwrites).toContain('Minimum time');
    });

    it('targets null when the target category has no minimum-time policy yet', () => {
        const source = mkCat({ id: 1 });
        const target = mkCat({ id: 2 });
        const policies: BoardPolicyRow[] = [
            mkPolicy({ id: 10, categoryId: 1, value: { minTimeMs: 5000 } }),
        ];

        const plan = planCategoryCopy({
            source,
            target,
            choices: { ...NO_CHOICES, minimum: true },
            variables: [],
            policies,
        });

        expect(plan.steps).toEqual([
            {
                kind: 'minimum',
                value: { minTimeMs: 5000 },
                targetPolicyId: null,
            },
        ]);
        expect(plan.overwrites).not.toContain('Minimum time');
    });

    it('emits no minimum step when the source has no category-scoped min_time policy', () => {
        const source = mkCat({ id: 1 });
        const target = mkCat({ id: 2 });
        const policies: BoardPolicyRow[] = [
            // Game-wide (null categoryId) — not a category-scoped policy of `source`.
            mkPolicy({ id: 30, categoryId: null, value: { minTimeMs: 500 } }),
        ];

        const plan = planCategoryCopy({
            source,
            target,
            choices: { ...NO_CHOICES, minimum: true },
            variables: [],
            policies,
        });

        expect(plan.steps).toEqual([]);
    });

    it('turns source-scoped variables into UpsertVariableInput targeting the destination category, skipping game-wide ones', () => {
        const source = mkCat({ id: 1 });
        const target = mkCat({ id: 2 });
        const variables: VariableRow[] = [
            mkVar({
                id: 100,
                categoryId: 1,
                name: 'Platform',
                role: 'subcategory',
                values: [['PC'], ['Switch']],
                defaultValueIndex: 0,
                sortOrder: 0,
            }),
            // Game-wide — must NOT be copied.
            mkVar({ id: 200, categoryId: null, name: 'Region' }),
        ];

        const plan = planCategoryCopy({
            source,
            target,
            choices: { ...NO_CHOICES, variables: true },
            variables,
            policies: [],
        });

        const variableSteps = plan.steps.filter((s) => s.kind === 'variable');
        expect(variableSteps).toEqual([
            {
                kind: 'variable',
                body: {
                    categoryId: 2,
                    name: 'Platform',
                    role: 'subcategory',
                    values: [['PC'], ['Switch']],
                    defaultValueIndex: 0,
                    sortOrder: 0,
                },
            },
        ]);
    });

    it('adds a combinations step and flags an overwrite when the target already has category variables', () => {
        const source = mkCat({ id: 1 });
        const target = mkCat({ id: 2 });
        const variables: VariableRow[] = [
            mkVar({ id: 100, categoryId: 1, name: 'Platform' }),
            mkVar({ id: 101, categoryId: 2, name: 'Region' }),
            mkVar({ id: 102, categoryId: 2, name: 'Version' }),
        ];

        const plan = planCategoryCopy({
            source,
            target,
            choices: { ...NO_CHOICES, variables: true },
            variables,
            policies: [],
        });

        expect(plan.steps).toContainEqual({
            kind: 'combinations',
            sourceCategoryId: 1,
        });
        expect(plan.overwrites).toContain('Variables (2)');
    });

    it('emits no variable or combinations steps when the source has no category-scoped variables', () => {
        const source = mkCat({ id: 1 });
        const target = mkCat({ id: 2 });
        const variables: VariableRow[] = [mkVar({ id: 200, categoryId: null })];

        const plan = planCategoryCopy({
            source,
            target,
            choices: { ...NO_CHOICES, variables: true },
            variables,
            policies: [],
        });

        expect(plan.steps).toEqual([]);
        expect(plan.overwrites).toEqual([]);
    });

    it('respects choices — unselected steps never appear even when the source has content', () => {
        const source = mkCat({
            id: 1,
            rules: 'Rules here',
            requireVideo: true,
        });
        const target = mkCat({ id: 2 });

        const plan = planCategoryCopy({
            source,
            target,
            choices: NO_CHOICES,
            variables: [],
            policies: [],
        });

        expect(plan.steps).toEqual([]);
        expect(plan.overwrites).toEqual([]);
    });
});

describe('eligibleCopySources', () => {
    it('includes featured, non-archived categories other than the target', () => {
        const target = mkCat({ id: 1, isMain: true, archived: false });
        const categories: ResolvedCategory[] = [
            target,
            mkCat({ id: 2, isMain: true, archived: false }),
        ];

        expect(eligibleCopySources(categories, target)).toEqual([
            categories[1],
        ]);
    });

    it('excludes an archived category even when it still carries isMain: true', () => {
        const target = mkCat({ id: 1, isMain: true, archived: false });
        const categories: ResolvedCategory[] = [
            target,
            mkCat({ id: 2, isMain: true, archived: true }),
        ];

        expect(eligibleCopySources(categories, target)).toEqual([]);
    });

    it('excludes non-featured (isMain: false) categories', () => {
        const target = mkCat({ id: 1, isMain: true, archived: false });
        const categories: ResolvedCategory[] = [
            target,
            mkCat({ id: 2, isMain: false, archived: false }),
        ];

        expect(eligibleCopySources(categories, target)).toEqual([]);
    });
});
