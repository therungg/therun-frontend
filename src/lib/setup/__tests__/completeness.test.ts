import { describe, expect, it } from 'vitest';
import { type CompletenessInput, computeCompleteness } from '../completeness';

function input(over: Partial<CompletenessInput>): CompletenessInput {
    return {
        categories: [
            {
                id: 1,
                display: 'Any%',
                active: true,
                isMain: true,
                hasRules: true,
            },
            {
                id: 2,
                display: '100%',
                active: true,
                isMain: false,
                hasRules: true,
            },
        ],
        variableCount: 0,
        policyCount: 1,
        requireVideoAnywhere: false,
        slug: 'mygame',
        abbreviation: 'mg',
        moderatorCount: 1,
        configured: true,
        ...over,
    };
}

describe('computeCompleteness', () => {
    it('reports a fully set-up board as all done', () => {
        const c = computeCompleteness(input({}));
        expect(c.firstIncomplete).toBeNull();
        expect(c.blockers).toEqual([]);
        expect(c.doneCount).toBe(c.totalCount);
    });

    it('flags no-active-categories as a blocker', () => {
        const c = computeCompleteness(
            input({
                categories: [
                    {
                        id: 1,
                        display: 'Any%',
                        active: false,
                        isMain: false,
                        hasRules: false,
                    },
                ],
            }),
        );
        const cats = c.steps.find((s) => s.step === 'categories');
        expect(cats?.status).toBe('blocker');
        expect(c.blockers.length).toBeGreaterThan(0);
        expect(c.firstIncomplete).toBe('categories');
    });

    it('flags active-but-no-main as a blocker', () => {
        const c = computeCompleteness(
            input({
                categories: [
                    {
                        id: 1,
                        display: 'Any%',
                        active: true,
                        isMain: false,
                        hasRules: true,
                    },
                ],
            }),
        );
        expect(c.steps.find((s) => s.step === 'categories')?.status).toBe(
            'blocker',
        );
    });

    it('treats an ingestion-empty board as completable (no category blocker)', () => {
        const c = computeCompleteness(input({ categories: [] }));
        expect(c.steps.find((s) => s.step === 'categories')?.status).toBe(
            'done',
        );
        expect(c.blockers).toEqual([]);
    });

    it('warns when active categories lack rules', () => {
        const c = computeCompleteness(
            input({
                categories: [
                    {
                        id: 1,
                        display: 'Any%',
                        active: true,
                        isMain: true,
                        hasRules: false,
                    },
                ],
            }),
        );
        const rules = c.steps.find((s) => s.step === 'rules');
        expect(rules?.status).toBe('warning');
        expect(rules?.summary).toContain('1');
    });

    it('warns when there are no standards at all', () => {
        const c = computeCompleteness(
            input({ policyCount: 0, requireVideoAnywhere: false }),
        );
        expect(c.steps.find((s) => s.step === 'standards')?.status).toBe(
            'warning',
        );
    });

    it('counts require-video as a standard', () => {
        const c = computeCompleteness(
            input({ policyCount: 0, requireVideoAnywhere: true }),
        );
        expect(c.steps.find((s) => s.step === 'standards')?.status).toBe(
            'done',
        );
    });

    it('marks details todo when slug missing, and finish todo when unconfigured', () => {
        const c = computeCompleteness(input({ slug: null, configured: false }));
        expect(c.steps.find((s) => s.step === 'details')?.status).toBe('todo');
        expect(c.steps.find((s) => s.step === 'finish')?.status).toBe('todo');
        expect(c.firstIncomplete).toBe('details');
    });

    it('always marks welcome, timing, and variables done', () => {
        const c = computeCompleteness(
            input({ variableCount: 0, configured: false }),
        );
        for (const id of ['welcome', 'timing', 'variables'] as const) {
            expect(c.steps.find((s) => s.step === id)?.status).toBe('done');
        }
    });
});
