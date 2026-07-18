import { describe, expect, it } from 'vitest';
import { hasTrueInverse, isBanUndoable, undoReason } from './action-model';

describe('hasTrueInverse', () => {
    it('is false for approve — no un-verify/back-to-pending endpoint exists', () => {
        expect(hasTrueInverse('approve')).toBe(false);
    });

    it('is true for remove — restoreRunsAction (include + unreject) reverses it', () => {
        expect(hasTrueInverse('remove')).toBe(true);
    });

    it('is true for restore — exclude reverses it', () => {
        expect(hasTrueInverse('restore')).toBe(true);
    });

    it('is true for ban — deleting the created exclusion rule reverses it', () => {
        expect(hasTrueInverse('ban')).toBe(true);
    });
});

describe('isBanUndoable', () => {
    it('is undoable when the ban created a new rule', () => {
        expect(isBanUndoable({ alreadyExists: false })).toBe(true);
    });

    it("is not undoable when the ban reused a pre-existing rule — deleting it would remove something outside this action's scope", () => {
        expect(isBanUndoable({ alreadyExists: true })).toBe(false);
    });
});

describe('undoReason', () => {
    it('formats the audit note as "Undo of {verb}"', () => {
        expect(undoReason('remove')).toBe('Undo of remove');
        expect(undoReason('restore')).toBe('Undo of restore');
        expect(undoReason('ban')).toBe('Undo of ban');
    });
});
