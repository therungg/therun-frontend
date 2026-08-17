import { describe, expect, it } from 'vitest';
import type { LiveRun } from '~app/(new-layout)/live/live.types';
import type {
    RecentPb,
    ResolvedCategory,
} from '../../../../../types/leaderboards.types';
import {
    isBetweenRuns,
    matchLiveCategory,
    scopeLiveRuns,
    scopePbs,
    sortLiveRuns,
} from './rail-scope';

function cat(id: number, name: string, display = name): ResolvedCategory {
    return {
        id,
        name,
        display,
        primaryTiming: 'rt',
        archived: false,
        isMain: true,
        sortOrder: 0,
    };
}

function live(over: Partial<LiveRun>): LiveRun {
    return {
        user: 'r',
        login: 'r',
        currentSplitIndex: 2,
        currentSplitName: 'BitDW',
        currentTime: 1000,
        game: 'Super Mario 64',
        category: '120 Star',
        insertedAt: 0,
        emulator: false,
        gameTime: false,
        hasReset: false,
        region: '',
        platform: '',
        variables: {},
        splits: [],
        importance: 0,
        pb: 0,
        bestPossible: 0,
        sob: 0,
        delta: 0,
        url: '',
        events: [],
        ...over,
    } as LiveRun;
}

function pb(over: Partial<RecentPb>): RecentPb {
    return {
        id: 1,
        username: 'runner',
        game: 'Super Mario 64',
        category: '120 Star',
        time: 1000,
        endedAt: '2026-07-01T00:00:00Z',
        isPb: true,
        ...over,
    };
}

const CATS = [cat(1, '120-star', '120 Star'), cat(2, '70-star', '70 Star')];

describe('matchLiveCategory', () => {
    it('matches runner-typed casing and spacing against display or name', () => {
        expect(matchLiveCategory('70 star', CATS)?.id).toBe(2);
        expect(matchLiveCategory('120Star', CATS)?.id).toBe(1);
        expect(matchLiveCategory(' 120-star ', CATS)?.id).toBe(1);
    });

    it('returns undefined for unknown, empty and null categories', () => {
        expect(matchLiveCategory('16 Star', CATS)).toBeUndefined();
        expect(matchLiveCategory('', CATS)).toBeUndefined();
        expect(matchLiveCategory(null, CATS)).toBeUndefined();
    });
});

describe('sortLiveRuns', () => {
    it('orders by importance, highest first, without mutating input', () => {
        const input = [
            live({ user: 'a', importance: 1 }),
            live({ user: 'b', importance: 5 }),
        ];
        expect(sortLiveRuns(input).map((r) => r.user)).toEqual(['b', 'a']);
        expect(input[0].user).toBe('a');
    });
});

describe('scopeLiveRuns', () => {
    const runs = [
        live({ user: 'a', category: '70 star' }),
        live({ user: 'b', category: '120 Star' }),
        live({ user: 'c', category: '16 Star' }),
    ];

    it('keeps only the rows on the board in board scope', () => {
        expect(
            scopeLiveRuns(runs, 'board', CATS[0], CATS).map((r) => r.user),
        ).toEqual(['b']);
    });

    it('is a no-op in game scope or with no board', () => {
        expect(scopeLiveRuns(runs, 'game', CATS[0], CATS)).toBe(runs);
        expect(scopeLiveRuns(runs, 'board', null, CATS)).toBe(runs);
    });
});

describe('scopePbs', () => {
    const pbs = [pb({ id: 1, categoryId: 1 }), pb({ id: 2, categoryId: 2 })];

    it('filters by resolved category id in board scope', () => {
        expect(scopePbs(pbs, 'board', CATS[1]).map((p) => p.id)).toEqual([2]);
    });

    it('drops rows without a categoryId in board scope', () => {
        expect(scopePbs([pb({ id: 3 })], 'board', CATS[0])).toEqual([]);
    });

    it('is a no-op in game scope', () => {
        expect(scopePbs(pbs, 'game', CATS[0])).toBe(pbs);
    });
});

describe('isBetweenRuns', () => {
    it('is true after a reset or before the timer starts', () => {
        expect(isBetweenRuns(live({ hasReset: true }))).toBe(true);
        expect(isBetweenRuns(live({ currentSplitIndex: -1 }))).toBe(true);
        expect(isBetweenRuns(live({ currentSplitName: '' }))).toBe(true);
    });

    it('is false mid-attempt', () => {
        expect(isBetweenRuns(live({}))).toBe(false);
    });
});
