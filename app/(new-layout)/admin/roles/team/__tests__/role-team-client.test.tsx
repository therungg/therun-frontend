// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    assignGlobalAdminAction,
    revokeRoleAssignmentAction,
    addGameModeratorAction,
    removeGameModeratorAction,
    listGameModerators,
    searchGames,
} = vi.hoisted(() => ({
    assignGlobalAdminAction: vi.fn(),
    revokeRoleAssignmentAction: vi.fn(),
    addGameModeratorAction: vi.fn(),
    removeGameModeratorAction: vi.fn(),
    listGameModerators: vi.fn(),
    searchGames: vi.fn(),
}));

vi.mock('../../../role-assignments/actions/assign-global-admin.action', () => ({
    assignGlobalAdminAction,
}));
vi.mock(
    '../../../role-assignments/actions/revoke-role-assignment.action',
    () => ({ revokeRoleAssignmentAction }),
);
vi.mock(
    '../../../../games-v2/[game]/setup/actions/manage-moderators.action',
    () => ({ addGameModeratorAction, removeGameModeratorAction }),
);
vi.mock('~src/lib/game-moderators', () => ({ listGameModerators }));
vi.mock('~src/lib/game-search', () => ({ searchGames }));
vi.mock('react-toastify', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

import { RoleTeamClient } from '../role-team-client';

describe('RoleTeamClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal(
            'confirm',
            vi.fn(() => true),
        );
    });

    it('renders the three tiers', () => {
        const { container } = render(
            <RoleTeamClient siteAdmins={[]} globalAdmins={[]} />,
        );
        expect(
            container.querySelector('[data-tier="site-admins"]'),
        ).toBeTruthy();
        expect(
            container.querySelector('[data-tier="global-admins"]'),
        ).toBeTruthy();
        expect(container.querySelector('[data-tier="game-team"]')).toBeTruthy();
    });

    it('lists site admins read-only (no revoke control in that section)', () => {
        const { container } = render(
            <RoleTeamClient
                siteAdmins={[{ id: 1, username: 'alice' }]}
                globalAdmins={[]}
            />,
        );
        const section = container.querySelector(
            '[data-tier="site-admins"]',
        ) as HTMLElement;
        expect(section).toBeTruthy();
        expect(section.textContent).toContain('alice');
        expect(section.querySelector('button')).toBeNull();
    });

    it('grants a global-admin and appends the row', async () => {
        assignGlobalAdminAction.mockResolvedValue({
            id: 42,
            userId: 7,
            username: 'bob',
        });
        const { container } = render(
            <RoleTeamClient siteAdmins={[]} globalAdmins={[]} />,
        );

        const section = container.querySelector(
            '[data-tier="global-admins"]',
        ) as HTMLElement;
        const input = section.querySelector(
            'input[type="text"]',
        ) as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'bob' } });
        fireEvent.click(
            screen.getByRole('button', { name: /grant global-admin/i }),
        );

        await waitFor(() =>
            expect(assignGlobalAdminAction).toHaveBeenCalledWith('bob'),
        );
        await waitFor(() => expect(section.textContent).toContain('bob'));
    });
});
