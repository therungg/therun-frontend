import { describe, expect, it } from 'vitest';
import type { ResolvedCategory } from '../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../types/moderation.types';
import type { GameMetadata } from '../../game-mgmt';
import {
    boardDefaults,
    deviates,
    deviatingColumns,
    hasDefault,
    planBulkApply,
    planDefaultFollowUp,
    rulesState,
} from '../board-defaults';

const TEMPLATE = 'No major skips.';

function makeMetadata(overrides: Partial<GameMetadata> = {}): GameMetadata {
    return {
        coverUrl: null,
        platforms: [],
        releaseYear: null,
        discordUrl: null,
        configured: true,
        summary: null,
        summaryOverride: null,
        igdbUrl: null,
        firstReleaseDate: null,
        seriesDisplay: null,
        genres: [],
        igdbPlatforms: [],
        companies: [],
        links: [],
        rulesTemplate: TEMPLATE,
        gameRules: null,
        emulatorPolicy: null,
        primaryTiming: 'rt',
        hideRealTime: false,
        hideGameTime: false,
        sortAscending: true,
        showMilliseconds: true,
        ...overrides,
    };
}

function makeCategory(
    overrides: Partial<ResolvedCategory> = {},
): ResolvedCategory {
    return {
        id: 1,
        name: 'any%',
        display: 'Any%',
        primaryTiming: 'rt',
        archived: false,
        rules: TEMPLATE,
        sortOrder: 0,
        sortAscending: true,
        showMilliseconds: true,
        ...overrides,
    };
}

function makeGameMin(ms: number): BoardPolicyRow {
    return {
        id: 1,
        gameId: 100,
        categoryId: null,
        subcategoryKey: null,
        policyType: 'min_time',
        value: { minTimeMs: ms },
        createdBy: 1,
        reason: 'Minimum',
        createdAt: '2026-08-05',
    };
}

function makeCategoryMin(categoryId: number, ms: number): BoardPolicyRow {
    return { ...makeGameMin(ms), id: 2, categoryId };
}

describe('boardDefaults', () => {
    it('reads the board minimum against the board default clock', () => {
        const defaults = boardDefaults(makeMetadata(), [makeGameMin(600000)]);
        expect(defaults.minMs).toBe(600000);
    });

    it('reports no minimum when the game policy is bound to the other clock', () => {
        // A gametime board's min policy carries minGameTimeMs, so reading a
        // realtime key off it must come back null rather than silently 0.
        const defaults = boardDefaults(makeMetadata({ primaryTiming: 'gt' }), [
            makeGameMin(600000),
        ]);
        expect(defaults.minMs).toBeNull();
    });
});

describe('hasDefault', () => {
    it('is false for every column on a board that states nothing', () => {
        const defaults = boardDefaults(
            makeMetadata({
                primaryTiming: null,
                sortAscending: null,
                showMilliseconds: null,
                rulesTemplate: null,
            }),
            [],
        );
        expect(hasDefault(defaults, 'timing')).toBe(false);
        expect(hasDefault(defaults, 'ranking')).toBe(false);
        expect(hasDefault(defaults, 'milliseconds')).toBe(false);
        expect(hasDefault(defaults, 'rules')).toBe(false);
        expect(hasDefault(defaults, 'minimum')).toBe(false);
    });

    it('treats a whitespace-only template as no template', () => {
        const defaults = boardDefaults(
            makeMetadata({ rulesTemplate: '   \n ' }),
            [],
        );
        expect(hasDefault(defaults, 'rules')).toBe(false);
    });
});

describe('deviates', () => {
    const defaults = boardDefaults(makeMetadata(), [makeGameMin(600000)]);

    it('is false for a category matching the board on every column', () => {
        expect(deviatingColumns(makeCategory(), defaults, [])).toEqual([]);
    });

    it('flags a different clock', () => {
        const cat = makeCategory({ primaryTiming: 'gt' });
        expect(deviates(cat, 'timing', defaults, [])).toBe(true);
    });

    it('flags a different ranking direction', () => {
        const cat = makeCategory({ sortAscending: false });
        expect(deviates(cat, 'ranking', defaults, [])).toBe(true);
    });

    it('does not flag a column the board states no default for', () => {
        // Nothing to deviate from — highlighting every row here would be noise.
        const bare = boardDefaults(makeMetadata({ sortAscending: null }), [
            makeGameMin(600000),
        ]);
        const cat = makeCategory({ sortAscending: false });
        expect(deviates(cat, 'ranking', bare, [])).toBe(false);
    });

    it('does not flag a category that simply has no minimum of its own', () => {
        // The board minimum is what applies to it; that is not a deviation.
        expect(deviates(makeCategory(), 'minimum', defaults, [])).toBe(false);
    });

    it('flags a category whose own minimum differs from the board', () => {
        const policies = [makeGameMin(600000), makeCategoryMin(1, 720000)];
        expect(deviates(makeCategory(), 'minimum', defaults, policies)).toBe(
            true,
        );
    });

    it('does not flag a category minimum that equals the board minimum', () => {
        const policies = [makeGameMin(600000), makeCategoryMin(1, 600000)];
        expect(deviates(makeCategory(), 'minimum', defaults, policies)).toBe(
            false,
        );
    });
});

