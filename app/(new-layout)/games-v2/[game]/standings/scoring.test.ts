import { describe, expect, it } from 'vitest';
import type {
    GameStandings,
    StandingsCategory,
    StandingsRunner,
} from '../../../../../types/leaderboards.types';
import { computeStandings, decodeStandings, placementPoints } from './scoring';

const cat = (id: number, entryCount: number): StandingsCategory => ({
    id,
    name: `c${id}`,
    display: `Category ${id}`,
    timing: 'rt',
    wrTimeMs: 100,
    entryCount,
});

const runner = (name: string): StandingsRunner => ({
    name,
    userId: null,
    isGuest: false,
    picture: null,
    country: null,
});

/** Two categories, 100 entries each, so points are trivially readable. */
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

describe('placementPoints', () => {
    it('pays #1 the whole field, #4 half, #100 a tenth', () => {
        expect(placementPoints(100, 1)).toBe(100);
        expect(placementPoints(100, 4)).toBe(50);
        expect(placementPoints(100, 100)).toBe(10);
    });

    it('is steep at the top: #1 clearly outweighs #10 on a big board', () => {
        const first = placementPoints(1000, 1);
        const tenth = placementPoints(1000, 10);
        expect(first / tenth).toBeGreaterThan(3);
    });
});

describe('decodeStandings', () => {
    it('turns rank + field into points', () => {
        const m = decodeStandings(
            build(
                ['first', 'fourth'],
                [
                    [0, 0, 1, 100],
                    [0, 1, 4, 200],
                ],
            ),
        );
        expect(m.pts[0][0]).toBe(100);
        expect(m.pts[0][1]).toBe(50);
    });

    it('leaves absent cells at 0 rather than filling them', () => {
        const m = decodeStandings(build(['a'], [[0, 0, 1, 100]]));
        expect(m.pts[1][0]).toBe(0);
        expect(m.rank[1][0]).toBe(0);
    });

    it('drops non-positive times (auto-imported 0ms runs)', () => {
        const m = decodeStandings(build(['zero'], [[0, 0, 1, 0]]));
        expect(m.pts[0][0]).toBe(0);
    });

    it('drops non-positive ranks instead of producing Infinity/NaN', () => {
        const m = decodeStandings(build(['bad'], [[0, 0, 0, 100]]));
        expect(m.pts[0][0]).toBe(0);
        expect(Number.isFinite(m.pts[0][0])).toBe(true);
    });

    it('drops cells whose category reports no entryCount', () => {
        const m = decodeStandings(
            build(['a'], [[0, 0, 1, 500]], [cat(1, 0), cat(2, 100)]),
        );
        expect(m.pts[0][0]).toBe(0);
    });
});

describe('computeStandings', () => {
    it('sums points over the selected categories', () => {
        // #1 of 100 on one board + #4 of 100 on the other -> 150.
        const m = decodeStandings(
            build(
                ['both'],
                [
                    [0, 0, 1, 100],
                    [1, 0, 4, 200],
                ],
            ),
        );
        const [row] = computeStandings(m, [0, 1], 20);
        expect(row.score).toBe(150);
        expect(row.coverage).toBe(2);
    });

    it('pays nothing for a board not run — no absent-counts-as-zero average', () => {
        const m = decodeStandings(build(['solo'], [[0, 0, 1, 100]]));
        const [row] = computeStandings(m, [0, 1], 20);
        expect(row.score).toBe(100);
        expect(row.cells[1]).toBeNull();
    });

    it('a deep field outweighs a shallow one at the same rank', () => {
        // #1 of 1000 beats #1 of 50 + #10 of 50.
        const m = decodeStandings(
            build(
                ['deep', 'shallow'],
                [
                    [0, 0, 1, 100],
                    [1, 1, 1, 100],
                ],
                [cat(1, 1000), cat(2, 50)],
            ),
        );
        const rows = computeStandings(m, [0, 1], 20);
        expect(rows.map((r) => r.runner.name)).toEqual(['deep', 'shallow']);
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
        // Both total 100: one via 2 x #4 (50+50), one via a single #1.
        const m = decodeStandings(
            build(
                ['spread', 'single'],
                [
                    [0, 0, 4, 200],
                    [1, 0, 4, 200],
                    [0, 1, 1, 100],
                ],
            ),
        );
        const rows = computeStandings(m, [0, 1], 20);
        expect(rows[0].score).toBeCloseTo(rows[1].score);
        expect(rows[0].runner.name).toBe('spread');
        expect(rows[0].coverage).toBe(2);
    });

    it('breaks a score+coverage tie on the best single cell', () => {
        // Both total 105 over 2 boards (fields 90 and 120):
        // peaky = #1 of 90 (90) + #64 of 120 (15); even = #4 of both (45+60).
        const m = decodeStandings(
            build(
                ['peaky', 'even'],
                [
                    [0, 0, 1, 100],
                    [1, 0, 64, 400],
                    [0, 1, 4, 167],
                    [1, 1, 4, 167],
                ],
                [cat(1, 90), cat(2, 120)],
            ),
        );
        const rows = computeStandings(m, [0, 1], 20);
        expect(rows[0].score).toBeCloseTo(rows[1].score);
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
