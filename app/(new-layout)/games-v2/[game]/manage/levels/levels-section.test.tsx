// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./levels-pane', () => ({
    LevelsPane: () => <div data-testid="levels-pane" />,
}));
vi.mock('./level-categories-pane', () => ({
    LevelCategoriesPane: () => <div data-testid="templates-pane" />,
}));

import { LevelsSection } from './levels-section';

describe('LevelsSection', () => {
    it('shows the levels list by default and switches to templates', () => {
        render(<LevelsSection gameId={1} gameSlug="g" templates={[]} />);
        expect(screen.getByTestId('levels-pane')).toBeTruthy();
        expect(screen.queryByTestId('templates-pane')).toBeNull();

        fireEvent.click(screen.getByRole('tab', { name: 'Level categories' }));
        expect(screen.getByTestId('templates-pane')).toBeTruthy();
        expect(screen.queryByTestId('levels-pane')).toBeNull();
    });

    it('lands on the templates tab when deep-linked', () => {
        render(
            <LevelsSection
                gameId={1}
                gameSlug="g"
                templates={[]}
                initialTab="templates"
            />,
        );
        expect(screen.getByTestId('templates-pane')).toBeTruthy();
        expect(
            screen
                .getByRole('tab', { name: 'Level categories' })
                .getAttribute('aria-selected'),
        ).toBe('true');
    });

    it('re-lands on templates when content-router swaps panes via a key change', () => {
        // Mirrors how content-router renders the 'levels' and
        // 'level-categories' cases: same component type at the same tree
        // position, distinguished only by a `key` prop. Without a key
        // change React would reconcile this as an update, not a remount,
        // and `initialTab` would be inert after the first mount.
        const { rerender } = render(
            <LevelsSection
                key="levels"
                gameId={1}
                gameSlug="g"
                templates={[]}
            />,
        );
        expect(screen.getByTestId('levels-pane')).toBeTruthy();

        rerender(
            <LevelsSection
                key="level-categories"
                gameId={1}
                gameSlug="g"
                templates={[]}
                initialTab="templates"
            />,
        );
        expect(screen.getByTestId('templates-pane')).toBeTruthy();
        expect(screen.queryByTestId('levels-pane')).toBeNull();
    });

    it('switches tabs with arrow keys using a roving tabindex', () => {
        render(<LevelsSection gameId={1} gameSlug="g" templates={[]} />);
        const levelsTab = screen.getByRole('tab', { name: 'Levels' });
        const templatesTab = screen.getByRole('tab', {
            name: 'Level categories',
        });
        expect(levelsTab.getAttribute('tabindex')).toBe('0');
        expect(templatesTab.getAttribute('tabindex')).toBe('-1');

        fireEvent.keyDown(levelsTab, { key: 'ArrowRight' });
        expect(screen.getByTestId('templates-pane')).toBeTruthy();
        expect(templatesTab.getAttribute('aria-selected')).toBe('true');
        expect(templatesTab.getAttribute('tabindex')).toBe('0');
        expect(levelsTab.getAttribute('tabindex')).toBe('-1');

        fireEvent.keyDown(templatesTab, { key: 'ArrowLeft' });
        expect(screen.getByTestId('levels-pane')).toBeTruthy();
        expect(levelsTab.getAttribute('aria-selected')).toBe('true');
    });

    it('wires each tab to its panel via aria-controls / aria-labelledby', () => {
        render(<LevelsSection gameId={1} gameSlug="g" templates={[]} />);
        const levelsTab = screen.getByRole('tab', { name: 'Levels' });
        const panel = screen.getByRole('tabpanel');
        expect(levelsTab.getAttribute('aria-controls')).toBe(
            panel.getAttribute('id'),
        );
        expect(panel.getAttribute('aria-labelledby')).toBe(
            levelsTab.getAttribute('id'),
        );
    });
});
