// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { Trophy } from 'react-bootstrap-icons';
import { describe, expect, it, vi } from 'vitest';
import { ConsoleSidebar } from './console-sidebar';

vi.mock('~src/components/link', () => ({
    default: ({ href, children, ...rest }: any) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

const GROUPS = [
    {
        id: 'overview',
        label: '',
        items: [{ id: 'overview', label: 'Overview' }],
    },
    {
        id: 'structure',
        label: 'Structure',
        items: [{ id: 'boards', label: 'Boards' }],
    },
];

describe('ConsoleSidebar', () => {
    it('renders an item as a link when hrefFor provides one, else a button', () => {
        render(
            <ConsoleSidebar
                groups={GROUPS}
                icons={{ boards: Trophy }}
                activeItem="boards"
                onSelect={() => {}}
                hrefFor={(id) => (id === 'boards' ? '?pane=boards' : undefined)}
            />,
        );
        const link = screen.getByRole('link', { name: /Boards/ });
        expect(link.getAttribute('href')).toBe('?pane=boards');
        expect(link.getAttribute('aria-current')).toBe('page');
        expect(screen.getByRole('button', { name: /Overview/ })).toBeTruthy();
    });

    it('skips the caption for an unlabeled group', () => {
        const { container } = render(
            <ConsoleSidebar
                groups={GROUPS}
                icons={{}}
                activeItem={null}
                onSelect={() => {}}
            />,
        );
        expect(screen.getByText('Structure')).toBeTruthy();
        // Only one caption div — the empty label renders nothing.
        expect(
            container.querySelectorAll('[class*="groupLabel"]'),
        ).toHaveLength(1);
    });

    it('renders count badges and status dots from the badges map', () => {
        render(
            <ConsoleSidebar
                groups={[
                    {
                        id: 'g',
                        label: 'G',
                        items: [
                            { id: 'attention', label: 'Needs attention' },
                            { id: 'import', label: 'Import' },
                        ],
                    },
                ]}
                icons={{}}
                activeItem={null}
                onSelect={() => {}}
                badges={{
                    attention: { count: 4 },
                    import: { dot: 'danger' },
                }}
            />,
        );
        expect(screen.getByText('4')).toBeTruthy();
        const dot = screen
            .getByRole('button', { name: /Import/ })
            .querySelector('[data-tone="danger"]');
        expect(dot).toBeTruthy();
    });

    it('gives a status dot a visually-hidden text alternative', () => {
        render(
            <ConsoleSidebar
                groups={[
                    {
                        id: 'g',
                        label: 'G',
                        items: [{ id: 'import', label: 'Import' }],
                    },
                ]}
                icons={{}}
                activeItem={null}
                onSelect={() => {}}
                badges={{
                    import: { dot: 'danger', dotLabel: 'Import failed' },
                }}
            />,
        );
        expect(screen.getByText('Import failed')).toBeTruthy();
    });

    it('suppresses the dot once count is present, even a zero count', () => {
        render(
            <ConsoleSidebar
                groups={[
                    {
                        id: 'g',
                        label: 'G',
                        items: [{ id: 'attention', label: 'Needs attention' }],
                    },
                ]}
                icons={{}}
                activeItem={null}
                onSelect={() => {}}
                badges={{ attention: { count: 0, dot: 'info' } }}
            />,
        );
        const button = screen.getByRole('button', { name: /Needs attention/ });
        expect(button.querySelector('[data-tone="info"]')).toBeNull();
    });

    it('marks a popup footer item with aria-haspopup', () => {
        render(
            <ConsoleSidebar
                groups={GROUPS}
                icons={{}}
                activeItem={null}
                onSelect={() => {}}
                footerItems={[
                    { id: 'history', label: 'History', hasPopup: true },
                ]}
            />,
        );
        expect(
            screen
                .getByRole('button', { name: 'History' })
                .getAttribute('aria-haspopup'),
        ).toBe('dialog');
    });

    it('renders footer items after the groups and routes their clicks through onSelect', () => {
        const onSelect = vi.fn();
        render(
            <ConsoleSidebar
                groups={GROUPS}
                icons={{}}
                activeItem={null}
                onSelect={onSelect}
                footerItems={[{ id: 'history', label: 'History' }]}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'History' }));
        expect(onSelect).toHaveBeenCalledWith('history');
    });
});
