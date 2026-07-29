import { describe, expect, it } from 'vitest';
import {
    buildNav,
    defaultItem,
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
});

describe('defaultItem', () => {
    it('skips the setup wizard — it navigates away instead of rendering a pane', () => {
        const groups = buildNav({ ...NO_FLAGS, canConfigure: true });
        // 'setup' is first in the Game group, which is this viewer's first
        // group; the landing pane must be the first item that can render.
        expect(defaultItem(groups)).toBe('game-details');
    });

    it('lands a moderator on Needs attention', () => {
        expect(defaultItem(buildNav({ ...NO_FLAGS, canModerate: true }))).toBe(
            'attention',
        );
    });

    it('returns null when the viewer has no items at all', () => {
        expect(defaultItem(buildNav(NO_FLAGS))).toBeNull();
    });
});

describe('showSetupCard', () => {
    it('shows on a Board-group pane', () => {
        const groups = buildNav({ ...NO_FLAGS, canConfigure: true });
        expect(showSetupCard(groups, 'game-details')).toBe(true);
        expect(showSetupCard(groups, 'groups')).toBe(true);
    });

    it("shows on this viewer's default landing pane even outside the game group", () => {
        const groups = buildNav({ ...NO_FLAGS, canModerate: true });
        // Landing pane for a moderator is 'attention' (moderate group is first).
        expect(showSetupCard(groups, 'attention')).toBe(true);
    });

    it('hides on a non-default triage pane', () => {
        const groups = buildNav({ ...NO_FLAGS, canModerate: true });
        expect(showSetupCard(groups, 'bans')).toBe(false);
    });

    it('hides on a triage pane that is not the landing default', () => {
        const groups = buildNav({
            ...NO_FLAGS,
            canModerate: true,
            canConfigure: true,
        });
        // Landing pane is 'attention' (moderate group first); 'bans' is
        // neither that nor a board pane, so the nag stays out of the queue.
        expect(showSetupCard(groups, 'bans')).toBe(false);
    });

    it('shows when nothing is active yet', () => {
        expect(showSetupCard([], null)).toBe(true);
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

    it('rejects history, roster, and reports even though they are visible items', () => {
        expect(isLandingPaneId('history', visible)).toBe(false);
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
        expect(resolveInitialPane('bans', 'attention', groups)).toBe('bans');
    });

    it('falls back to the stored pane when the URL carries none', () => {
        expect(resolveInitialPane(null, 'bans', groups)).toBe('bans');
    });

    it('ignores an invalid stored pane and falls back to the default', () => {
        expect(resolveInitialPane(null, 'not-a-pane', groups)).toBe(
            'attention',
        );
    });

    it('the URL always wins over a conflicting stored pane', () => {
        expect(resolveInitialPane('bans', 'attention', groups)).toBe('bans');
    });

    it('an invalid ?pane= falls through to the default, not the stored pane — storage is only consulted when the URL carries none', () => {
        expect(resolveInitialPane('not-a-pane', 'bans', groups)).toBe(
            'attention',
        );
    });

    it('rejects overlay/redirect ids from both the URL and storage', () => {
        expect(resolveInitialPane('history', 'reports', groups)).toBe(
            'attention',
        );
    });

    it('rejects setup from both the URL and storage', () => {
        const configurerGroups = buildNav({ ...NO_FLAGS, canConfigure: true });
        expect(resolveInitialPane('setup', null, configurerGroups)).toBe(
            'game-details',
        );
        expect(resolveInitialPane(null, 'setup', configurerGroups)).toBe(
            'game-details',
        );
    });

    it('falls back to the default landing pane when nothing is valid', () => {
        expect(resolveInitialPane(null, null, groups)).toBe('attention');
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

    it('shows twelve items to a fully privileged viewer', () => {
        expect(buildNav(ALL).flatMap((g) => g.items)).toHaveLength(12);
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
