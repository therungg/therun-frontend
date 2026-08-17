// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VariableRow } from '../../../../../types/leaderboards.types';
import { FiltersPopover } from './filters-popover';

const nav = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('next/navigation', () => ({
    usePathname: () => '/games-v2/sm64',
    useSearchParams: () => new URLSearchParams('category=120-star&page=3'),
}));
vi.mock('./use-board-nav', () => ({
    useBoardNav: () => ({
        navigate: nav.navigate,
        isPending: false,
        pendingKey: null,
    }),
}));

const off = {
    verified: false,
    video: null,
    from: null,
    to: null,
    country: null,
};
const facets = { countries: ['DE', 'NL'], minDate: '2019-04-02' };
const route: VariableRow = {
    name: 'Route',
    nameNormalized: 'route',
    role: 'filter',
    values: [['Standard'], ['Cannonless']],
} as VariableRow;

const open = () =>
    fireEvent.click(screen.getByRole('button', { name: /^filters/i }));
const apply = () =>
    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }));

describe('FiltersPopover (sheet with Apply)', () => {
    beforeEach(() => nav.navigate.mockReset());

    it('renders the trigger with no category filters and no count', () => {
        render(
            <FiltersPopover
                defs={[]}
                selectedVarFilters={{}}
                builtins={off}
                facets={facets}
            />,
        );
        const btn = screen.getByRole('button', { name: /^filters/i });
        expect(btn.textContent).not.toMatch(/\d/);
    });

    it('badge counts applied built-ins + category filter values', () => {
        render(
            <FiltersPopover
                defs={[route]}
                selectedVarFilters={{ route: 'Standard,Cannonless' }}
                builtins={{ ...off, verified: true, from: '2024-01-01' }}
                facets={facets}
            />,
        );
        expect(
            screen.getByRole('button', { name: /^filters/i }).textContent,
        ).toContain('4');
    });

    it('nothing navigates until Apply; Apply writes everything in one URL and drops page', () => {
        render(
            <FiltersPopover
                defs={[route]}
                selectedVarFilters={{}}
                builtins={off}
                facets={facets}
            />,
        );
        open();
        fireEvent.click(screen.getByRole('radio', { name: /verified only/i }));
        fireEvent.click(screen.getByRole('radio', { name: /^missing$/i }));
        fireEvent.change(screen.getByLabelText(/^from$/i), {
            target: { value: '2024-01-01' },
        });
        fireEvent.change(screen.getByLabelText(/^country$/i), {
            target: { value: 'NL' },
        });
        fireEvent.click(screen.getByRole('button', { name: /^cannonless$/i }));
        expect(nav.navigate).not.toHaveBeenCalled();
        apply();
        expect(nav.navigate).toHaveBeenCalledTimes(1);
        const [url, key] = nav.navigate.mock.calls[0];
        expect(key).toBe('builtin:apply');
        const sp = new URL(`http://x${url}`).searchParams;
        expect(Object.fromEntries(sp)).toEqual({
            category: '120-star',
            verified: 'true',
            video: 'missing',
            from: '2024-01-01',
            country: 'NL',
            route: 'Cannonless',
        });
    });

    it('Apply is disabled while the draft equals what is applied', () => {
        render(
            <FiltersPopover
                defs={[]}
                selectedVarFilters={{}}
                builtins={{ ...off, video: 'required' }}
                facets={facets}
            />,
        );
        open();
        expect(
            (
                screen.getByRole('button', {
                    name: /^apply$/i,
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
        fireEvent.click(screen.getByRole('radio', { name: /^any$/i }));
        expect(
            (
                screen.getByRole('button', {
                    name: /^apply$/i,
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(false);
    });

    it('Reset filters clears every filter in one navigation', () => {
        render(
            <FiltersPopover
                defs={[route]}
                selectedVarFilters={{ route: 'Standard' }}
                builtins={{ ...off, verified: true, country: 'NL' }}
                facets={facets}
            />,
        );
        open();
        fireEvent.click(screen.getByRole('button', { name: /reset filters/i }));
        expect(nav.navigate).toHaveBeenCalledWith(
            '/games-v2/sm64?category=120-star',
            'builtin:apply',
        );
    });

    it('date inputs carry the facet floor; country lists only facet countries', () => {
        render(
            <FiltersPopover
                defs={[]}
                selectedVarFilters={{}}
                builtins={off}
                facets={facets}
            />,
        );
        open();
        expect((screen.getByLabelText(/^from$/i) as HTMLInputElement).min).toBe(
            '2019-04-02',
        );
        const sel = screen.getByLabelText(/^country$/i) as HTMLSelectElement;
        expect(Array.from(sel.options).map((o) => o.value)).toEqual([
            '',
            'DE',
            'NL',
        ]);
    });

    it('hides the country group when facets are empty; the rest still renders', () => {
        render(
            <FiltersPopover
                defs={[]}
                selectedVarFilters={{}}
                builtins={off}
                facets={{ countries: [], minDate: null }}
            />,
        );
        open();
        expect(screen.queryByLabelText(/^country$/i)).toBeNull();
        expect(
            screen.getByRole('radio', { name: /verified only/i }),
        ).toBeTruthy();
    });
});
