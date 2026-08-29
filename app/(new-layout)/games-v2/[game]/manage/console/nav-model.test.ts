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
        // `variables` is deliberately absent from this list: it came back as
        // a board-wide pane (the wizard's grid), not as the per-category
        // editor these ids used to open.
        for (const retired of [
            'standards',
            'timing',
            'rules',
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

    it('hides on the front door — BoardOverview renders the card in its own rail', () => {
        expect(showSetupCard([], null)).toBe(false);
        expect(
            showSetupCard(buildNav({ ...NO_FLAGS, canModerate: true }), null),
        ).toBe(false);
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
    const modFlags = { ...NO_FLAGS, canModerate: true };
    const groups = buildNav(modFlags);

    it('a valid ?pane= deep link wins outright', () => {
        expect(resolveInitialPane('bans', groups, modFlags)).toBe('bans');
    });

    it('a bare URL lands on the tile grid, not a default pane', () => {
        expect(resolveInitialPane(null, groups, modFlags)).toBeNull();
    });

    it('an unrecognised ?pane= lands on the tile grid', () => {
        expect(resolveInitialPane('not-a-pane', groups, modFlags)).toBeNull();
    });

    it('a pane this viewer cannot see lands on the tile grid', () => {
        // 'game-details' needs canConfigure, which this viewer lacks.
        expect(resolveInitialPane('game-details', groups, modFlags)).toBeNull();
    });

    it('rejects overlay and redirect ids', () => {
        expect(resolveInitialPane('history', groups, modFlags)).toBeNull();
        expect(resolveInitialPane('roster', groups, modFlags)).toBeNull();
        expect(resolveInitialPane('reports', groups, modFlags)).toBeNull();
    });

    it('rejects the setup wizard — a hand-typed ?pane=setup must not select it', () => {
        const configurerFlags = { ...NO_FLAGS, canConfigure: true };
        expect(
            resolveInitialPane(
                'setup',
                buildNav(configurerFlags),
                configurerFlags,
            ),
        ).toBeNull();
    });

    it('lands a viewer with no visible items on the tile grid', () => {
        expect(
            resolveInitialPane(null, buildNav(NO_FLAGS), NO_FLAGS),
        ).toBeNull();
    });

    it('accepts attention as a hidden landing pane for a moderator — deep links must keep working while it is out of the nav', () => {
        expect(resolveInitialPane('attention', groups, modFlags)).toBe(
            'attention',
        );
    });

    it('rejects attention for a viewer who cannot moderate', () => {
        const configurerFlags = { ...NO_FLAGS, canConfigure: true };
        expect(
            resolveInitialPane(
                'attention',
                buildNav(configurerFlags),
                configurerFlags,
            ),
        ).toBeNull();
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

    it('shows thirteen items to a fully privileged viewer', () => {
        // Attention, roster and reports are out of the nav for now (see
        // ALL_GROUPS in nav-model.ts).
        expect(buildNav(ALL).flatMap((g) => g.items)).toHaveLength(13);
    });

    it('shows the speedrun.com import to moderators and configurers alike', () => {
        const ids = (flags: NavFlags) =>
            buildNav(flags).flatMap((g) => g.items.map((i) => i.id));
        expect(ids({ ...NO_FLAGS, canModerate: true })).toContain('import');
        expect(ids({ ...NO_FLAGS, canConfigure: true })).toContain('import');
        expect(ids(NO_FLAGS)).not.toContain('import');
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
        expect(board?.items.slice(0, 8).map((i) => i.id)).toEqual([
            'setup',
            'game-details',
            'categories',
            'groups',
            // Levels and their categories sit with the groups they are
            // built from, before the board-wide structure grid.
            'levels',
            'level-categories',
            'variables',
            'boards',
        ]);
    });

    it('gives the category index to a moderator who cannot configure', () => {
        const ids = buildNav({ ...NO_FLAGS, canModerate: true })
            .flatMap((g) => g.items)
            .map((it) => it.id);
        expect(ids).toContain('categories');
    });

    it('keeps subcategories & filters to viewers who can configure', () => {
        // Editing a bucket relocates existing runs, so this is a configure
        // surface — a moderator without it gets the category index and
        // Minimum time, and nothing structural.
        const modOnly = buildNav({ ...NO_FLAGS, canModerate: true })
            .flatMap((g) => g.items)
            .map((it) => it.id);
        expect(modOnly).not.toContain('variables');

        const configurer = buildNav({ ...NO_FLAGS, canConfigure: true })
            .flatMap((g) => g.items)
            .map((it) => it.id);
        expect(configurer).toContain('variables');
    });

    it('lets ?pane=variables land, unlike the wizard door beside it', () => {
        const visible = buildNav(ALL)
            .flatMap((g) => g.items)
            .map((it) => it.id);
        expect(isLandingPaneId('variables', visible)).toBe(true);
        // The neighbouring Board item leaves the console entirely.
        expect(isLandingPaneId('setup', visible)).toBe(false);
    });
});

describe('levels nav items', () => {
    it('gives both levels items to a viewer who can configure', () => {
        const ids = buildNav({ ...NO_FLAGS, canConfigure: true })
            .flatMap((g) => g.items)
            .map((it) => it.id);
        expect(ids).toContain('levels');
        expect(ids).toContain('level-categories');
    });

    it('keeps them from a moderator who cannot configure', () => {
        // Materialising boards and editing a template rewrites every level's
        // board — a configure surface, like the structure grid beside it.
        const ids = buildNav({ ...NO_FLAGS, canModerate: true })
            .flatMap((g) => g.items)
            .map((it) => it.id);
        expect(ids).not.toContain('levels');
        expect(ids).not.toContain('level-categories');
    });

    it('lets both land as ?pane= deep links', () => {
        const visible = buildNav({ ...NO_FLAGS, canConfigure: true })
            .flatMap((g) => g.items)
            .map((it) => it.id);
        expect(isLandingPaneId('levels', visible)).toBe(true);
        expect(isLandingPaneId('level-categories', visible)).toBe(true);
    });
});
