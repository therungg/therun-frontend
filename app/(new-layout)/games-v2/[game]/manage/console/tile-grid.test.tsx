// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONCEPT_TILE } from '~src/lib/console/vocabulary';
import { buildNav, type NavFlags, type NavGroup } from './nav-model';
import { TileGrid } from './tile-grid';

const NO_FLAGS: NavFlags = {
    canModerate: false,
    canEditStandards: false,
    canConfigure: false,
    canReassign: false,
    canEditMods: false,
};

/** Finds the tile button by its rendered action copy rather than a class name. */
function tileButton(action: string) {
    const el = screen.getByText(action).closest('button');
    if (!el) throw new Error(`No tile button found for action "${action}"`);
    return el;
}

afterEach(() => {
    cleanup();
});

describe('TileGrid permission filtering', () => {
    it('gives a moderator-only viewer the Moderate tiles plus the shared category index, nothing else from Board', () => {
        const groups = buildNav({ ...NO_FLAGS, canModerate: true });
        render(
            <TileGrid
                groups={groups}
                onNavigate={vi.fn()}
                attentionCount={0}
            />,
        );

        expect(screen.queryByText('Moderate')).not.toBeNull();
        expect(
            screen.queryByText(CONCEPT_TILE.attention.action),
        ).not.toBeNull();
        expect(screen.queryByText(CONCEPT_TILE.roster.action)).not.toBeNull();
        expect(screen.queryByText(CONCEPT_TILE.bans.action)).not.toBeNull();
        expect(screen.queryByText(CONCEPT_TILE.history.action)).not.toBeNull();

        // Categories is the one Board item any moderator can reach — see the
        // itemVisible comment in nav-model.ts. Every other Board tile stays gone.
        expect(screen.queryByText('Board')).not.toBeNull();
        expect(
            screen.queryByText(CONCEPT_TILE.categories.action),
        ).not.toBeNull();
        expect(screen.queryByText(CONCEPT_TILE.setup.action)).toBeNull();
        expect(
            screen.queryByText(CONCEPT_TILE['game-details'].action),
        ).toBeNull();
        expect(screen.queryByText(CONCEPT_TILE.groups.action)).toBeNull();
        expect(screen.queryByText(CONCEPT_TILE.moderators.action)).toBeNull();
        expect(screen.queryByText(CONCEPT_TILE.reassign.action)).toBeNull();
    });

    it('gives a configure-only viewer the Board tiles, with the Moderate group gone entirely', () => {
        const groups = buildNav({ ...NO_FLAGS, canConfigure: true });
        render(
            <TileGrid
                groups={groups}
                onNavigate={vi.fn()}
                attentionCount={0}
            />,
        );

        expect(screen.queryByText('Moderate')).toBeNull();
        expect(screen.queryByText(CONCEPT_TILE.attention.action)).toBeNull();
        expect(screen.queryByText(CONCEPT_TILE.roster.action)).toBeNull();
        expect(screen.queryByText(CONCEPT_TILE.bans.action)).toBeNull();
        expect(screen.queryByText(CONCEPT_TILE.history.action)).toBeNull();

        expect(screen.queryByText('Board')).not.toBeNull();
        expect(screen.queryByText(CONCEPT_TILE.setup.action)).not.toBeNull();
        expect(
            screen.queryByText(CONCEPT_TILE['game-details'].action),
        ).not.toBeNull();
        expect(
            screen.queryByText(CONCEPT_TILE.categories.action),
        ).not.toBeNull();
        expect(screen.queryByText(CONCEPT_TILE.groups.action)).not.toBeNull();
        // Neither moderators nor reassign are visible without their own flags.
        expect(screen.queryByText(CONCEPT_TILE.moderators.action)).toBeNull();
        expect(screen.queryByText(CONCEPT_TILE.reassign.action)).toBeNull();
    });
});

describe('TileGrid reports filtering', () => {
    it('never renders a tile for reports even though buildNav includes it for a moderator', () => {
        const groups = buildNav({ ...NO_FLAGS, canModerate: true });
        const moderateGroup = groups.find((g) => g.id === 'moderate');
        // Sanity check: reports really is in the permission-filtered nav —
        // otherwise this test would pass for the wrong reason.
        expect(moderateGroup?.items.some((it) => it.id === 'reports')).toBe(
            true,
        );

        render(
            <TileGrid
                groups={groups}
                onNavigate={vi.fn()}
                attentionCount={0}
            />,
        );

        expect(screen.queryByText('Reports')).toBeNull();
        // 4 Moderate tiles (attention/roster/bans/history) + 1 Board tile
        // (categories) — reports is filtered out by `it.id in CONCEPT_TILE`.
        expect(screen.getAllByRole('button')).toHaveLength(5);
    });
});

describe('TileGrid empty groups', () => {
    it('renders no section or heading for a group whose only item has no CONCEPT_TILE entry', () => {
        const groups: NavGroup[] = [
            {
                id: 'moderate',
                label: 'Moderate',
                items: [{ id: 'reports', label: 'Reports' }],
            },
        ];
        const { container } = render(
            <TileGrid
                groups={groups}
                onNavigate={vi.fn()}
                attentionCount={0}
            />,
        );

        expect(screen.queryByText('Moderate')).toBeNull();
        expect(container.querySelector('section')).toBeNull();
    });
});

describe('TileGrid attention badge', () => {
    it('shows the attention count when there is something to show', () => {
        const groups = buildNav({ ...NO_FLAGS, canModerate: true });
        render(
            <TileGrid
                groups={groups}
                onNavigate={vi.fn()}
                attentionCount={5}
            />,
        );
        expect(
            screen.queryByLabelText('5 items need attention'),
        ).not.toBeNull();
    });

    it('renders no badge on a confirmed zero', () => {
        const groups = buildNav({ ...NO_FLAGS, canModerate: true });
        render(
            <TileGrid
                groups={groups}
                onNavigate={vi.fn()}
                attentionCount={0}
            />,
        );
        expect(screen.queryByLabelText(/items need attention/)).toBeNull();
    });
});

describe('TileGrid moderators count', () => {
    it('shows the pending count only when applications are waiting', () => {
        const groups = buildNav({ ...NO_FLAGS, canEditMods: true });
        render(
            <TileGrid
                groups={groups}
                onNavigate={vi.fn()}
                attentionCount={0}
                pendingApplications={3}
            />,
        );
        expect(
            screen.queryByLabelText('3 moderator applications waiting'),
        ).not.toBeNull();
    });

    it('hides the pending count when no applications are waiting', () => {
        const groups = buildNav({ ...NO_FLAGS, canEditMods: true });
        render(
            <TileGrid
                groups={groups}
                onNavigate={vi.fn()}
                attentionCount={0}
                pendingApplications={0}
            />,
        );
        expect(
            screen.queryByLabelText(/moderator applications waiting/),
        ).toBeNull();
    });
});

describe('TileGrid navigation', () => {
    it('calls onNavigate with the clicked tile nav id', () => {
        const groups = buildNav({ ...NO_FLAGS, canConfigure: true });
        const onNavigate = vi.fn();
        render(
            <TileGrid
                groups={groups}
                onNavigate={onNavigate}
                attentionCount={0}
            />,
        );

        fireEvent.click(tileButton(CONCEPT_TILE.groups.action));

        expect(onNavigate).toHaveBeenCalledTimes(1);
        expect(onNavigate).toHaveBeenCalledWith('groups');
    });
});
