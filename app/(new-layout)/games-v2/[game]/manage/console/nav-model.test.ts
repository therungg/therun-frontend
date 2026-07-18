import { describe, expect, it } from 'vitest';
import {
    buildNav,
    isLandingPaneId,
    type NavFlags,
    resolveCategoryId,
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
    it('makes Minimum time category-scoped so it uses the shared picker', () => {
        const groups = buildNav({ ...NO_FLAGS, canModerate: true });
        const standards = groups
            .flatMap((g) => g.items)
            .find((it) => it.id === 'standards');
        expect(standards?.categoryScoped).toBe(true);
    });
});

describe('showSetupCard', () => {
    it('shows on a Game-group pane', () => {
        const groups = buildNav({ ...NO_FLAGS, canConfigure: true });
        expect(showSetupCard(groups, 'game-details')).toBe(true);
        expect(showSetupCard(groups, 'identifiers')).toBe(true);
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

    it('hides on a per-category pane that is not the landing default', () => {
        const groups = buildNav({ ...NO_FLAGS, canConfigure: true });
        // Landing pane is 'game-details' (game group is first once moderate
        // is filtered out) — 'timing' is per-category, not game-group.
        expect(showSetupCard(groups, 'timing')).toBe(false);
    });

    it('shows when nothing is active yet', () => {
        expect(showSetupCard([], null)).toBe(true);
    });

    it('hides when the game group does not exist for this viewer', () => {
        const groups = buildNav({ ...NO_FLAGS, canModerate: true });
        // No 'game' group present at all (only 'moderate') — a non-default,
        // non-game pane must not crash on the missing group.
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

    it('falls back to the default landing pane when nothing is valid', () => {
        expect(resolveInitialPane(null, null, groups)).toBe('attention');
    });
});

describe('resolveCategoryId', () => {
    const categories = [{ id: 1 }, { id: 2 }, { id: 3 }];

    it('accepts a requested id that exists in the category list', () => {
        expect(resolveCategoryId('2', categories, 1)).toBe(2);
    });

    it('falls back when the requested id is absent', () => {
        expect(resolveCategoryId(null, categories, 1)).toBe(1);
    });

    it('falls back when the requested id is not a number', () => {
        expect(resolveCategoryId('not-a-number', categories, 1)).toBe(1);
    });

    it("falls back when the requested id doesn't belong to this game", () => {
        expect(resolveCategoryId('999', categories, 1)).toBe(1);
    });

    it('the fallback may itself be null', () => {
        expect(resolveCategoryId(null, categories, null)).toBeNull();
    });
});
