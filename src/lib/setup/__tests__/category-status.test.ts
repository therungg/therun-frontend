import { describe, expect, it } from 'vitest';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../types/moderation.types';
import { categorySetupStatus } from '../category-status';

function makeCategory(
    overrides: Partial<ResolvedCategory> = {},
): ResolvedCategory {
    return {
        id: 1,
        name: 'any%',
        display: 'Any%',
        primaryTiming: 'rt',
        archived: false,
        rules: 'No major skips.',
        sortOrder: 0,
        ...overrides,
    };
}

function makePolicy(overrides: Partial<BoardPolicyRow> = {}): BoardPolicyRow {
    return {
        id: 1,
        gameId: 100,
        categoryId: null,
        subcategoryKey: null,
        policyType: 'min_time',
        value: { minTimeMs: 600000 },
        createdBy: 1,
        reason: 'Minimum',
        createdAt: '2026-07-30',
        ...overrides,
    };
}

function makeVariable(overrides: Partial<VariableRow> = {}): VariableRow {
    return {
        id: 1,
        gameId: 100,
        categoryId: 1,
        name: 'Version',
        nameNormalized: 'version',
        role: 'subcategory',
        values: [['NTSC'], ['PAL']],
        defaultValueIndex: null,
        sortOrder: 0,
        description: null,
        version: 1,
        published: true,
        ...overrides,
    };
}

describe('categorySetupStatus', () => {
    it('is ok with rules, rt timing, a category min policy, and 2 category variables', () => {
        const cat = makeCategory({ id: 1, primaryTiming: 'rt' });
        const variables: VariableRow[] = [
            makeVariable({ id: 1, categoryId: 1 }),
            makeVariable({ id: 2, categoryId: 1 }),
        ];
        const policies: BoardPolicyRow[] = [
            makePolicy({ id: 1, categoryId: 1, value: { minTimeMs: 600000 } }),
        ];

        const result = categorySetupStatus(cat, variables, policies);

        expect(result.ok).toBe(true);
        expect(result.parts).toEqual(['RTA', 'min 10:00', '2 variables']);
        expect(result.missing).toEqual([]);
    });

    it('flags missing rules', () => {
        const cat = makeCategory({ id: 1, rules: '' });

        const result = categorySetupStatus(cat, [], []);

        expect(result.missing).toEqual(['rules']);
        expect(result.ok).toBe(false);
    });

    it('counts a game-wide min policy as covered', () => {
        const cat = makeCategory({ id: 1, primaryTiming: 'rt' });
        const policies: BoardPolicyRow[] = [
            makePolicy({
                id: 1,
                categoryId: null,
                value: { minTimeMs: 600000 },
            }),
        ];

        const result = categorySetupStatus(cat, [], policies);

        expect(result.parts).toContain('min 10:00 (game-wide)');
        expect(result.ok).toBe(true);
    });

    it('omits the variables part when there are none, and is still ok', () => {
        const cat = makeCategory({ id: 1 });

        const result = categorySetupStatus(cat, [], []);

        expect(result.parts.some((p) => p.includes('variable'))).toBe(false);
        expect(result.ok).toBe(true);
    });

    it('counts a game-wide variable and a differently-named category variable as 2', () => {
        const cat = makeCategory({ id: 1 });
        const variables: VariableRow[] = [
            makeVariable({
                id: 1,
                categoryId: null,
                name: 'Console',
                nameNormalized: 'console',
            }),
            makeVariable({
                id: 2,
                categoryId: 1,
                name: 'Version',
                nameNormalized: 'version',
            }),
        ];

        const result = categorySetupStatus(cat, variables, []);

        expect(result.parts).toContain('2 variables');
    });

    it('does not double-count a game-wide variable shadowed by a same-named category variable', () => {
        const cat = makeCategory({ id: 1 });
        const variables: VariableRow[] = [
            makeVariable({
                id: 1,
                categoryId: null,
                name: 'Version',
                nameNormalized: 'version',
            }),
            makeVariable({
                id: 2,
                categoryId: 1,
                name: 'Version',
                nameNormalized: 'version',
            }),
        ];

        const result = categorySetupStatus(cat, variables, []);

        expect(result.parts).toContain('1 variable');
    });
});
