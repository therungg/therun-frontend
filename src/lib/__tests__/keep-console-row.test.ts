import { describe, expect, it } from 'vitest';
import { keepConsoleRow } from '../console/keep-console-row';

// The set is `resolveCategory(...).categories` — stats rows above the
// activity floor plus every zero-stats pageData category. Anything the
// console's own pageData list holds that isn't in there is a category the
// floor already dropped.
describe('keepConsoleRow', () => {
    it('keeps a zero-stats board — a fresh or just-materialised one', () => {
        // The level-board case: real board, all-zero stats, must not read as
        // junk. resolveCategory unioned it in precisely because it is one.
        expect(keepConsoleRow(7, new Set([7]))).toBe(true);
    });

    it('keeps a category with stats', () => {
        expect(keepConsoleRow(1, new Set([1, 7]))).toBe(true);
    });

    it('drops a category the activity floor already took out', () => {
        // Below-floor stats rows never make it into resolveCategory's list —
        // absence there IS the floor's verdict, and it is not re-derivable
        // from the merged row, whose stats read as zeros either way.
        expect(keepConsoleRow(99, new Set([1, 7]))).toBe(false);
    });
});
