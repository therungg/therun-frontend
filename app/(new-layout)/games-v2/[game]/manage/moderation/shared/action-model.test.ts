import { describe, expect, it } from 'vitest';
import {
    defaultBanScopeForCategories,
    hasTrueInverse,
    isBanUndoable,
    undoReason,
} from './action-model';

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

describe('defaultBanScopeForCategories', () => {
    it('defaults to "category" when every item shares one category', () => {
        expect(defaultBanScopeForCategories([5, 5, 5])).toBe('category');
    });

    it('defaults to "category" for a single item', () => {
        expect(defaultBanScopeForCategories([5])).toBe('category');
    });

    it('defaults to "game" when items span more than one category', () => {
        expect(defaultBanScopeForCategories([5, 9])).toBe('game');
    });

    it('ignores null categoryIds when counting distinct categories', () => {
        expect(defaultBanScopeForCategories([5, null, 5])).toBe('category');
        expect(defaultBanScopeForCategories([null, null])).toBe('category');
    });

    it('defaults to "game" when nulls mix with more than one real category', () => {
        expect(defaultBanScopeForCategories([5, null, 9])).toBe('game');
    });

    it('defaults to "category" for an empty list', () => {
        expect(defaultBanScopeForCategories([])).toBe('category');
    });
});
