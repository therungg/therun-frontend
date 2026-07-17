import { describe, expect, it } from 'vitest';
import { nextTrapFocusTarget } from './board-dialog';

describe('nextTrapFocusTarget', () => {
    const [a, b, c] = ['a', 'b', 'c'];
    const focusable = [a, b, c];

    it('wraps from the last element to the first on Tab', () => {
        expect(nextTrapFocusTarget(focusable, c, false)).toBe(a);
    });

    it('wraps from the first element to the last on Shift+Tab', () => {
        expect(nextTrapFocusTarget(focusable, a, true)).toBe(c);
    });

    it('lets default Tab movement happen in the middle of the list', () => {
        expect(nextTrapFocusTarget(focusable, b, false)).toBeNull();
        expect(nextTrapFocusTarget(focusable, b, true)).toBeNull();
    });

    it('redirects to the first element when focus is outside the panel', () => {
        expect(nextTrapFocusTarget(focusable, null, false)).toBe(a);
        expect(nextTrapFocusTarget(focusable, 'outside', false)).toBe(a);
    });

    it('stays put when there is exactly one focusable element', () => {
        expect(nextTrapFocusTarget([a], a, false)).toBe(a);
        expect(nextTrapFocusTarget([a], a, true)).toBe(a);
    });

    it('returns null when there is nothing focusable', () => {
        expect(nextTrapFocusTarget([], null, false)).toBeNull();
    });
});
