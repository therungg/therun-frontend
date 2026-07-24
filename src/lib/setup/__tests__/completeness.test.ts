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
                active: false,
                isMain: false,
                hasRules: true,
            },
        ],
        variableCount: 0,
        policyCount: 1,
        requireVideoAnywhere: false,
        slug: 'mygame',
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

    it('emits the five steps in wizard order', () => {
        const c = computeCompleteness(input({}));
        expect(c.steps.map((s) => s.step)).toEqual([
            'details',
            'categories',
            'defaults',
            'exceptions',
            'finish',
        ]);
    });

    it('warns on exceptions when featured categories lack rules', () => {
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
        const exceptions = c.steps.find((s) => s.step === 'exceptions');
        expect(exceptions?.status).toBe('warning');
    });

    it('flags no-main as a blocker on categories, todo on exceptions', () => {
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
                    {
                        id: 2,
                        display: '100%',
                        active: false,
                        isMain: false,
                        hasRules: false,
                    },
                ],
            }),
        );
        const cats = c.steps.find((s) => s.step === 'categories');
        expect(cats?.status).toBe('blocker');
        expect(cats?.summary).toBe(
            'No categories are marked featured (shown on the board)',
        );
        expect(c.blockers).toContain(
            'No categories are marked featured (shown on the board)',
        );
        expect(c.firstIncomplete).toBe('categories');

        const exceptions = c.steps.find((s) => s.step === 'exceptions');
        expect(exceptions?.status).toBe('todo');
        expect(exceptions?.summary).toBe(
            'Review exceptions after choosing featured categories',
        );
    });

    it('does not count isMain:true but active:false as main', () => {
        const c = computeCompleteness(
            input({
                categories: [
                    {
                        id: 1,
                        display: 'Any%',
                        active: false,
                        isMain: true,
                        hasRules: true,
                    },
                ],
            }),
        );
        expect(c.steps.find((s) => s.step === 'categories')?.status).toBe(
            'blocker',
        );
        expect(c.steps.find((s) => s.step === 'exceptions')?.status).toBe(
            'todo',
        );
    });

    it('treats an ingestion-empty board as completable (categories and exceptions not blocking)', () => {
        const c = computeCompleteness(input({ categories: [] }));
        const cats = c.steps.find((s) => s.step === 'categories');
        expect(cats?.status).toBe('done');
        expect(cats?.summary).toBe(
            'No ingested categories yet — they appear as runs arrive',
        );

        const exceptions = c.steps.find((s) => s.step === 'exceptions');
        expect(exceptions?.status).toBe('todo');
        expect(c.blockers).toEqual([]);
    });

    it('reports "N shown / M hidden" using mains count, not active count', () => {
        const c = computeCompleteness(
            input({
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
                        active: false,
                        isMain: false,
                        hasRules: true,
                    },
                    {
                        id: 3,
                        display: 'Low%',
                        active: true,
                        isMain: false,
                        hasRules: true,
                    },
                ],
            }),
        );
        expect(c.steps.find((s) => s.step === 'categories')?.summary).toBe(
            '1 shown / 2 hidden',
        );
    });

    it('warns on exceptions counting only mains without rules (a hidden category without rules is ignored)', () => {
        const c = computeCompleteness(
            input({
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
                        isMain: true,
                        hasRules: false,
                    },
                    {
                        id: 3,
                        display: 'Low%',
                        active: false,
                        isMain: false,
                        hasRules: false,
                    },
                ],
            }),
        );
        const exceptions = c.steps.find((s) => s.step === 'exceptions');
        expect(exceptions?.status).toBe('warning');
        expect(exceptions?.summary).toBe(
            '1 of 2 featured categories missing rules',
        );
        expect(c.warnings).toContain(
            '1 of 2 featured categories missing rules',
        );
    });

    it('marks exceptions done when all mains have rules', () => {
        const c = computeCompleteness(
            input({
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
                        isMain: true,
                        hasRules: true,
                    },
                ],
            }),
        );
        const exceptions = c.steps.find((s) => s.step === 'exceptions');
        expect(exceptions?.status).toBe('done');
        expect(exceptions?.summary).toBe(
            'All 2 featured categories have rules',
        );
    });

    it('always marks defaults done, with a summary reflecting standards state', () => {
        const optional = computeCompleteness(
            input({
                policyCount: 0,
                requireVideoAnywhere: false,
            }),
        );
        const defaultsOptional = optional.steps.find(
            (s) => s.step === 'defaults',
        );
        expect(defaultsOptional?.status).toBe('done');
        expect(defaultsOptional?.summary).toBe('Optional — game-wide defaults');

        const viaPolicy = computeCompleteness(input({ policyCount: 2 }));
        const defaultsViaPolicy = viaPolicy.steps.find(
            (s) => s.step === 'defaults',
        );
        expect(defaultsViaPolicy?.status).toBe('done');
        expect(defaultsViaPolicy?.summary).toBe('Standards set');

        const viaVideo = computeCompleteness(
            input({
                policyCount: 0,
                requireVideoAnywhere: true,
            }),
        );
        const defaultsViaVideo = viaVideo.steps.find(
            (s) => s.step === 'defaults',
        );
        expect(defaultsViaVideo?.status).toBe('done');
        expect(defaultsViaVideo?.summary).toBe('Standards set');
    });

    it('marks details todo when slug missing, and finish todo when unconfigured', () => {
        const c = computeCompleteness(input({ slug: null, configured: false }));
        expect(c.steps.find((s) => s.step === 'details')?.status).toBe('todo');
        expect(c.steps.find((s) => s.step === 'finish')?.status).toBe('todo');
        expect(c.firstIncomplete).toBe('details');
    });

    it('orders firstIncomplete by SETUP_STEP_ORDER, not by step-array insertion', () => {
        const c = computeCompleteness(
            input({
                slug: null,
                categories: [
                    {
                        id: 1,
                        display: 'Any%',
                        active: false,
                        isMain: false,
                        hasRules: false,
                    },
                ],
                configured: false,
            }),
        );
        // details, categories, and finish are all incomplete; details comes first.
        expect(c.firstIncomplete).toBe('details');
    });
});
