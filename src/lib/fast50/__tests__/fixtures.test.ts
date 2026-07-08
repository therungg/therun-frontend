import { describe, expect, test } from 'vitest';
import { forecastBands } from '../compute';
import { FIXTURES, fixturePost } from '../fixtures';

describe('fixtures', () => {
    test('grinder is a grinder', () => {
        const g = FIXTURES.grinder;
        expect(g.core.attemptCount).toBeGreaterThan(1000);
        expect(g.core.finishRate).toBeLessThan(0.1);
        expect(g.splits.some((s) => s.resetShare > 0.3)).toBe(true);
        expect(forecastBands(g.finishedRuns)).not.toBeNull();
    });
    test('prodigy is world class and consistent', () => {
        const p = FIXTURES.prodigy;
        expect(p.core.finishRate).toBeGreaterThan(0.5);
        expect(p.leaderboards?.pbPlacing).toBe(1);
    });
    test('sparse has almost nothing', () => {
        const s = FIXTURES.sparse;
        expect(s.finishedRuns.length).toBeLessThan(5);
        expect(s.community).toBeNull();
    });
    test('post variants carry postRun', () => {
        for (const d of Object.values(fixturePost)) {
            expect(d.deck).toBe('post');
            expect(d.postRun).not.toBeNull();
        }
        expect(fixturePost.grinder.postRun?.goldCount).toBe(2);
    });
});
