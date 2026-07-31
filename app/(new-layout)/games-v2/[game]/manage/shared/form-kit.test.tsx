// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InlineError, SegmentedControl, SwitchField } from './form-kit';

describe('SegmentedControl', () => {
    const options = [
        { value: 'asc', label: 'Lower is better' },
        { value: 'desc', label: 'Higher is better' },
    ];

    it('marks the current value checked and fires onChange for the other', () => {
        const onChange = vi.fn();
        render(
            <SegmentedControl
                label="Ranking direction"
                value="asc"
                options={options}
                onChange={onChange}
            />,
        );
        const group = screen.getByRole('radiogroup', {
            name: 'Ranking direction',
        });
        expect(group).toBeInTheDocument();
        expect(
            screen.getByRole('radio', { name: 'Lower is better' }),
        ).toHaveAttribute('aria-checked', 'true');
        fireEvent.click(
            screen.getByRole('radio', { name: 'Higher is better' }),
        );
        expect(onChange).toHaveBeenCalledWith('desc');
    });

    it('does not fire onChange when disabled', () => {
        const onChange = vi.fn();
        render(
            <SegmentedControl
                label="Ranking direction"
                value="asc"
                options={options}
                onChange={onChange}
                disabled
            />,
        );
        fireEvent.click(
            screen.getByRole('radio', { name: 'Higher is better' }),
        );
        expect(onChange).not.toHaveBeenCalled();
    });
});

describe('SwitchField', () => {
    it('toggles', () => {
        const onChange = vi.fn();
        render(
            <SwitchField
                id="show-ms"
                label="Show milliseconds"
                checked={false}
                onChange={onChange}
            />,
        );
        fireEvent.click(screen.getByRole('switch', { name: /milliseconds/i }));
        expect(onChange).toHaveBeenCalledWith(true);
    });
});

describe('InlineError', () => {
    it('renders nothing when empty', () => {
        const { container } = render(<InlineError>{null}</InlineError>);
        expect(container).toBeEmptyDOMElement();
    });
    it('renders the message with role alert', () => {
        render(<InlineError>Nope.</InlineError>);
        expect(screen.getByRole('alert')).toHaveTextContent('Nope.');
    });
});