describe('rulesState', () => {
    const defaults = boardDefaults(makeMetadata(), []);

    it('is default when the text matches the template', () => {
        expect(rulesState(makeCategory(), defaults)).toBe('default');
    });

    it('ignores surrounding whitespace when comparing to the template', () => {
        const cat = makeCategory({ rules: `\n  ${TEMPLATE}  \n` });
        expect(rulesState(cat, defaults)).toBe('default');
    });

    it('is none for empty rules', () => {
        expect(rulesState(makeCategory({ rules: '   ' }), defaults)).toBe(
            'none',
        );
    });

    it('is custom for text that differs from the template', () => {
        const cat = makeCategory({ rules: 'Anything goes.' });
        expect(rulesState(cat, defaults)).toBe('custom');
    });

    it('is custom, not default, when the board has no template at all', () => {
        const bare = boardDefaults(makeMetadata({ rulesTemplate: null }), []);
        expect(rulesState(makeCategory(), bare)).toBe('custom');
    });
});

describe('planBulkApply', () => {
    const defaults = boardDefaults(makeMetadata(), []);
    const read = (c: ResolvedCategory) => c.primaryTiming;

    it('separates categories that change from those already correct', () => {
        const cats = [
            makeCategory({ id: 1, display: 'Any%', primaryTiming: 'rt' }),
            makeCategory({ id: 2, display: '100%', primaryTiming: 'gt' }),
        ];
        const plan = planBulkApply(cats, 'timing', 'gt', read, defaults, []);
        expect(plan.changing.map((c) => c.category.id)).toEqual([1]);
        expect(plan.unchanged.map((c) => c.id)).toEqual([2]);
    });

    it('reports which changing categories were deliberately deviating', () => {
        // 16 Star was hand-set to gametime; applying rt across a select-all
        // would silently undo that, so it has to surface in the preview.
        const cats = [
            makeCategory({ id: 1, display: 'Any%', primaryTiming: 'rt' }),
            makeCategory({ id: 2, display: '16 Star', primaryTiming: 'gt' }),
        ];
        const plan = planBulkApply(cats, 'timing', 'rt', read, defaults, []);
        expect(plan.changing.map((c) => c.category.id)).toEqual([2]);
        expect(plan.overwritingDeviations.map((c) => c.display)).toEqual([
            '16 Star',
        ]);
    });

    it('reports no overwrites when every changing category was on the default', () => {
        const cats = [makeCategory({ id: 1, primaryTiming: 'rt' })];
        const plan = planBulkApply(cats, 'timing', 'gt', read, defaults, []);
        expect(plan.changing).toHaveLength(1);
        expect(plan.overwritingDeviations).toEqual([]);
    });

    it('changes nothing when every category already holds the target', () => {
        const cats = [
            makeCategory({ id: 1, primaryTiming: 'gt' }),
            makeCategory({ id: 2, primaryTiming: 'gt' }),
        ];
        const plan = planBulkApply(cats, 'timing', 'gt', read, defaults, []);
        expect(plan.changing).toEqual([]);
        expect(plan.unchanged).toHaveLength(2);
    });
});

describe('planDefaultFollowUp', () => {
    const cats = [
        { id: 1, primaryTiming: 'rt' } as ResolvedCategory,
        { id: 2, primaryTiming: 'rt' } as ResolvedCategory,
        { id: 3, primaryTiming: 'gt' } as ResolvedCategory,
    ];
    const read = (c: ResolvedCategory) => c.primaryTiming;

    it('separates categories tracking the board from ones set by hand', () => {
        // Board was RTA and is now IGT. 1 and 2 were going along with it; 3
        // was already IGT... so it needs nothing.
        const plan = planDefaultFollowUp(cats, 'rt', 'gt', read);
        expect(plan.following.map((c) => c.id)).toEqual([1, 2]);
        expect(plan.handSet).toEqual([]);
    });

    it('counts a category that matched neither default as hand-set', () => {
        // Board was IGT, now RTA. 3 is still on IGT but was never following
        // the old default either way — it is on its own value.
        const plan = planDefaultFollowUp(
            [...cats, { id: 4, primaryTiming: 'gt' } as ResolvedCategory],
            null,
            'rt',
            read,
        );
        // With no previous default there is nothing to have been following.
        expect(plan.following).toEqual([]);
        expect(plan.handSet.map((c) => c.id)).toEqual([3, 4]);
    });

    it('leaves out categories already on the new value', () => {
        const plan = planDefaultFollowUp(cats, 'gt', 'rt', read);
        expect([...plan.following, ...plan.handSet].map((c) => c.id)).toEqual([
            3,
        ]);
    });
});
