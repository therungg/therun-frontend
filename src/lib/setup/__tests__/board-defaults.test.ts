import { describe, expect, it } from 'vitest';
import type { ResolvedCategory } from '../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../types/moderation.types';
import type { GameMetadata } from '../../game-mgmt';
import {
    boardDefaults,
    categoriesNotOn,
    deviates,
    deviatingColumns,
    hasDefault,
    otherTimeField,
    otherTiming,
    rulesState,
    showsOtherTime,
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
        seriesGames: [],
        genres: [],
        igdbPlatforms: [],
        companies: [],
        links: [],
        rulesTemplate: TEMPLATE,
        gameRules: null,
        emulatorPolicy: null,
        primaryTiming: 'rt',
        gameTimeLabel: null,
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
    it('is none for empty rules', () => {
        expect(rulesState(makeCategory({ rules: '   ' }))).toBe('none');
    });

    it('is custom for a category with its own rules', () => {
        expect(rulesState(makeCategory({ rules: 'Anything goes.' }))).toBe(
            'custom',
        );
    });
});

describe('categoriesNotOn', () => {
    const cats = [
        { id: 1, primaryTiming: 'rt' } as ResolvedCategory,
        { id: 2, primaryTiming: 'rt' } as ResolvedCategory,
        { id: 3, primaryTiming: 'gt' } as ResolvedCategory,
    ];
    const read = (c: ResolvedCategory) => c.primaryTiming;

    it('returns the categories a new board default has not reached', () => {
        expect(categoriesNotOn(cats, 'gt', read).map((c) => c.id)).toEqual([
            1, 2,
        ]);
    });

    it('is empty when every category already matches, so nothing is asked', () => {
        expect(categoriesNotOn(cats, 'rt', read).map((c) => c.id)).toEqual([3]);
        expect(categoriesNotOn([cats[2]], 'gt', read)).toEqual([]);
    });
});

describe('otherTime', () => {
    const rtaCategory = {
        id: 1,
        primaryTiming: 'rt',
        hideGameTime: true,
    } as ResolvedCategory;

    it('is the clock the board does not rank by', () => {
        expect(otherTiming('rt')).toBe('gt');
        expect(otherTiming('gt')).toBe('rt');
    });

    it('reads a category own clock to decide which flag matters', () => {
        // An RTA category hiding game time is hiding its other clock; the same
        // flag on an IGT category would be hiding the ranking one, which is
        // not a state this column can produce.
        expect(showsOtherTime(rtaCategory)).toBe(false);
        expect(
            showsOtherTime({
                ...rtaCategory,
                primaryTiming: 'gt',
            } as ResolvedCategory),
        ).toBe(true);
    });

    it('writes the flag belonging to that category clock', () => {
        expect(otherTimeField('rt', false)).toEqual({ hideGameTime: true });
        expect(otherTimeField('gt', false)).toEqual({ hideRealTime: true });
    });
});
