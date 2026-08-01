import { describe, expect, it } from 'vitest';
import type {
    GameStandings,
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import { boardDisplayOrder, orderStandingsForDisplay } from './order';

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
