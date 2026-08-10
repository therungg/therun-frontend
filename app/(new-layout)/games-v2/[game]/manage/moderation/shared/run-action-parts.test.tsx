// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserEligibleRunRow } from '../../../../../../types/moderation.types';
import { AffectedSummary, CutoffPicker, ScopeCards } from './run-action-parts';

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

const row = (runId: number, time: number): UserEligibleRunRow => ({
    runId,
    categoryId: 10,
    categoryName: 'any-percent',
    subcategoryKey: '',
    time,
    gameTime: null,
    primaryTiming: 'rt',
    verificationStatus: 'pending',
    vodUrl: null,
    endedAt: '2026-08-01T00:00:00Z',
    isLeaderboardEntry: true,
    isLeaderboardEntryGt: false,
    rank: null,
    totalRunners: null,
});

describe('CutoffPicker', () => {
    it('pins a None row and lists each run with its status', () => {
        render(
            <CutoffPicker
                runs={[row(1, 5_725_000), row(2, 5_728_000)]}
                timing="rt"
                value={null}
                onChange={vi.fn()}
                fasterCount={0}
            />,
        );
        const radios = screen.getAllByRole('radio');
        expect(radios).toHaveLength(3); // None + 2 runs
        expect(radios[0].textContent).toContain('None — just remove this one');
        expect(radios[0].getAttribute('aria-checked')).toBe('true');
        expect(screen.getAllByText('pending')).toHaveLength(2);
    });

    it('selects a run row and reports it', () => {
        const onChange = vi.fn();
        render(
            <CutoffPicker
                runs={[row(1, 5_725_000)]}
                timing="rt"
                value={null}
                onChange={onChange}
                fasterCount={0}
            />,
        );
        fireEvent.click(screen.getAllByRole('radio')[1]);
        expect(onChange).toHaveBeenCalledWith(1);
    });

    it('shows the faster-runs consequence line only when a cutoff catches runs', () => {
        const { rerender } = render(
            <CutoffPicker
                runs={[row(1, 5_725_000), row(2, 5_728_000)]}
                timing="rt"
                value={2}
                onChange={vi.fn()}
                fasterCount={1}
            />,
        );
        expect(screen.getByText(/1 faster run goes with it/)).toBeTruthy();
        rerender(
            <CutoffPicker
                runs={[row(1, 5_725_000), row(2, 5_728_000)]}
                timing="rt"
                value={1}
                onChange={vi.fn()}
                fasterCount={0}
            />,
        );
        expect(screen.queryByText(/goes with it/)).toBeNull();
    });
});
