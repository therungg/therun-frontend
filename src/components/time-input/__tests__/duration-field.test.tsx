// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { DurationField } from '../duration-field';

/** The component is controlled; call sites hold the ms. This mimics one. */
function Harness({
    size = 'lg',
    initial = null,
    onChange,
}: {
    size?: 'lg' | 'sm';
    initial?: number | null;
    onChange?: (ms: number | null) => void;
}) {
    const [ms, setMs] = useState<number | null>(initial);
    return (
        <DurationField
            value={ms}
            onChange={(next) => {
                setMs(next);
                onChange?.(next);
            }}
            size={size}
            aria-label="Time"
        />
    );
}

const field = () => screen.getByLabelText('Time') as HTMLInputElement;

/**
 * Types one key by handing the input what a browser would put there: the
 * current value with the character appended, since the caret is pinned to the
 * end. Backspace is the same event with the last character removed.
 */
function press(key: string) {
    const el = field();
    const next = key === '{Backspace}' ? el.value.slice(0, -1) : el.value + key;
    fireEvent.change(el, { target: { value: next } });
}

function typeKeys(keys: string) {
    for (const ch of keys) press(ch);
}

describe('DurationField', () => {
    test('digits fill from the right', () => {
        render(<Harness />);
        fireEvent.focus(field());
        typeKeys('3548');
        expect(field().value).toBe('35:48');
    });

    test('the readout says what the entry parses as', () => {
        render(<Harness />);
        fireEvent.focus(field());
        typeKeys('3548');
        expect(screen.getByText('= 0:35:48.000')).toBeDefined();
    });

    test('emits milliseconds, never a string', () => {
        const onChange = vi.fn();
        render(<Harness onChange={onChange} />);
        fireEvent.focus(field());
        typeKeys('3548');
        expect(onChange).toHaveBeenLastCalledWith(2_148_000);
    });

    test('the decimal key opens the fraction, which pads right', () => {
        const onChange = vi.fn();
        render(<Harness onChange={onChange} />);
        fireEvent.focus(field());
        typeKeys('3548.6');
        expect(field().value).toBe('35:48.6');
        expect(onChange).toHaveBeenLastCalledWith(2_148_600);
        expect(screen.getByText('= 0:35:48.600')).toBeDefined();
    });

    test('an over-60 segment stays as typed, then settles on blur', () => {
        render(<Harness />);
        fireEvent.focus(field());
        typeKeys('95');
        expect(field().value).toBe('0:95');
        expect(screen.getByText('= 0:01:35.000')).toBeDefined();
        fireEvent.blur(field());
        expect(field().value).toBe('1:35');
    });

    test('backspace pops one digit off the right', () => {
        render(<Harness />);
        fireEvent.focus(field());
        typeKeys('3548');
        press('{Backspace}');
        expect(field().value).toBe('3:54');
    });

    test('a rejected character leaves the value alone', () => {
        render(<Harness />);
        fireEvent.focus(field());
        typeKeys('3548');
        press('x');
        expect(field().value).toBe('35:48');
    });

    test('arrows nudge by a second, with shift by a minute', () => {
        render(<Harness initial={2_148_000} />);
        fireEvent.focus(field());
        fireEvent.keyDown(field(), { key: 'ArrowUp' });
        expect(field().value).toBe('35:49');
        fireEvent.keyDown(field(), { key: 'ArrowUp', shiftKey: true });
        expect(field().value).toBe('36:49');
        fireEvent.keyDown(field(), { key: 'ArrowDown' });
        expect(field().value).toBe('36:48');
    });

    test('paste goes through the text parser', () => {
        const onChange = vi.fn();
        render(<Harness onChange={onChange} />);
        fireEvent.focus(field());
        fireEvent.paste(field(), {
            clipboardData: { getData: () => '1:23:45.678' },
        });
        expect(field().value).toBe('1:23:45.678');
        expect(onChange).toHaveBeenLastCalledWith(5_025_678);
    });

    test('an unparseable paste is ignored rather than shown as an error', () => {
        render(<Harness initial={2_148_000} />);
        fireEvent.focus(field());
        fireEvent.paste(field(), {
            clipboardData: { getData: () => 'not a time' },
        });
        expect(field().value).toBe('35:48');
    });

    test('emptying the field emits null, not zero', () => {
        const onChange = vi.fn();
        render(<Harness initial={4_000} onChange={onChange} />);
        fireEvent.focus(field());
        press('{Backspace}');
        press('{Backspace}');
        expect(field().value).toBe('');
        expect(onChange).toHaveBeenLastCalledWith(null);
        expect(screen.getByText('—')).toBeDefined();
    });

    test('seeds from an external value', () => {
        render(<Harness initial={5_025_678} />);
        expect(field().value).toBe('1:23:45.678');
        expect(screen.getByText('= 1:23:45.678')).toBeDefined();
    });

    test('sm hides the readout until the cell has focus', () => {
        const { container } = render(<Harness size="sm" initial={2_148_000} />);
        const readout = container.querySelector('p');
        expect(readout?.className).not.toMatch(/readoutSmVisible/);
        fireEvent.focus(field());
        expect(readout?.className).toMatch(/readoutSmVisible/);
    });
});
