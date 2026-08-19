import { describe, expect, it } from 'vitest';
import type { ResolvedGroup } from '../../../../types/leaderboards.types';
import { countableCategories, planCategoryCountProbes } from './data';

const levelGroup: ResolvedGroup = {
    id: 10,
    name: 'E1M1',
    sortOrder: 1,
    hiddenByDefault: false,
    displayMode: null,
    kind: 'level',
    rules: null,
};
const otherLevel: ResolvedGroup = { ...levelGroup, id: 11, name: 'E1M2' };

const anyPct = { name: 'any', groupId: null };
const hundred = { name: 'hundred', groupId: null };
const boardsOf = (groupId: number, n: number) =>
    Array.from({ length: n }, (_, i) => ({
        name: `g${groupId}board${i}`,
        groupId,
    }));

describe('countableCategories', () => {
    it('counts the full-game pills even on a game with 30 levels of boards', () => {
        // The regression this guards: `categories` on a levelled game is the
        // whole cross product, which sails past MAX_CATEGORY_COUNT_PROBES and
        // takes every chip's count down with it.
        const levels = Array.from({ length: 30 }, (_, i) => ({
            ...levelGroup,
            id: 100 + i,
        }));
        const boards = levels.flatMap((g) => boardsOf(g.id, 4));

        expect(
            countableCategories([anyPct, hundred, ...boards], levels, null),
        ).toEqual([anyPct, hundred]);
    });

    it('adds the selected level’s own boards, and no other level’s', () => {
        const mine = boardsOf(10, 2);
        const theirs = boardsOf(11, 2);

        expect(
            countableCategories(
                [anyPct, ...mine, ...theirs],
                [levelGroup, otherLevel],
                { id: 10 },
            ),
        ).toEqual([anyPct, ...mine]);
    });
});

describe('planCategoryCountProbes', () => {
    const withRuns = (name: string) => ({
        name,
        totalFinishedAttemptCount: 40,
        totalRunTime: 10_000,
    });
    const noRuns = (name: string) => ({
        name,
        totalFinishedAttemptCount: 0,
        totalRunTime: 0,
    });

    it('answers zero-stats boards from the stats, without a request', () => {
        const plan = planCategoryCountProbes([
            withRuns('any'),
            noRuns('e1m1any'),
            noRuns('e1m2any'),
        ]);

        expect(plan.toProbe.map((c) => c.name)).toEqual(['any']);
        expect(plan.empty).toEqual({ e1m1any: 0, e1m2any: 0 });
    });

    it('spends the probe budget on the boards that can have rows', () => {
        // 40 zero-run boards used to blow the ceiling for everyone; now they
        // cost nothing and the two real boards still get counted.
        const plan = planCategoryCountProbes([
            withRuns('any'),
            withRuns('hundred'),
            ...Array.from({ length: 40 }, (_, i) => noRuns(`board${i}`)),
        ]);

        expect(plan.toProbe.map((c) => c.name)).toEqual(['any', 'hundred']);
    });

    it('still gives up when too many live boards would be probed', () => {
        const plan = planCategoryCountProbes(
            Array.from({ length: 25 }, (_, i) => withRuns(`c${i}`)),
        );
        expect(plan.toProbe).toEqual([]);
        expect(plan.empty).toEqual({});
    });
});
