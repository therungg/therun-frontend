// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserEligibleRunRow } from '../../../../../../../types/moderation.types';
import {
    AffectedSummary,
    CutoffPicker,
    ReasonZone,
    ScopeCards,
} from './run-action-parts';

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

    it('gives the selected option the only tab stop', () => {
        render(
            <ScopeCards
                label="What are you removing?"
                options={[...options]}
                value="runner"
                onChange={vi.fn()}
            />,
        );
        const radios = screen.getAllByRole('radio');
        expect(radios[0].getAttribute('tabindex')).toBe('-1');
        expect(radios[1].getAttribute('tabindex')).toBe('0');
    });

    it('defaults the tab stop to the first option when none is selected', () => {
        render(
            <ScopeCards
                label="Scope"
                options={[...options]}
                value={
                    'neither' as unknown as (typeof options)[number]['value']
                }
                onChange={vi.fn()}
            />,
        );
        const radios = screen.getAllByRole('radio');
        expect(radios[0].getAttribute('tabindex')).toBe('0');
        expect(radios[1].getAttribute('tabindex')).toBe('-1');
    });

    it('ArrowRight/ArrowDown moves selection and focus to the next option, wrapping', () => {
        const onChange = vi.fn();
        const { rerender } = render(
            <ScopeCards
                label="What are you removing?"
                options={[...options]}
                value="run"
                onChange={onChange}
            />,
        );
        let radios = screen.getAllByRole('radio');
        radios[0].focus();
        fireEvent.keyDown(radios[0], { key: 'ArrowRight' });
        expect(onChange).toHaveBeenCalledWith('runner');
        // Reflect the selection change (the real component would re-render
        // via its own state) so focus moves onto the now-current DOM node.
        rerender(
            <ScopeCards
                label="What are you removing?"
                options={[...options]}
                value="runner"
                onChange={onChange}
            />,
        );
        radios = screen.getAllByRole('radio');
        expect(radios[1]).toBe(document.activeElement);

        onChange.mockClear();
        fireEvent.keyDown(radios[1], { key: 'ArrowDown' });
        // Wraps from the last option back to the first.
        expect(onChange).toHaveBeenCalledWith('run');
    });

    it('ArrowLeft/ArrowUp moves selection and focus to the previous option, wrapping', () => {
        const onChange = vi.fn();
        render(
            <ScopeCards
                label="What are you removing?"
                options={[...options]}
                value="run"
                onChange={onChange}
            />,
        );
        const radios = screen.getAllByRole('radio');
        radios[0].focus();
        // Wraps from the first option back to the last.
        fireEvent.keyDown(radios[0], { key: 'ArrowLeft' });
        expect(onChange).toHaveBeenCalledWith('runner');
        expect(radios[1]).toBe(document.activeElement);

        onChange.mockClear();
        fireEvent.keyDown(radios[1], { key: 'ArrowUp' });
        expect(onChange).toHaveBeenCalledWith('run');
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
    primaryTiming: 'realtime',
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
        expect(radios[0].textContent).toContain('None. Remove this one only');
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

    it('gives the selected option (None) the only tab stop', () => {
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
        expect(radios[0].getAttribute('tabindex')).toBe('0');
        expect(radios[1].getAttribute('tabindex')).toBe('-1');
        expect(radios[2].getAttribute('tabindex')).toBe('-1');
    });

    it('gives a selected run row the only tab stop', () => {
        render(
            <CutoffPicker
                runs={[row(1, 5_725_000), row(2, 5_728_000)]}
                timing="rt"
                value={2}
                onChange={vi.fn()}
                fasterCount={1}
            />,
        );
        const radios = screen.getAllByRole('radio');
        expect(radios[0].getAttribute('tabindex')).toBe('-1');
        expect(radios[1].getAttribute('tabindex')).toBe('-1');
        expect(radios[2].getAttribute('tabindex')).toBe('0');
    });

    it('ArrowDown moves selection and focus from None onto the first run, wrapping past the last run back to None', () => {
        const onChange = vi.fn();
        render(
            <CutoffPicker
                runs={[row(1, 5_725_000), row(2, 5_728_000)]}
                timing="rt"
                value={null}
                onChange={onChange}
                fasterCount={0}
            />,
        );
        const radios = screen.getAllByRole('radio');
        radios[0].focus();
        fireEvent.keyDown(radios[0], { key: 'ArrowDown' });
        expect(onChange).toHaveBeenCalledWith(1);
        expect(radios[1]).toBe(document.activeElement);

        fireEvent.keyDown(radios[1], { key: 'ArrowDown' });
        expect(onChange).toHaveBeenCalledWith(2);
        expect(radios[2]).toBe(document.activeElement);

        onChange.mockClear();
        fireEvent.keyDown(radios[2], { key: 'ArrowDown' });
        // Wraps from the last run back to the pinned None row.
        expect(onChange).toHaveBeenCalledWith(null);
        expect(radios[0]).toBe(document.activeElement);
    });

    it('ArrowUp wraps from None back onto the last run', () => {
        const onChange = vi.fn();
        render(
            <CutoffPicker
                runs={[row(1, 5_725_000), row(2, 5_728_000)]}
                timing="rt"
                value={null}
                onChange={onChange}
                fasterCount={0}
            />,
        );
        const radios = screen.getAllByRole('radio');
        radios[0].focus();
        fireEvent.keyDown(radios[0], { key: 'ArrowUp' });
        expect(onChange).toHaveBeenCalledWith(2);
        expect(radios[2]).toBe(document.activeElement);
    });
});

describe('ReasonZone', () => {
    it('shows calm labels: "Reason" + helper text when required', () => {
        render(
            <ReasonZone
                reason=""
                onReasonChange={vi.fn()}
                required
                minLength={10}
            />,
        );
        expect(screen.getByLabelText('Reason')).toBeTruthy();
        expect(
            screen.getByText('Required. Min 10 characters. Audit-logged.'),
        ).toBeTruthy();
    });

    it('labels the field "Note" when optional', () => {
        render(
            <ReasonZone
                reason=""
                onReasonChange={vi.fn()}
                required={false}
                minLength={10}
            />,
        );
        expect(screen.getByLabelText('Note')).toBeTruthy();
        expect(screen.getByText('Optional. Audit-logged.')).toBeTruthy();
    });

    it('shows the shortfall count for a too-short required reason', () => {
        render(
            <ReasonZone
                reason="short"
                onReasonChange={vi.fn()}
                required
                minLength={10}
            />,
        );
        expect(screen.getByText('5 more needed.')).toBeTruthy();
    });

    it('renders category select + notify switch when given', () => {
        const onNotifyChange = vi.fn();
        render(
            <ReasonZone
                category={{
                    value: 'cheating',
                    onChange: vi.fn(),
                    notify: true,
                    onNotifyChange,
                }}
                reason=""
                onReasonChange={vi.fn()}
                required
                minLength={10}
            />,
        );
        expect(
            screen.getByLabelText('Why are you removing this?'),
        ).toBeTruthy();
        const toggle = screen.getByLabelText(
            'Notify the runner and allow an appeal',
        );
        fireEvent.click(toggle);
        expect(onNotifyChange).toHaveBeenCalledWith(false);
    });

    it('hides the notify switch when notify is null', () => {
        render(
            <ReasonZone
                category={{
                    value: 'cheating',
                    onChange: vi.fn(),
                    notify: null,
                    onNotifyChange: vi.fn(),
                }}
                reason=""
                onReasonChange={vi.fn()}
                required
                minLength={10}
            />,
        );
        expect(screen.queryByLabelText(/Notify the runner/)).toBeNull();
    });
});
