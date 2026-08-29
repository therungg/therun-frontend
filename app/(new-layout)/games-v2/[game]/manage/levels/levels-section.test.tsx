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
});
