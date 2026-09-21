import { describe, expect, it } from 'vitest';
import { legacyPaneRedirect } from '../legacy-panes';

describe('legacyPaneRedirect', () => {
    it('sends a category-scoped pane with a category to the settings table', () => {
        expect(legacyPaneRedirect('rules', '12')).toEqual({
            kind: 'detail',
            categoryId: 12,
            screen: 'settings',
            openRules: true,
        });
    });

    it('lands every retired pane on the screen that holds its settings', () => {
        for (const pane of [
            'standards',
            'timing',
            'combinations',
            'category-settings',
        ]) {
            expect(legacyPaneRedirect(pane, '3'), pane).toEqual({
                kind: 'detail',
                categoryId: 3,
                screen: 'settings',
                openRules: false,
            });
        }
    });

    it('sends a category-scoped pane without a category to the index', () => {
        expect(legacyPaneRedirect('rules', null)).toEqual({
            kind: 'pane',
            pane: 'categories',
        });
    });

    it('leaves bare ?pane=variables alone — the game-level Variables pane is back', () => {
        expect(legacyPaneRedirect('variables', null)).toBeNull();
    });

    it('sends ?pane=variables&cat=N to the subcategories screen', () => {
        expect(legacyPaneRedirect('variables', '12')).toEqual({
            kind: 'detail',
            categoryId: 12,
            screen: 'subcategories',
            openRules: false,
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
