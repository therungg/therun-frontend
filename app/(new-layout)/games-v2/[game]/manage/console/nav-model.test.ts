import { describe, expect, it } from 'vitest';
import {
    buildNav,
    isLandingPaneId,
    type NavFlags,
    resolveInitialPane,
    showSetupCard,
    sidebarActiveItem,
} from './nav-model';

const NO_FLAGS: NavFlags = {
    canModerate: false,
    canEditStandards: false,
    canConfigure: false,
    canReassign: false,
    canEditMods: false,
};

describe('sidebarActiveItem', () => {
    it('marks Reports current when the attention pane is showing with kind=report', () => {
        expect(sidebarActiveItem('attention', 'report')).toBe('reports');
    });

    it('marks Needs attention current when the attention pane is showing without a kind filter', () => {
        expect(sidebarActiveItem('attention', null)).toBe('attention');
    });

    it('marks Needs attention current when the attention pane is filtered by a non-report kind', () => {
        expect(sidebarActiveItem('attention', 'flag')).toBe('attention');
    });

    it('leaves non-attention panes untouched regardless of kind', () => {
        expect(sidebarActiveItem('bans', 'report')).toBe('bans');
    });

    it('passes null through when nothing is active', () => {
        expect(sidebarActiveItem(null, 'report')).toBeNull();
    });
});

describe('buildNav', () => {
    it('no longer exposes per-category settings as nav items', () => {
        const ids = buildNav({
            canModerate: true,
            canEditStandards: true,
            canConfigure: true,
            canReassign: true,
            canEditMods: true,
        })
            .flatMap((g) => g.items)
            .map((it) => it.id as string);
        for (const retired of [
            'standards',
            'timing',
            'rules',
            'variables',
            'combinations',
            'category-settings',
        ]) {
            expect(ids, retired).not.toContain(retired);
        }
    });

    it('gives a board configurer the setup wizard as the first Board item', () => {
        const groups = buildNav({ ...NO_FLAGS, canConfigure: true });
        const boardGroup = groups.find((g) => g.id === 'board');
        expect(boardGroup?.items[0]?.id).toBe('setup');
    });

    it('hides the setup wizard from a viewer who cannot configure', () => {
        const ids = buildNav({ ...NO_FLAGS, canModerate: true })
            .flatMap((g) => g.items)
            .map((it) => it.id);
        expect(ids).not.toContain('setup');
    });

    it('shows boards to a moderate-only viewer', () => {
        const ids = buildNav({ ...NO_FLAGS, canModerate: true })
            .flatMap((g) => g.items)
            .map((it) => it.id);
        expect(ids).toContain('boards');
    });

    it('shows boards to a configure-only viewer', () => {
        const ids = buildNav({ ...NO_FLAGS, canConfigure: true })
            .flatMap((g) => g.items)
            .map((it) => it.id);
        expect(ids).toContain('boards');
    });

    it('hides boards from a viewer with neither flag', () => {
        const ids = buildNav(NO_FLAGS)
            .flatMap((g) => g.items)
            .map((it) => it.id);
        expect(ids).not.toContain('boards');
    });
});

describe('showSetupCard', () => {
    it('shows on a Board-group pane', () => {
        const groups = buildNav({ ...NO_FLAGS, canConfigure: true });
        expect(showSetupCard(groups, 'game-details')).toBe(true);
        expect(showSetupCard(groups, 'groups')).toBe(true);
    });

    it('hides on a non-default triage pane', () => {
        const groups = buildNav({ ...NO_FLAGS, canModerate: true });
        expect(showSetupCard(groups, 'bans')).toBe(false);
    });

    it('shows on the tile grid — the front door is where a setup nag belongs', () => {
        expect(showSetupCard([], null)).toBe(true);
        expect(
            showSetupCard(buildNav({ ...NO_FLAGS, canModerate: true }), null),
        ).toBe(true);
    });

    it('stays out of every triage pane now that none of them is a default', () => {
        const groups = buildNav({ ...NO_FLAGS, canModerate: true });
        expect(showSetupCard(groups, 'attention')).toBe(false);
        expect(showSetupCard(groups, 'bans')).toBe(false);
    });

    it('hides when the game group does not exist for this viewer', () => {
        const groups = buildNav({ ...NO_FLAGS, canModerate: true });
        // No 'board' group present at all (only 'moderate') — a non-default,
        // non-board pane must not crash on the missing group.
        expect(showSetupCard(groups, 'roster')).toBe(false);
    });
});

