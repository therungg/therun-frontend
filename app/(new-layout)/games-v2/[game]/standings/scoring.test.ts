import { describe, expect, it } from 'vitest';
import type {
    GameStandings,
    StandingsCategory,
    StandingsRunner,
} from '../../../../../types/leaderboards.types';
import { computeStandings, decodeStandings } from './scoring';

const cat = (id: number, wrTimeMs: number): StandingsCategory => ({
    id,
    name: `c${id}`,
    display: `Category ${id}`,
    timing: 'rt',
    wrTimeMs,
    entryCount: 0,
});

const runner = (name: string): StandingsRunner => ({
    name,
    userId: null,
    isGuest: false,
    picture: null,
    country: null,
});

/** Two categories, WR 100ms each, so pct is trivially readable in tests. */
function build(
    runners: string[],
    cells: GameStandings['cells'],
    categories = [cat(1, 100), cat(2, 100)],
): GameStandings {
    return {
        categories,
        runners: runners.map(runner),
        cells,
        truncated: false,
    };
}

describe('decodeStandings', () => {
    it('turns wr/time into pct, with the WR holder at exactly 1', () => {
        const m = decodeStandings(
            build(
                ['wr', 'half'],
                [
                    [0, 0, 1, 100],
                    [0, 1, 2, 200],
                ],
            ),
        );
        expect(m.pct[0][0]).toBe(1);
        expect(m.pct[0][1]).toBe(0.5);
    });

    it('leaves absent cells at 0 rather than filling them', () => {
        const m = decodeStandings(build(['a'], [[0, 0, 1, 100]]));
        expect(m.pct[1][0]).toBe(0);
        expect(m.rank[1][0]).toBe(0);
    });

    it('drops non-positive times instead of producing Infinity', () => {
        // Boards carry auto-imported 0ms runs; a 0 denominator must never
        // reach the matrix.
        const m = decodeStandings(build(['zero'], [[0, 0, 1, 0]]));
        expect(m.pct[0][0]).toBe(0);
        expect(Number.isFinite(m.pct[0][0])).toBe(true);
    });

    it('drops cells whose category has a non-positive WR', () => {
        const m = decodeStandings(
            build(['a'], [[0, 0, 1, 500]], [cat(1, 0), cat(2, 100)]),
        );
        expect(m.pct[0][0]).toBe(0);
    });

    it('clamps pct at 1 so a stale WR cannot print over 100%', () => {
        const m = decodeStandings(build(['fast'], [[0, 0, 1, 50]]));
        expect(m.pct[0][0]).toBe(1);
    });
});

describe('computeStandings', () => {
    it('averages over ALL selected categories, counting absent as zero', () => {
        // Present on one of two selected boards at full pct -> 0.5, not 1.0.
        const m = decodeStandings(build(['solo'], [[0, 0, 1, 100]]));
        const [row] = computeStandings(m, [0, 1], 20);
        expect(row.score).toBe(0.5);
        expect(row.coverage).toBe(1);
    });

    it('ranks coverage above peak — the property most likely to be "fixed" into a bug', () => {
        // broad: 85% on both boards. peak: the WR of one, absent on the other.
        const m = decodeStandings(
            build(
                ['broad', 'peak'],
                [
                    [0, 0, 12, 118],
                    [1, 0, 9, 118],
                    [0, 1, 1, 100],
                ],
            ),
        );
        const rows = computeStandings(m, [0, 1], 20);
        expect(rows.map((r) => r.runner.name)).toEqual(['broad', 'peak']);
        expect(rows[0].score).toBeGreaterThan(rows[1].score);
        expect(rows[1].score).toBe(0.5);
    });

    it('reduces to that board when a single category is selected', () => {
        const m = decodeStandings(
            build(
                ['slow', 'fast', 'other'],
                [
                    [0, 0, 2, 200],
                    [0, 1, 1, 100],
                    [1, 2, 1, 100],
                ],
            ),
        );
        const rows = computeStandings(m, [0], 20);
        expect(rows.map((r) => r.runner.name)).toEqual(['fast', 'slow']);
        // A runner with nothing on the selected board isn't ranked last, they
        // are not in this competition at all.
        expect(rows).toHaveLength(2);
    });

    it('returns nothing when no category is selected', () => {
        const m = decodeStandings(build(['a'], [[0, 0, 1, 100]]));
        expect(computeStandings(m, [], 20)).toEqual([]);
    });

    it('honours the row limit', () => {
        const m = decodeStandings(
            build(
                ['a', 'b', 'c'],
                [
                    [0, 0, 1, 100],
                    [0, 1, 2, 200],
                    [0, 2, 3, 300],
                ],
            ),
        );
        expect(computeStandings(m, [0], 2)).toHaveLength(2);
    });

    it('breaks a score tie on coverage first', () => {
        // Both average 0.5 across two categories: one via 2x0.5, one via 1x1.0.
        const m = decodeStandings(
            build(
                ['spread', 'single'],
                [
                    [0, 0, 5, 200],
                    [1, 0, 5, 200],
                    [0, 1, 1, 100],
                ],
            ),
        );
        const rows = computeStandings(m, [0, 1], 20);
        expect(rows[0].score).toBeCloseTo(rows[1].score);
        expect(rows[0].runner.name).toBe('spread');
        expect(rows[0].coverage).toBe(2);
    });

    it('breaks a score+coverage tie on the best single pct', () => {
        // Both: coverage 2, sum 1.2 -> score 0.6. Different peaks.
        const m = decodeStandings(
            build(
                ['peaky', 'even'],
                [
                    [0, 0, 1, 125], // 0.8
                    [1, 0, 9, 250], // 0.4
                    [0, 1, 3, 167], // ~0.6
                    [1, 1, 3, 167], // ~0.6
                ],
            ),
        );
        const rows = computeStandings(m, [0, 1], 20);
        expect(rows[0].coverage).toBe(rows[1].coverage);
        expect(rows[0].runner.name).toBe('peaky');
    });

    it('falls back to name so identical runners never reshuffle', () => {
        const m = decodeStandings(
            build(
                ['zeta', 'alpha'],
                [
                    [0, 0, 1, 100],
                    [0, 1, 1, 100],
                ],
            ),
        );
        const rows = computeStandings(m, [0], 20);
        expect(rows.map((r) => r.runner.name)).toEqual(['alpha', 'zeta']);
    });

    it('lines cells up with the selected order, not the payload order', () => {
        const m = decodeStandings(
            build(
                ['a'],
                [
                    [0, 0, 1, 100],
                    [1, 0, 4, 400],
                ],
            ),
        );
        const [row] = computeStandings(m, [1, 0], 20);
        expect(row.cells[0]?.rank).toBe(4);
        expect(row.cells[1]?.rank).toBe(1);
    });
});
