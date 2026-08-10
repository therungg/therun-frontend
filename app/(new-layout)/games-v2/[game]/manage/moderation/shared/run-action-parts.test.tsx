// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AffectedSummary, ScopeCards } from './run-action-parts';

afterEach(cleanup);

describe('ScopeCards', () => {
    const options = [
        { value: 'run', title: 'This run', detail: 'Only this one' },
        { value: 'runner', title: 'Every run by greensuigi' },
    ] as const;

    it('renders a radiogroup with one radio per option', () => {
        render(
            <ScopeCards
                label="What are you removing?"
                options={[...options]}
                value="run"
                onChange={vi.fn()}
            />,
        );
        expect(
            screen.getByRole('radiogroup', { name: 'What are you removing?' }),
        ).toBeTruthy();
        const radios = screen.getAllByRole('radio');
        expect(radios).toHaveLength(2);
        expect(radios[0].getAttribute('aria-checked')).toBe('true');
        expect(radios[1].getAttribute('aria-checked')).toBe('false');
    });

    it('fires onChange with the clicked value', () => {
        const onChange = vi.fn();
        render(
            <ScopeCards
                label="What are you removing?"
                options={[...options]}
                value="run"
                onChange={onChange}
            />,
        );
        fireEvent.click(screen.getByRole('radio', { name: /Every run/ }));
        expect(onChange).toHaveBeenCalledWith('runner');
    });

    it('disables every card when disabled', () => {
        render(
            <ScopeCards
                label="Scope"
                options={[...options]}
                value="run"
                onChange={vi.fn()}
                disabled
            />,
        );
        for (const r of screen.getAllByRole('radio')) {
            expect((r as HTMLButtonElement).disabled).toBe(true);
        }
    });
});

describe('AffectedSummary', () => {
    it('pluralizes counts', () => {
        render(<AffectedSummary runCount={4} leaderboardCount={1} />);
        expect(
            screen.getByText(
                (_, el) =>
                    el?.tagName === 'P' &&
                    el?.textContent === '4 runs affected across 1 leaderboard.',
            ),
        ).toBeTruthy();
    });
});
