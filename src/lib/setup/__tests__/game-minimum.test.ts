import { describe, expect, it } from 'vitest';
import type { BoardPolicyRow } from '../../../../types/moderation.types';
import {
    findCategoryMinPolicy,
    findGameMinPolicy,
    minMsFromPolicy,
    minValueForTiming,
} from '../game-minimum';

describe('game-minimum', () => {
    describe('minValueForTiming', () => {
        it('returns { minTimeMs } for realtime timing', () => {
            const result = minValueForTiming('rt', 600000);
            expect(result).toEqual({ minTimeMs: 600000 });
            expect(result).not.toHaveProperty('minGameTimeMs');
        });

        it('returns { minGameTimeMs } for gametime timing', () => {
            const result = minValueForTiming('gt', 300000);
            expect(result).toEqual({ minGameTimeMs: 300000 });
            expect(result).not.toHaveProperty('minTimeMs');
        });
    });

    describe('findGameMinPolicy', () => {
        it('finds the game-level min_time policy', () => {
            const policies: BoardPolicyRow[] = [
                {
                    id: 1,
                    gameId: 100,
                    categoryId: null,
                    subcategoryKey: null,
                    policyType: 'min_time',
                    value: { minTimeMs: 600000 },
                    createdBy: 1,
                    reason: 'Game minimum',
                    createdAt: '2026-07-30',
                },
                {
                    id: 2,
                    gameId: 100,
                    categoryId: 5,
                    subcategoryKey: null,
                    policyType: 'min_time',
                    value: { minTimeMs: 300000 },
                    createdBy: 1,
                    reason: 'Category minimum',
                    createdAt: '2026-07-30',
                },
            ];

            const result = findGameMinPolicy(policies);
            expect(result?.id).toBe(1);
        });

        it('returns undefined if no game-level min_time policy', () => {
            const policies: BoardPolicyRow[] = [
                {
                    id: 1,
                    gameId: 100,
                    categoryId: 5,
                    subcategoryKey: null,
                    policyType: 'min_time',
                    value: { minTimeMs: 300000 },
                    createdBy: 1,
                    reason: 'Category minimum',
                    createdAt: '2026-07-30',
                },
            ];

            const result = findGameMinPolicy(policies);
            expect(result).toBeUndefined();
        });
    });

    describe('findCategoryMinPolicy', () => {
        it('finds category-scoped min_time policy', () => {
            const policies: BoardPolicyRow[] = [
                {
                    id: 1,
                    gameId: 100,
                    categoryId: null,
                    subcategoryKey: null,
                    policyType: 'min_time',
                    value: { minTimeMs: 600000 },
                    createdBy: 1,
                    reason: 'Game minimum',
                    createdAt: '2026-07-30',
                },
                {
                    id: 2,
                    gameId: 100,
                    categoryId: 5,
                    subcategoryKey: null,
                    policyType: 'min_time',
                    value: { minGameTimeMs: 300000 },
                    createdBy: 1,
                    reason: 'Category 5 minimum',
                    createdAt: '2026-07-30',
                },
                {
                    id: 3,
                    gameId: 100,
                    categoryId: 6,
                    subcategoryKey: null,
                    policyType: 'min_time',
                    value: { minGameTimeMs: 400000 },
                    createdBy: 1,
                    reason: 'Category 6 minimum',
                    createdAt: '2026-07-30',
                },
            ];

            const result = findCategoryMinPolicy(policies, 5);
            expect(result?.id).toBe(2);
        });

        it('returns undefined for category with no min_time policy', () => {
            const policies: BoardPolicyRow[] = [
                {
                    id: 1,
                    gameId: 100,
                    categoryId: 5,
                    subcategoryKey: null,
                    policyType: 'min_time',
                    value: { minGameTimeMs: 300000 },
                    createdBy: 1,
                    reason: 'Category 5 minimum',
                    createdAt: '2026-07-30',
                },
            ];

            const result = findCategoryMinPolicy(policies, 10);
            expect(result).toBeUndefined();
        });
    });

    describe('minMsFromPolicy', () => {
        it('extracts minTimeMs for realtime timing', () => {
            const policy: BoardPolicyRow = {
                id: 1,
                gameId: 100,
                categoryId: null,
                subcategoryKey: null,
                policyType: 'min_time',
                value: { minTimeMs: 600000 },
                createdBy: 1,
                reason: 'Game minimum',
                createdAt: '2026-07-30',
            };

            const result = minMsFromPolicy(policy, 'rt');
            expect(result).toBe(600000);
        });

        it('extracts minGameTimeMs for gametime timing', () => {
            const policy: BoardPolicyRow = {
                id: 1,
                gameId: 100,
                categoryId: 5,
                subcategoryKey: null,
                policyType: 'min_time',
                value: { minGameTimeMs: 300000 },
                createdBy: 1,
                reason: 'Category minimum',
                createdAt: '2026-07-30',
            };

            const result = minMsFromPolicy(policy, 'gt');
            expect(result).toBe(300000);
        });

        it('ignores the wrong timing key', () => {
            const policy: BoardPolicyRow = {
                id: 1,
                gameId: 100,
                categoryId: null,
                subcategoryKey: null,
                policyType: 'min_time',
                value: { minTimeMs: 600000, minGameTimeMs: 300000 },
                createdBy: 1,
                reason: 'Game minimum',
                createdAt: '2026-07-30',
            };

            // Should only look at minTimeMs for 'rt'
            expect(minMsFromPolicy(policy, 'rt')).toBe(600000);
            // Should only look at minGameTimeMs for 'gt'
            expect(minMsFromPolicy(policy, 'gt')).toBe(300000);
        });

        it('returns null for undefined policy', () => {
            const result = minMsFromPolicy(undefined, 'rt');
            expect(result).toBeNull();
        });

        it('returns null when policy value lacks the timing key', () => {
            const policy: BoardPolicyRow = {
                id: 1,
                gameId: 100,
                categoryId: null,
                subcategoryKey: null,
                policyType: 'min_time',
                value: { minGameTimeMs: 300000 },
                createdBy: 1,
                reason: 'Game minimum',
                createdAt: '2026-07-30',
            };

            const result = minMsFromPolicy(policy, 'rt');
            expect(result).toBeNull();
        });
    });
});
