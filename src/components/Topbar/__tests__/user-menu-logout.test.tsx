// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routerPush = vi.fn();
const routerRefresh = vi.fn();
const clearSession = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: routerPush, refresh: routerRefresh }),
    usePathname: () => '/games-v2/Celeste',
}));

vi.mock('~src/components/session-provider', () => ({
    useSessionActions: () => ({ clear: clearSession, refresh: vi.fn() }),
}));

vi.mock('~src/components/patreon/patreon-name', () => ({
    NameAsPatreon: ({ name }: { name: string }) => <span>{name}</span>,
}));

import { UserMenu } from '../UserMenu';

describe('UserMenu logout', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: true, json: async () => null }),
        );
    });

    it('clears the session and stays on the page instead of going home', async () => {
        render(<UserMenu username="joey" />);

        fireEvent.click(screen.getByRole('menuitem', { name: 'Logout' }));

        await waitFor(() => expect(clearSession).toHaveBeenCalled());
        expect(fetch).toHaveBeenCalledWith('/api/logout', { method: 'POST' });
        expect(routerRefresh).toHaveBeenCalled();
        expect(routerPush).not.toHaveBeenCalled();
    });
});
