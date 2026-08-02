import { describe, expect, it } from 'vitest';
import type { ResolvedCategory } from '../../../../../../../../types/leaderboards.types';
import type {
    GameExclusionRuleRow,
    ManualTimeRow,
    ModActionRow,
    UserEligibleRunRow,
} from '../../../../../../../../types/moderation.types';
import {
    buildBanState,
    buildCombos,
    buildSummary,
    filterRunnerActions,
    publicBoardHref,
    ruleForCombo,
} from './runner-model';

function cat(
    over: Partial<ResolvedCategory> & { id: number },
): ResolvedCategory {
    return {
        name: `cat-${over.id}`,
        display: `Category ${over.id}`,
        primaryTiming: 'rt',
        archived: false,
        sortOrder: 0,
        ...over,
    };
}

function run(
    over: Partial<UserEligibleRunRow> & { runId: number; categoryId: number },
): UserEligibleRunRow {
    return {
        categoryName: `Category ${over.categoryId}`,
        subcategoryKey: '',
        time: 1000,
        gameTime: null,
        primaryTiming: 'realtime',
        verificationStatus: 'verified',
        vodUrl: null,
        endedAt: '2026-01-01T00:00:00Z',
        isLeaderboardEntry: false,
        isLeaderboardEntryGt: false,
        rank: null,
        totalRunners: null,
        ...over,
    };
}

function manual(
    over: Partial<ManualTimeRow> & { id: number; categoryId: number },
): ManualTimeRow {
    return {
        userId: 7,
        guestName: null,
        runnerName: 'runner',
        subcategoryKey: '',
        timing: 'realtime',
        timeMs: 5000,
        evidenceUrl: null,
        verificationStatus: 'verified',
        source: 'mod',
        createdBy: 1,
        createdByName: 'mod',
        reason: 'because',
        createdAt: '2026-01-01T00:00:00Z',
        ...over,
    };
}

const CATS = [cat({ id: 1 }), cat({ id: 2, primaryTiming: 'gt' })];

describe('buildCombos', () => {
    it('groups runs per (category, subcategoryKey) and sorts best-first', () => {
        const combos = buildCombos(
            [
                run({ runId: 1, categoryId: 1, time: 3000 }),
                run({ runId: 2, categoryId: 1, time: 1000 }),
                run({ runId: 3, categoryId: 1, time: null }),
                run({
                    runId: 4,
                    categoryId: 1,
                    subcategoryKey: 'platform=pc',
                    time: 900,
                }),
            ],
            [],
            CATS,
        );
        expect(combos.map((c) => c.key)).toEqual(['1::', '1::platform=pc']);
        expect(combos[0].runs.map((r) => r.runId)).toEqual([2, 1, 3]);
    });

    it('orders combos by the category-band order, unknown categories last', () => {
        const combos = buildCombos(
            [
                run({ runId: 1, categoryId: 99, categoryName: 'Ghost' }),
                run({ runId: 2, categoryId: 2 }),
                run({ runId: 3, categoryId: 1 }),
            ],
            [],
            CATS,
        );
        expect(combos.map((c) => c.categoryId)).toEqual([1, 2, 99]);
        expect(combos[2].categoryDisplay).toBe('Ghost');
        expect(combos[2].categorySlug).toBeNull();
    });

    it('takes rank and best time from the board entry on the primary timing', () => {
        const combos = buildCombos(
            [
                run({
                    runId: 1,
                    categoryId: 2,
                    primaryTiming: 'gametime',
                    gameTime: 2000,
                    time: 100,
                    isLeaderboardEntryGt: true,
                    rank: 4,
                    totalRunners: 30,
                }),
                run({
                    runId: 2,
                    categoryId: 2,
                    primaryTiming: 'gametime',
                    gameTime: 1500,
                    time: 90,
                }),
            ],
            [],
            CATS,
        );
        // Runs sort best-first (1500 < 2000) but the board entry, not the
        // best run, carries the standing shown on the chip's rank.
        expect(combos[0].runs[0].runId).toBe(2);
        expect(combos[0].board?.runId).toBe(1);
        expect(combos[0].rank).toBe(4);
        expect(combos[0].bestTime).toBe(2000);
    });

    it('creates a combo from manual times alone', () => {
        const combos = buildCombos(
            [],
            [manual({ id: 10, categoryId: 1, timeMs: 4321 })],
            CATS,
        );
        expect(combos).toHaveLength(1);
        expect(combos[0].bestTime).toBe(4321);
        expect(combos[0].runs).toHaveLength(0);
    });

    it('ignores rejected manual times for the chip time', () => {
        const combos = buildCombos(
            [],
            [
                manual({
                    id: 10,
                    categoryId: 1,
                    timeMs: 1,
                    verificationStatus: 'rejected',
                }),
            ],
            CATS,
        );
        expect(combos[0].bestTime).toBeNull();
    });
});

