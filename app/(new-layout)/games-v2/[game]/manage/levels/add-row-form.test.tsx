// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddRowForm } from './add-row-form';

afterEach(cleanup);

describe('AddRowForm', () => {
    it('submits the trimmed name and clears the input', () => {
        const onAdd = vi.fn();
        render(
            <AddRowForm
                label="Add a level"
                placeholder="E1M1"
                pending={false}
                onAdd={onAdd}
            />,
        );
        const input = screen.getByPlaceholderText('E1M1') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '  E1M1  ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Add a level' }));

        expect(onAdd).toHaveBeenCalledWith('E1M1');
        expect(input.value).toBe('');
    });

    it('submits on Enter', () => {
        const onAdd = vi.fn();
        render(
            <AddRowForm
                label="Add a level"
                placeholder="E1M1"
                pending={false}
                onAdd={onAdd}
            />,
        );
        const input = screen.getByPlaceholderText('E1M1');
        fireEvent.change(input, { target: { value: 'E1M2' } });
        fireEvent.submit(input.closest('form') as HTMLFormElement);
        expect(onAdd).toHaveBeenCalledWith('E1M2');
    });

    it('does nothing on an empty or whitespace-only name', () => {
        const onAdd = vi.fn();
        render(
            <AddRowForm
                label="Add a level"
                placeholder="E1M1"
                pending={false}
                onAdd={onAdd}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Add a level' }));
        expect(onAdd).not.toHaveBeenCalled();
    });

    it('disables the input and button while pending', () => {
        render(
            <AddRowForm
                label="Add a level"
                placeholder="E1M1"
                pending
                onAdd={vi.fn()}
            />,
        );
        expect(
            (screen.getByPlaceholderText('E1M1') as HTMLInputElement).disabled,
        ).toBe(true);
        expect(
            (
                screen.getByRole('button', {
                    name: 'Add a level',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
    });
});
