import { describe, expect, it } from 'vitest';
import type {
    GameStandings,
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import {
    boardDisplayOrder,
    dropStandingsCategories,
    orderStandingsForDisplay,
    standingsScope,
    standingsSections,
} from './order';

const resolved = (
    name: string,
    sortOrder: number,
    groupId: number | null = null,
): ResolvedCategory => ({
    id: sortOrder,
    name,
    display: name,
    primaryTiming: 'rt',
    archived: false,
    sortOrder,
    groupId,
});

const group = (id: number, sortOrder: number): ResolvedGroup => ({
    id,
    name: `g${id}`,
    sortOrder,
    kind: 'normal',
    rules: null,
});

const standingsCat = (name: string) => ({
    id: 0,
    name,
    display: name,
    timing: 'rt' as const,
    wrTimeMs: 100,
    entryCount: 100,
});

describe('boardDisplayOrder', () => {
    it('orders groups by sortOrder, categories within, ungrouped last', () => {
        const order = boardDisplayOrder(
            [
                resolved('ext1', 1, 2),
                resolved('main2', 2, 1),
                resolved('main1', 1, 1),
                resolved('loose', 1, null),
            ],
            [group(2, 20), group(1, 10)],
        );
        expect(order).toEqual(['main1', 'main2', 'ext1', 'loose']);
    });
});

describe('standingsSections', () => {
    it('one row per non-empty group in order, hidden groups default off', () => {
        const sections = standingsSections(
            [
                resolved('ext1', 1, 2),
                resolved('main1', 1, 1),
                resolved('loose', 1, null),
            ],
            [
                { ...group(1, 10) },
                { ...group(2, 20), hiddenByDefault: true },
                group(3, 30), // empty — no row
            ],
        );
        expect(sections).toEqual([
            { label: 'g1', names: ['main1'], defaultCounted: true },
            { label: 'g2', names: ['ext1'], defaultCounted: false },
            { label: null, names: ['loose'], defaultCounted: true },
        ]);
    });
});

describe('orderStandingsForDisplay', () => {
    it('permutes categories AND remaps cell indices together', () => {
        const standings: GameStandings = {
            categories: [standingsCat('ext'), standingsCat('main')],
            runners: [],
            // Runner 0's cell points at 'ext' (wire index 0).
            cells: [[0, 0, 3, 500]],
            truncated: false,
        };
        const out = orderStandingsForDisplay(
            standings,
            [resolved('main', 1, 1), resolved('ext', 1, 2)],
            [group(1, 1), group(2, 2)],
        );
        expect(out.categories.map((c) => c.name)).toEqual(['main', 'ext']);
        // The cell still describes the SAME category, at its new index.
        expect(out.cells).toEqual([[1, 0, 3, 500]]);
    });

    it('keeps categories the resolver does not know, after the known ones', () => {
        const standings: GameStandings = {
            categories: [standingsCat('mystery'), standingsCat('main')],
            runners: [],
            cells: [],
            truncated: false,
        };
        const out = orderStandingsForDisplay(
            standings,
            [resolved('main', 1, null)],
            [],
        );
        expect(out.categories.map((c) => c.name)).toEqual(['main', 'mystery']);
    });
});

describe('standingsScope — levels are not part of the comparison', () => {
    const levelGroup: ResolvedGroup = {
        ...group(9, 90),
        name: 'E1M1',
        kind: 'level',
    };
    const anyPct = resolved('any', 1, null);
    const board = { ...resolved('e1m1any', 2, 9), id: 42 };

    it('drops level boards and level groups from the scope', () => {
        const scope = standingsScope(
            [anyPct, board],
            [group(1, 10), levelGroup],
        );
        expect(scope.categories).toEqual([anyPct]);
        expect(scope.groups.map((g) => g.id)).toEqual([1]);
        expect([...scope.excludedIds]).toEqual([42]);
    });

    it('a level group never becomes a toggle section', () => {
        const scope = standingsScope([anyPct, board], [levelGroup]);
        expect(standingsSections(scope.categories, scope.groups)).toEqual([
            { label: null, names: ['any'], defaultCounted: true },
        ]);
    });
});

describe('dropStandingsCategories', () => {
    const std = (): GameStandings => ({
        categories: [
            { ...standingsCat('any'), id: 1 },
            { ...standingsCat('e1m1-any%'), id: 42 },
            { ...standingsCat('hundred'), id: 2 },
        ],
        runners: [
            {
                name: 'joey',
                userId: 1,
                isGuest: false,
                picture: null,
                country: null,
            },
        ],
        cells: [
            [0, 0, 1, 100],
            [1, 0, 1, 200],
            [2, 0, 3, 300],
        ],
        truncated: false,
    });

    it('removes the column and reindexes the cells that survive', () => {
        const out = dropStandingsCategories(std(), new Set([42]));
        expect(out.categories.map((c) => c.id)).toEqual([1, 2]);
        // The level board's own cell goes with its column; "hundred" moves
        // from index 2 to 1 and its cell moves with it.
        expect(out.cells).toEqual([
            [0, 0, 1, 100],
            [1, 0, 3, 300],
        ]);
    });

    it('is a no-op when nothing is excluded', () => {
        const input = std();
        expect(dropStandingsCategories(input, new Set())).toBe(input);
    });
});