describe('ban state', () => {
    const rules: GameExclusionRuleRow[] = [
        {
            ruleId: 1,
            type: 'user',
            targetId: 7,
            targetDisplayName: 'runner',
            categoryId: null,
            categoryName: null,
            reason: 'game-wide',
            excludedBy: 1,
            excludedByName: 'mod',
            createdAt: '2026-01-01T00:00:00Z',
        },
        {
            ruleId: 2,
            type: 'user',
            targetId: 7,
            targetDisplayName: 'runner',
            categoryId: 1,
            categoryName: 'Category 1',
            reason: 'cat',
            excludedBy: 1,
            excludedByName: 'mod',
            createdAt: '2026-01-01T00:00:00Z',
        },
        {
            ruleId: 3,
            type: 'user',
            targetId: 8,
            targetDisplayName: 'other',
            categoryId: null,
            categoryName: null,
            reason: null,
            excludedBy: 1,
            excludedByName: 'mod',
            createdAt: '2026-01-01T00:00:00Z',
        },
    ];

    it('splits this runner’s rules by scope and drops other runners’', () => {
        const state = buildBanState(rules, 7);
        expect(state.gameRule?.ruleId).toBe(1);
        expect(state.categoryRules.map((r) => r.ruleId)).toEqual([2]);
    });

    it('game rule covers every combo; category rule only its own', () => {
        const state = buildBanState(rules, 7);
        expect(ruleForCombo(state, 5)?.ruleId).toBe(1);
        const noGame = buildBanState(rules.slice(1), 7);
        expect(ruleForCombo(noGame, 1)?.ruleId).toBe(2);
        expect(ruleForCombo(noGame, 5)).toBeNull();
    });
});

describe('filterRunnerActions', () => {
    const rowBase = {
        userId: 1,
        actorName: 'mod',
        remark: null,
        timestamp: '2026-01-01T00:00:00Z',
    };
    const actions: ModActionRow[] = [
        {
            ...rowBase,
            logId: 1,
            action: 'exclude_run',
            entity: 'finished_run',
            target: '11',
            data: { gameId: 1 },
        },
        {
            ...rowBase,
            logId: 2,
            action: 'exclude_run',
            entity: 'finished_run',
            target: '999',
            data: { gameId: 1 },
        },
        {
            ...rowBase,
            logId: 3,
            action: 'exclude_via_rule',
            entity: 'exclusion_rule',
            target: '5',
            data: { targetId: 7, gameId: 1 },
        },
        {
            ...rowBase,
            logId: 4,
            action: 'delete_exclusion_rule',
            entity: 'exclusion_rule',
            target: null,
            data: { targetId: 8 },
        },
        {
            ...rowBase,
            logId: 5,
            action: 'verify',
            entity: 'manual_time',
            target: '42',
            data: {},
        },
    ];

    it('keeps rows for the runner’s runs, manual times, and rule snapshots', () => {
        const kept = filterRunnerActions(
            actions,
            new Set([11]),
            new Set([42]),
            7,
        );
        expect(kept.map((r) => r.logId)).toEqual([1, 3, 5]);
    });
});

describe('buildSummary', () => {
    it('totals runs and finds the best rank and latest activity', () => {
        const combos = buildCombos(
            [
                run({
                    runId: 1,
                    categoryId: 1,
                    isLeaderboardEntry: true,
                    rank: 9,
                    endedAt: '2026-03-01T00:00:00Z',
                }),
                run({
                    runId: 2,
                    categoryId: 2,
                    primaryTiming: 'gametime',
                    gameTime: 500,
                    isLeaderboardEntryGt: true,
                    rank: 2,
                    endedAt: '2026-02-01T00:00:00Z',
                }),
            ],
            [manual({ id: 1, categoryId: 1 })],
            CATS,
        );
        const s = buildSummary(combos);
        expect(s.comboCount).toBe(2);
        expect(s.runCount).toBe(2);
        expect(s.manualCount).toBe(1);
        expect(s.bestRank).toEqual({ rank: 2, comboKey: '2::' });
        expect(s.lastActive).toBe('2026-03-01T00:00:00Z');
    });
});

describe('publicBoardHref', () => {
    it('builds the public board URL with subcategory params', () => {
        expect(
            publicBoardHref('sm64', {
                categorySlug: '120-star',
                subcategoryKey: 'platform=n64|region=jp',
            }),
        ).toBe('/games-v2/sm64?category=120-star&platform=n64&region=jp');
    });

    it('returns null when the category no longer resolves', () => {
        expect(
            publicBoardHref('sm64', { categorySlug: null, subcategoryKey: '' }),
        ).toBeNull();
    });
});
