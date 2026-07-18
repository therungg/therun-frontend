import { describe, expect, it } from 'vitest';
import { isSameRunner } from './is-same-runner';

describe('isSameRunner', () => {
    it('matches identical names', () => {
        expect(isSameRunner('joeys88', 'joeys88')).toBe(true);
    });

    it('matches names that differ only by case', () => {
        expect(isSameRunner('Joeys88', 'joeys88')).toBe(true);
    });

    it('does not match different names', () => {
        expect(isSameRunner('joeys88', 'someoneelse')).toBe(false);
    });

    it('is false when a is null', () => {
        expect(isSameRunner(null, 'joeys88')).toBe(false);
    });

    it('is false when a is undefined', () => {
        expect(isSameRunner(undefined, 'joeys88')).toBe(false);
    });

    it('is false when a is empty string', () => {
        expect(isSameRunner('', 'joeys88')).toBe(false);
    });

    it('is false when b is null', () => {
        expect(isSameRunner('joeys88', null)).toBe(false);
    });

    it('is false when b is undefined', () => {
        expect(isSameRunner('joeys88', undefined)).toBe(false);
    });

    it('is false when b is empty string', () => {
        expect(isSameRunner('joeys88', '')).toBe(false);
    });

    it('is false when both sides are empty string', () => {
        expect(isSameRunner('', '')).toBe(false);
    });

    it('is false when both sides are nullish', () => {
        expect(isSameRunner(null, undefined)).toBe(false);
    });
});
