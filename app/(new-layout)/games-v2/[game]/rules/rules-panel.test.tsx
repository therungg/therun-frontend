// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RulesBody, RulesPanel } from './rules-panel';

afterEach(() => {
    cleanup();
});

describe('RulesPanel', () => {
    it('renders nothing when both category rules and game rules are empty', () => {
        const { container } = render(
            <RulesPanel
                rules={null}
                gameRules={null}
                open={false}
                onToggle={vi.fn()}
            />,
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when both are whitespace-only', () => {
        const { container } = render(
            <RulesPanel
                rules="   "
                gameRules="  "
                open={false}
                onToggle={vi.fn()}
            />,
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders with an excerpt when only category rules are present', () => {
        render(
            <RulesPanel
                rules="No save states allowed."
                gameRules={null}
                open={false}
                onToggle={vi.fn()}
            />,
        );
        expect(screen.getByText('Rules')).toBeTruthy();
        expect(screen.getByText('No save states allowed.')).toBeTruthy();
    });

    it('renders even when only game rules are present (category has none)', () => {
        render(
            <RulesPanel
                rules={null}
                gameRules="No cheating."
                open={false}
                onToggle={vi.fn()}
            />,
        );
        expect(screen.getByText('Rules')).toBeTruthy();
        // The excerpt is category-rules-only — with no category rules there
        // is nothing to excerpt.
        expect(screen.queryByText('No cheating.')).toBeNull();
    });

    it('still shows the category-rules excerpt when both are present', () => {
        render(
            <RulesPanel
                rules="Category specific rule."
                gameRules="Game-wide rule."
                open={false}
                onToggle={vi.fn()}
            />,
        );
        expect(screen.getByText('Category specific rule.')).toBeTruthy();
        expect(screen.queryByText('Game-wide rule.')).toBeNull();
    });

    it('hides the excerpt while open and calls onToggle on click', () => {
        const onToggle = vi.fn();
        render(
            <RulesPanel
                rules="Category specific rule."
                gameRules={null}
                open={true}
                onToggle={onToggle}
            />,
        );
        expect(screen.queryByText('Category specific rule.')).toBeNull();
        fireEvent.click(screen.getByRole('button'));
        expect(onToggle).toHaveBeenCalledTimes(1);
    });
});

describe('RulesBody', () => {
    it('renders only category rules when game rules are absent', () => {
        render(<RulesBody rules="Category rule text." gameRules={null} />);
        expect(screen.getByText('Category rule text.')).toBeTruthy();
        expect(document.querySelector('hr')).toBeNull();
    });

    it('renders only game rules when category rules are absent', () => {
        render(<RulesBody rules={null} gameRules="Game rule text." />);
        expect(screen.getByText('Game rule text.')).toBeTruthy();
        expect(document.querySelector('hr')).toBeNull();
    });

    it('renders game rules first, then a divider, then category rules when both are present', () => {
        const { container } = render(
            <RulesBody
                rules="Category rule text."
                gameRules="Game rule text."
            />,
        );
        const hr = container.querySelector('hr');
        expect(hr).not.toBeNull();

        const gameEl = screen.getByText('Game rule text.');
        const categoryEl = screen.getByText('Category rule text.');
        // DOM order: game rules -> divider -> category rules.
        expect(
            gameEl.compareDocumentPosition(hr as Element) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(
            (hr as Element).compareDocumentPosition(categoryEl) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    it('renders nothing (empty shell) when neither rules nor game rules are present', () => {
        const { container } = render(
            <RulesBody rules={null} gameRules={null} />,
        );
        expect(container.querySelector('p, hr')).toBeNull();
        expect(container.textContent).toBe('');
    });

    it('shows the "Emulators are allowed." line when policy is allowed', () => {
        render(
            <RulesBody
                rules="Some rule."
                gameRules={null}
                emulatorPolicy="allowed"
            />,
        );
        expect(screen.getByText('Emulators are allowed.')).toBeTruthy();
    });

    it('shows the "Emulators are banned." line when policy is banned', () => {
        render(
            <RulesBody
                rules="Some rule."
                gameRules={null}
                emulatorPolicy="banned"
            />,
        );
        expect(screen.getByText('Emulators are banned.')).toBeTruthy();
    });

    it('shows no emulator line when policy is null', () => {
        render(
            <RulesBody
                rules="Some rule."
                gameRules={null}
                emulatorPolicy={null}
            />,
        );
        expect(screen.queryByText(/Emulators are/)).toBeNull();
    });

    it('shows no emulator line when policy is undefined', () => {
        render(<RulesBody rules="Some rule." gameRules={null} />);
        expect(screen.queryByText(/Emulators are/)).toBeNull();
    });
});
