import { describe, expect, it } from 'vitest';
import { defaultBanScopeForCategories, undoReason } from './action-model';

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
