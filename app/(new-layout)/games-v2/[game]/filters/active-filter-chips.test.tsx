// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActiveFilterChips } from './active-filter-chips';

const nav = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('next/navigation', () => ({
    usePathname: () => '/games-v2/sm64',
    useSearchParams: () =>
        new URLSearchParams(
            'verified=true&video=missing&from=2024-01-01&to=2024-06-30&country=NL&page=2',
        ),
}));
vi.mock('./use-board-nav', () => ({
    useBoardNav: () => ({
        navigate: nav.navigate,
        isPending: false,
        pendingKey: null,
    }),
}));
vi.mock('../leaderboard/country-flag', () => ({
    CountryFlag: () => <span data-testid="flag" />,
}));

const builtins = {
    verified: true,
    video: 'missing' as const,
    from: '2024-01-01',
    to: '2024-06-30',
    country: 'NL',
};

describe('ActiveFilterChips built-ins', () => {
    it('renders one chip per built-in with plain labels', () => {
        render(
            <ActiveFilterChips defs={[]} selected={{}} builtins={builtins} />,
        );
        for (const label of [
            'Verified',
            'No video',
            '2024-01-01 – 2024-06-30',
            'Netherlands',
        ]) {
            expect(
                screen.getByRole('button', {
                    name: new RegExp(`remove .*${label}`, 'i'),
                }),
            ).toBeTruthy();
        }
    });

    it('× on the range chip clears both bounds and page', () => {
        render(
            <ActiveFilterChips defs={[]} selected={{}} builtins={builtins} />,
        );
        fireEvent.click(
            screen.getByRole('button', {
                name: /remove .*2024-01-01 – 2024-06-30/i,
            }),
        );
        expect(nav.navigate).toHaveBeenLastCalledWith(
            '/games-v2/sm64?verified=true&video=missing&country=NL',
            'builtin:range',
        );
    });

    it('renders nothing with no filters at all', () => {
        const { container } = render(
            <ActiveFilterChips
                defs={[]}
                selected={{}}
                builtins={{
                    verified: false,
                    video: null,
                    from: null,
                    to: null,
                    country: null,
                }}
            />,
        );
        expect(container.firstChild).toBeNull();
    });
});
