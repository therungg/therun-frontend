import { describe, expect, it } from 'vitest';
import { legacyPaneRedirect } from '../legacy-panes';

describe('legacyPaneRedirect', () => {
    it('sends a category-scoped pane with a category to the detail screen', () => {
        expect(legacyPaneRedirect('rules', '12')).toEqual({
            kind: 'detail',
            categoryId: 12,
            hash: 'rules',
        });
    });

    it('maps every retired pane id to its section anchor', () => {
        for (const pane of [
            'standards',
            'timing',
            'rules',
            'variables',
            'combinations',
            'category-settings',
        ]) {
            expect(legacyPaneRedirect(pane, '3'), pane).toEqual({
                kind: 'detail',
                categoryId: 3,
                hash: pane,
            });
        }
    });

    it('sends a category-scoped pane without a category to the index', () => {
        expect(legacyPaneRedirect('rules', null)).toEqual({
            kind: 'pane',
            pane: 'categories',
        });
        // The game-level variables pane is gone — variables are
        // category-scoped, so the bare link lands on the index too.
        expect(legacyPaneRedirect('variables', null)).toEqual({
            kind: 'pane',
            pane: 'categories',
        });
    });

    it('renames the old visibility pane', () => {
        expect(legacyPaneRedirect('categories-visibility', null)).toEqual({
            kind: 'pane',
            pane: 'categories',
        });
    });

    it('ignores a non-numeric category', () => {
        expect(legacyPaneRedirect('rules', 'abc')).toEqual({
            kind: 'pane',
            pane: 'categories',
        });
    });

    it('leaves current panes alone', () => {
        expect(legacyPaneRedirect('attention', null)).toBeNull();
        expect(legacyPaneRedirect('groups', '4')).toBeNull();
        expect(legacyPaneRedirect(null, null)).toBeNull();
        expect(legacyPaneRedirect('categories', null)).toBeNull();
    });
});
