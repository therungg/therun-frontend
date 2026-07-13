import { describe, expect, test } from 'vitest';
import { fixturePost } from '~src/lib/fast50/fixtures';
import { calledShotVerdict } from '../verdict';

const postRunAt = (finalTimeMs: number) => {
    const postRun = fixturePost.grinder.postRun;
    if (!postRun) {
        throw new Error('fixturePost.grinder.postRun is null');
    }
    return {
        ...postRun,
        finalTimeMs,
    };
};

const goal = { text: 'sub 100', targetTimeMs: 6_000_000 };

describe('calledShotVerdict', () => {
    test('no post run: died', () => {
        expect(calledShotVerdict(goal, null)).toEqual({
            kind: 'died',
            deltaMs: null,
        });
    });

    test('goal without target time: no-target', () => {
        expect(
            calledShotVerdict({ text: 'have fun' }, postRunAt(5_000_000)).kind,
        ).toBe('no-target');
    });

    test('exactly on target: hit', () => {
        expect(calledShotVerdict(goal, postRunAt(6_000_000))).toEqual({
            kind: 'hit',
            deltaMs: 0,
        });
    });

    test('beat target by the demolish margin: demolished', () => {
        expect(
            calledShotVerdict(goal, postRunAt(6_000_000 - 60_000)).kind,
        ).toBe('demolished');
        expect(
            calledShotVerdict(goal, postRunAt(6_000_000 - 59_999)).kind,
        ).toBe('hit');
    });

    test('over target: missed with positive delta', () => {
        expect(calledShotVerdict(goal, postRunAt(6_030_000))).toEqual({
            kind: 'missed',
            deltaMs: 30_000,
        });
    });
});