describe('isLandingPaneId', () => {
    const visible = buildNav({ ...NO_FLAGS, canModerate: true })
        .flatMap((g) => g.items)
        .map((it) => it.id);

    it('accepts a visible, non-overlay pane id', () => {
        expect(isLandingPaneId('bans', visible)).toBe(true);
    });

    it('rejects history even though it is a visible item', () => {
        expect(isLandingPaneId('history', visible)).toBe(false);
    });

    it('rejects roster and reports — removed from the nav for now, and never landing panes anyway', () => {
        expect(isLandingPaneId('roster', visible)).toBe(false);
        expect(isLandingPaneId('reports', visible)).toBe(false);
    });

    it('rejects the setup wizard — a hand-typed ?pane=setup must not select it', () => {
        const configurerVisible = buildNav({ ...NO_FLAGS, canConfigure: true })
            .flatMap((g) => g.items)
            .map((it) => it.id);
        expect(configurerVisible).toContain('setup');
        expect(isLandingPaneId('setup', configurerVisible)).toBe(false);
    });

    it('rejects an id not visible to this viewer', () => {
        expect(isLandingPaneId('game-details', visible)).toBe(false);
    });

    it('rejects null/undefined/empty', () => {
        expect(isLandingPaneId(null, visible)).toBe(false);
        expect(isLandingPaneId(undefined, visible)).toBe(false);
        expect(isLandingPaneId('', visible)).toBe(false);
    });
});

describe('resolveInitialPane', () => {
    const groups = buildNav({ ...NO_FLAGS, canModerate: true });

    it('a valid ?pane= deep link wins outright', () => {
        expect(resolveInitialPane('bans', groups)).toBe('bans');
    });

    it('a bare URL lands on the tile grid, not a default pane', () => {
        expect(resolveInitialPane(null, groups)).toBeNull();
    });

    it('an unrecognised ?pane= lands on the tile grid', () => {
        expect(resolveInitialPane('not-a-pane', groups)).toBeNull();
    });

    it('a pane this viewer cannot see lands on the tile grid', () => {
        // 'game-details' needs canConfigure, which this viewer lacks.
        expect(resolveInitialPane('game-details', groups)).toBeNull();
    });

    it('rejects overlay and redirect ids', () => {
        expect(resolveInitialPane('history', groups)).toBeNull();
        expect(resolveInitialPane('roster', groups)).toBeNull();
        expect(resolveInitialPane('reports', groups)).toBeNull();
    });

    it('rejects the setup wizard — a hand-typed ?pane=setup must not select it', () => {
        const configurerGroups = buildNav({ ...NO_FLAGS, canConfigure: true });
        expect(resolveInitialPane('setup', configurerGroups)).toBeNull();
    });

    it('lands a viewer with no visible items on the tile grid', () => {
        expect(resolveInitialPane(null, buildNav(NO_FLAGS))).toBeNull();
    });
});

describe('nav shape', () => {
    const ALL: NavFlags = {
        canModerate: true,
        canEditStandards: true,
        canConfigure: true,
        canReassign: true,
        canEditMods: true,
    };

    it('has exactly two groups', () => {
        expect(buildNav(ALL).map((g) => g.id)).toEqual(['moderate', 'board']);
    });

    it('shows nine items to a fully privileged viewer', () => {
        // Was twelve — attention, roster and reports are out of the nav
        // for now (see ALL_GROUPS in nav-model.ts).
        expect(buildNav(ALL).flatMap((g) => g.items)).toHaveLength(9);
    });

    it('no longer exposes the pulled triage entries', () => {
        const ids = buildNav(ALL)
            .flatMap((g) => g.items)
            .map((it) => it.id as string);
        for (const pulled of ['attention', 'roster', 'reports']) {
            expect(ids, pulled).not.toContain(pulled);
        }
    });

    it('orders the board group to match the wizard', () => {
        const board = buildNav(ALL).find((g) => g.id === 'board');
        expect(board?.items.slice(0, 4).map((i) => i.id)).toEqual([
            'setup',
            'game-details',
            'categories',
            'groups',
        ]);
    });

    it('gives the category index to a moderator who cannot configure', () => {
        const ids = buildNav({ ...NO_FLAGS, canModerate: true })
            .flatMap((g) => g.items)
            .map((it) => it.id);
        expect(ids).toContain('categories');
    });
});
