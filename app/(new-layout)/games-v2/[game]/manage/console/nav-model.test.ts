import { describe, expect, it } from 'vitest';
import {
    buildNav,
    type NavFlags,
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
