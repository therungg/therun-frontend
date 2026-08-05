import { describe, expect, it } from 'vitest';
import {
    type CompletenessInput,
    computeCompleteness,
    SETUP_STEP_ORDER,
} from '../completeness';

function input(over: Partial<CompletenessInput>): CompletenessInput {
    return {
        categories: [
            {
                id: 1,
                display: 'Any%',
                active: true,
                isMain: true,
                hasRules: true,
                groupId: null,
            },
            {
                id: 2,
                display: '100%',
                active: false,
                isMain: false,
                hasRules: true,
                groupId: null,
            },
        ],
        policyCount: 1,
        requireVideoAnywhere: false,
        slug: 'mygame',
        moderatorCount: 1,
        configured: true,
        groupCount: 0,
        ungroupedMainCount: 0,
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

    it('emits every step in wizard order', () => {
        const c = computeCompleteness(input({}));
        expect(c.steps.map((s) => s.step)).toEqual(SETUP_STEP_ORDER);
    });

    it('warns on category setup when featured categories lack rules', () => {
        const c = computeCompleteness(
            input({
                categories: [
                    {
                        id: 1,
                        display: 'Any%',
                        active: true,
                        isMain: true,
                        hasRules: false,
                        groupId: null,
                    },
                ],
            }),
        );
        const categorySetup = c.steps.find((s) => s.step === 'category-setup');
        expect(categorySetup?.status).toBe('warning');
    });

    it('flags no-main as a blocker on categories, todo on category setup', () => {
        const c = computeCompleteness(
            input({
                categories: [
                    {
                        id: 1,
                        display: 'Any%',
                        active: true,
                        isMain: false,
                        hasRules: true,
                        groupId: null,
                    },
                    {
                        id: 2,
                        display: '100%',
                        active: false,
                        isMain: false,
                        hasRules: false,
                        groupId: null,
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

        const categorySetup = c.steps.find((s) => s.step === 'category-setup');
        expect(categorySetup?.status).toBe('todo');
        expect(categorySetup?.summary).toBe(
            'Set up each category after choosing featured ones',
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
                        groupId: null,
                    },
                ],
            }),
        );
        expect(c.steps.find((s) => s.step === 'categories')?.status).toBe(
            'blocker',
        );
        expect(c.steps.find((s) => s.step === 'category-setup')?.status).toBe(
            'todo',
        );
    });

    it('treats an ingestion-empty board as completable (categories and category setup not blocking)', () => {
        const c = computeCompleteness(input({ categories: [] }));
        const cats = c.steps.find((s) => s.step === 'categories');
        expect(cats?.status).toBe('done');
        expect(cats?.summary).toBe(
            'No ingested categories yet — they appear as runs arrive',
        );

        const categorySetup = c.steps.find((s) => s.step === 'category-setup');
        expect(categorySetup?.status).toBe('todo');
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
                        groupId: null,
                    },
                    {
                        id: 2,
                        display: '100%',
                        active: false,
                        isMain: false,
                        hasRules: true,
                        groupId: null,
                    },
                    {
                        id: 3,
                        display: 'Low%',
                        active: true,
                        isMain: false,
                        hasRules: true,
                        groupId: null,
                    },
                ],
            }),
        );
        expect(c.steps.find((s) => s.step === 'categories')?.summary).toBe(
            '1 shown / 2 hidden',
        );
    });

    it('warns on category setup counting only mains without rules (a hidden category without rules is ignored)', () => {
        const c = computeCompleteness(
            input({
                categories: [
                    {
                        id: 1,
                        display: 'Any%',
                        active: true,
                        isMain: true,
                        hasRules: true,
                        groupId: null,
                    },
                    {
                        id: 2,
                        display: '100%',
                        active: true,
                        isMain: true,
                        hasRules: false,
                        groupId: null,
                    },
                    {
                        id: 3,
                        display: 'Low%',
                        active: false,
                        isMain: false,
                        hasRules: false,
                        groupId: null,
                    },
                ],
            }),
        );
        const categorySetup = c.steps.find((s) => s.step === 'category-setup');
        expect(categorySetup?.status).toBe('warning');
        expect(categorySetup?.summary).toBe(
            '1 of 2 featured categories missing rules',
        );
        expect(c.warnings).toContain(
            '1 of 2 featured categories missing rules',
        );
    });

    it('marks category setup done when all mains have rules', () => {
        const c = computeCompleteness(
            input({
                categories: [
                    {
                        id: 1,
                        display: 'Any%',
                        active: true,
                        isMain: true,
                        hasRules: true,
                        groupId: null,
                    },
                    {
                        id: 2,
                        display: '100%',
                        active: true,
                        isMain: true,
                        hasRules: true,
                        groupId: null,
                    },
                ],
            }),
        );
        const categorySetup = c.steps.find((s) => s.step === 'category-setup');
        expect(categorySetup?.status).toBe('done');
        expect(categorySetup?.summary).toBe(
            'All 2 featured categories have rules',
        );
    });

    // The board-wide defaults that used to be their own step (timing, proof,
    // minimum time, rules template) now live on step 1, so their state is
    // reported in the details summary rather than as a step of its own.
    it('reports board-wide standards in the details summary', () => {
        const details = (c: ReturnType<typeof computeCompleteness>) =>
            c.steps.find((s) => s.step === 'details');

        const optional = computeCompleteness(
            input({ policyCount: 0, requireVideoAnywhere: false }),
        );
        expect(details(optional)?.status).toBe('done');
        expect(details(optional)?.summary).toBe('Slug mygame');

        const viaPolicy = computeCompleteness(input({ policyCount: 2 }));
        expect(details(viaPolicy)?.summary).toBe('Slug mygame · standards set');

        const viaVideo = computeCompleteness(
            input({ policyCount: 0, requireVideoAnywhere: true }),
        );
        expect(details(viaVideo)?.summary).toBe('Slug mygame · standards set');
    });

    it('marks details todo when slug missing, and boards todo when unconfigured', () => {
        const c = computeCompleteness(input({ slug: null, configured: false }));
        const details = c.steps.find((s) => s.step === 'details');
        expect(details?.status).toBe('todo');
        // A missing slug is the whole story — standards state doesn't dilute it.
        expect(details?.summary).toBe('Slug missing');
        expect(c.steps.find((s) => s.step === 'boards')?.status).toBe('todo');
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
                        groupId: null,
                    },
                ],
                configured: false,
            }),
        );
        // details, categories, and finish are all incomplete; details comes first.
        expect(c.firstIncomplete).toBe('details');
    });

    describe('groups step', () => {
        const step = (c: ReturnType<typeof computeCompleteness>) =>
            c.steps.find((s) => s.step === 'groups');

        it('is done, not todo, when the board uses no groups at all', () => {
            const c = computeCompleteness(input({ groupCount: 0 }));
            expect(step(c)).toMatchObject({
                status: 'done',
                summary: 'One flat list',
            });
        });

        it('is done with one group holding everything', () => {
            const c = computeCompleteness(
                input({ groupCount: 1, ungroupedMainCount: 0 }),
            );
            expect(step(c)).toMatchObject({
                status: 'done',
                summary: '1 group',
            });
        });

        it('tolerates loose categories while only one group exists', () => {
            const c = computeCompleteness(
                input({ groupCount: 1, ungroupedMainCount: 3 }),
            );
            expect(step(c)?.status).toBe('done');
        });

        it('blocks on loose categories once a second group exists', () => {
            const c = computeCompleteness(
                input({ groupCount: 2, ungroupedMainCount: 3 }),
            );
            expect(step(c)).toMatchObject({
                status: 'blocker',
                summary: '3 featured categories are not in a group',
            });
            expect(c.blockers).toContain(
                '3 featured categories are not in a group',
            );
        });

        it('singularizes the blocker for one loose category', () => {
            const c = computeCompleteness(
                input({ groupCount: 2, ungroupedMainCount: 1 }),
            );
            expect(step(c)?.summary).toBe(
                '1 featured category is not in a group',
            );
        });

        it('has nothing to say on a board with no featured categories', () => {
            const c = computeCompleteness(
                input({
                    categories: [],
                    groupCount: 2,
                    ungroupedMainCount: 0,
                }),
            );
            expect(step(c)).toMatchObject({
                status: 'done',
                summary: 'Optional — nothing to group yet',
            });
        });
    });

    // Variables (now the per-category splits/filters) are one section of the
    // editor, not something users know by that name — the category-setup
    // summary is driven by rules only and never mentions them.
    describe('category-setup summary', () => {
        const step = (c: ReturnType<typeof computeCompleteness>) =>
            c.steps.find((s) => s.step === 'category-setup');

        it('reports rules coverage, with no variable mention', () => {
            expect(step(computeCompleteness(input({})))).toMatchObject({
                status: 'done',
                summary: 'All 1 featured categories have rules',
            });
        });

        it('warns on missing rules, with no variable mention', () => {
            const c = computeCompleteness(
                input({
                    categories: [
                        {
                            id: 1,
                            display: 'Any%',
                            active: true,
                            isMain: true,
                            hasRules: false,
                            groupId: null,
                        },
                    ],
                }),
            );
            expect(step(c)?.summary).toBe(
                '1 of 1 featured categories missing rules',
            );
        });

        it('prompts to set up categories before there are any', () => {
            const c = computeCompleteness(input({ categories: [] }));
            expect(step(c)?.summary).toBe(
                'Set up each category after choosing featured ones',
            );
        });
    });
});
