// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';

const mocks = vi.hoisted(() => ({
    loadVariablesAction: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    replaceState: vi.fn(),
}));

vi.mock('../submit/load-variables.action', () => ({
    loadVariablesAction: mocks.loadVariablesAction,
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
    useSearchParams: () => new URLSearchParams(''),
}));

import { SubmitDialogProvider } from './submit-dialog-context';
import { SubmitLink } from './submit-link';

const category = {
    id: 10,
    name: 'any',
    display: 'Any%',
    groupId: null,
    isMain: true,
    archived: false,
    primaryTiming: 'rt',
    hideRealTime: false,
    hideGameTime: true,
    rules: null,
} as unknown as ResolvedCategory;

const groups: ResolvedGroup[] = [];

beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadVariablesAction.mockResolvedValue({
        variables: [],
        reservedParams: [],
        validCombinations: { mode: 'open' },
    });
    vi.spyOn(window.history, 'replaceState').mockImplementation(
        mocks.replaceState,
    );
});
afterEach(cleanup);

function renderWithProvider(search = '') {
    render(
        <SubmitDialogProvider
            game={{ id: 1, name: 'mario64', display: 'Super Mario 64' }}
            categories={[category]}
            groups={groups}
            canModerate={false}
            sessionUsername="joey"
            initialSearch={search}
        >
            <SubmitLink gameSlug="mario64" categorySlug="any">
                Submit a run
            </SubmitLink>
        </SubmitDialogProvider>,
    );
}

describe('SubmitLink inside a provider', () => {
    it('is a real link, so the URL stays shareable', () => {
        renderWithProvider();
        const link = screen.getByRole('link', { name: 'Submit a run' });
        expect(link.getAttribute('href')).toBe(
            '/games-v2/mario64?category=any&submit=1',
        );
    });

    it('opens the dialog on click without navigating', () => {
        renderWithProvider();
        // Nothing is open before the click.
        expect(
            screen.queryByText('Submit a run', { selector: 'h2' }),
        ).toBeNull();

        fireEvent.click(screen.getByRole('link', { name: 'Submit a run' }));

        // The dialog's own heading — it rendered from local state.
        expect(
            screen.getByRole('heading', { name: 'Submit a run' }),
        ).toBeTruthy();
        // This is the whole point: no router navigation, so no RSC round-trip.
        expect(mocks.push).not.toHaveBeenCalled();
        expect(mocks.replace).not.toHaveBeenCalled();
        // The address bar still updates, just without asking the server.
        expect(mocks.replaceState).toHaveBeenCalled();
    });

    it('leaves a cmd-click alone so it opens a new tab', () => {
        renderWithProvider();
        fireEvent.click(screen.getByRole('link', { name: 'Submit a run' }), {
            metaKey: true,
        });
        expect(
            screen.queryByRole('heading', { name: 'Submit a run' }),
        ).toBeNull();
        expect(mocks.replaceState).not.toHaveBeenCalled();
    });

    it('opens straight away for a ?submit=1 deep link', () => {
        renderWithProvider('category=any&submit=1');
        expect(
            screen.getByRole('heading', { name: 'Submit a run' }),
        ).toBeTruthy();
    });
});
