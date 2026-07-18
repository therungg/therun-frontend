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

    it('flags no-main as a blocker on categories, todo on category-config', () => {
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

        const config = c.steps.find((s) => s.step === 'category-config');
        expect(config?.status).toBe('todo');
        expect(config?.summary).toBe(
            'Configure categories after choosing featured categories',
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
        expect(c.steps.find((s) => s.step === 'category-config')?.status).toBe(
            'todo',
        );
    });

    it('treats an ingestion-empty board as completable (categories and category-config not blocking)', () => {
        const c = computeCompleteness(input({ categories: [] }));
        const cats = c.steps.find((s) => s.step === 'categories');
        expect(cats?.status).toBe('done');
        expect(cats?.summary).toBe(
            'No ingested categories yet — they appear as runs arrive',
        );

        const config = c.steps.find((s) => s.step === 'category-config');
        expect(config?.status).toBe('todo');
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

    it('warns on category-config counting only mains without rules (a hidden category without rules is ignored)', () => {
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
        const config = c.steps.find((s) => s.step === 'category-config');
        expect(config?.status).toBe('warning');
        expect(config?.summary).toBe(
            '1 of 2 featured categories not configured',
        );
        expect(c.warnings).toContain(
            '1 of 2 featured categories not configured',
        );
    });

    it('marks category-config done when all mains have rules', () => {
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
        const config = c.steps.find((s) => s.step === 'category-config');
        expect(config?.status).toBe('done');
        expect(config?.summary).toBe('All 2 featured categories configured');
    });

    it('always marks defaults done, with a summary reflecting bulk settings state', () => {
        const optional = computeCompleteness(
            input({
                variableCount: 0,
                policyCount: 0,
                requireVideoAnywhere: false,
            }),
        );
        const defaultsOptional = optional.steps.find(
            (s) => s.step === 'defaults',
        );
        expect(defaultsOptional?.status).toBe('done');
        expect(defaultsOptional?.summary).toBe('Optional bulk settings');

        const configured = computeCompleteness(
            input({
                variableCount: 3,
                policyCount: 0,
                requireVideoAnywhere: false,
            }),
        );
        const defaultsConfigured = configured.steps.find(
            (s) => s.step === 'defaults',
        );
        expect(defaultsConfigured?.status).toBe('done');
        expect(defaultsConfigured?.summary).toContain('standards set');

        const viaPolicy = computeCompleteness(
            input({ variableCount: 0, policyCount: 2 }),
        );
        expect(viaPolicy.steps.find((s) => s.step === 'defaults')?.status).toBe(
            'done',
        );

        const viaVideo = computeCompleteness(
            input({
                variableCount: 0,
                policyCount: 0,
                requireVideoAnywhere: true,
            }),
        );
        expect(viaVideo.steps.find((s) => s.step === 'defaults')?.status).toBe(
            'done',
        );
    });

    it('marks details todo when slug missing, and finish todo when unconfigured', () => {
        const c = computeCompleteness(input({ slug: null, configured: false }));
        expect(c.steps.find((s) => s.step === 'details')?.status).toBe('todo');
        expect(c.steps.find((s) => s.step === 'finish')?.status).toBe('todo');
        expect(c.firstIncomplete).toBe('details');
    });

    it('always marks welcome done', () => {
        const c = computeCompleteness(input({ configured: false }));
        expect(c.steps.find((s) => s.step === 'welcome')?.status).toBe('done');
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
