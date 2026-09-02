import { describe, expect, it } from 'vitest';
import {
    buildFooterNav,
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

const ALL: NavFlags = {
    canModerate: true,
    canEditStandards: true,
    canConfigure: true,
    canReassign: true,
    canEditMods: true,
};

const ids = (flags: NavFlags) =>
    buildNav(flags)
        .flatMap((g) => g.items)
        .map((it) => it.id as string);

describe('sidebarActiveItem', () => {
    it('maps the front door (null) to the Overview item', () => {
        expect(sidebarActiveItem(null, null)).toBe('overview');
    });

    it('highlights Needs attention even when filtered to reports', () => {
        // The Reports nav item is retired; kind=report is just a filter now.
        expect(sidebarActiveItem('attention', 'report')).toBe('attention');
    });

    it('leaves other panes untouched regardless of kind', () => {
        expect(sidebarActiveItem('bans', 'report')).toBe('bans');
    });
});

describe('buildNav', () => {
    it('groups by frequency: overview, queue, structure, game', () => {
        expect(buildNav(ALL).map((g) => g.id)).toEqual([
            'overview',
            'moderate',
            'structure',
            'game',
        ]);
    });

    it('puts daily curation first in Structure and admin last in Game', () => {
        const byId = new Map(buildNav(ALL).map((g) => [g.id, g.items]));
        expect(byId.get('structure')?.map((i) => i.id)).toEqual([
            'boards',
            'categories',
            'groups',
            'levels',
            'variables',
        ]);
        expect(byId.get('game')?.map((i) => i.id)).toEqual([
            'game-details',
            'theme',
            'moderators',
        ]);
    });

    it('gates theme on the same flag as game details', () => {
        expect(ids({ ...NO_FLAGS, canConfigure: true })).toContain('theme');
        expect(ids({ ...NO_FLAGS, canConfigure: false })).not.toContain(
            'theme',
        );
    });

    it('restores Needs attention to the Queue group for moderators', () => {
        const queue = buildNav({ ...NO_FLAGS, canModerate: true }).find(
            (g) => g.id === 'moderate',
        );
        expect(queue?.items.map((i) => i.id)).toEqual(['attention', 'bans']);
    });

    it('gives Overview to every console viewer and drops it for no-flag viewers', () => {
        expect(ids({ ...NO_FLAGS, canModerate: true })).toContain('overview');
        expect(ids({ ...NO_FLAGS, canConfigure: true })).toContain('overview');
        expect(ids({ ...NO_FLAGS, canEditMods: true })).toContain('overview');
        expect(ids({ ...NO_FLAGS, canReassign: true })).toContain('overview');
        expect(buildNav(NO_FLAGS)).toEqual([]);
    });

    it('leaves setup, history and level-categories out of the groups', () => {
        for (const gone of ['setup', 'history', 'level-categories']) {
            expect(ids(ALL), gone).not.toContain(gone);
        }
    });

    it('keeps the retired per-category and triage ids out', () => {
        for (const retired of [
            'standards',
            'timing',
            'rules',
            'combinations',
            'category-settings',
            'roster',
            'reports',
        ]) {
            expect(ids(ALL), retired).not.toContain(retired);
        }
    });

    it('shows boards and categories to moderate-only and configure-only viewers alike', () => {
        for (const item of ['boards', 'categories']) {
            expect(ids({ ...NO_FLAGS, canModerate: true })).toContain(item);
            expect(ids({ ...NO_FLAGS, canConfigure: true })).toContain(item);
        }
        expect(ids(NO_FLAGS)).not.toContain('boards');
    });

    it('keeps import out for every viewer while the door is pulled', () => {
        expect(ids(ALL)).not.toContain('import');
        expect(ids({ ...NO_FLAGS, canModerate: true })).not.toContain('import');
        expect(ids({ ...NO_FLAGS, canConfigure: true })).not.toContain(
            'import',
        );
    });

    it('keeps structure editing (groups, levels, variables) to configurers', () => {
        const modOnly = ids({ ...NO_FLAGS, canModerate: true });
        for (const item of ['groups', 'levels', 'variables']) {
            expect(modOnly, item).not.toContain(item);
            expect(ids({ ...NO_FLAGS, canConfigure: true })).toContain(item);
        }
    });

    it('gates moderators on its own flag', () => {
        expect(ids({ ...NO_FLAGS, canEditMods: true })).toContain('moderators');
        expect(ids({ ...NO_FLAGS, canConfigure: true })).not.toContain(
            'moderators',
        );
    });

    it('hides reassign/merge even with the flag (temporarily disabled)', () => {
        expect(ids({ ...NO_FLAGS, canReassign: true })).not.toContain(
            'reassign',
        );
        expect(ids(ALL)).not.toContain('reassign');
    });
});

describe('buildFooterNav', () => {
    it('gives a configurer the setup wizard and a moderator the history overlay', () => {
        expect(buildFooterNav(ALL).map((i) => i.id)).toEqual([
            'setup',
            'history',
        ]);
        expect(
            buildFooterNav({ ...NO_FLAGS, canConfigure: true }).map(
                (i) => i.id,
            ),
        ).toEqual(['setup']);
        expect(
            buildFooterNav({ ...NO_FLAGS, canModerate: true }).map((i) => i.id),
        ).toEqual(['history']);
        expect(buildFooterNav(NO_FLAGS)).toEqual([]);
    });
});

describe('showSetupCard', () => {
    it('shows on Structure and Game panes', () => {
        const groups = buildNav({ ...NO_FLAGS, canConfigure: true });
        expect(showSetupCard(groups, 'game-details')).toBe(true);
        expect(showSetupCard(groups, 'groups')).toBe(true);
        expect(showSetupCard(groups, 'boards')).toBe(true);
    });

    it('hides on triage panes and the front door', () => {
        const groups = buildNav({ ...NO_FLAGS, canModerate: true });
        expect(showSetupCard(groups, 'attention')).toBe(false);
        expect(showSetupCard(groups, 'bans')).toBe(false);
        expect(showSetupCard(groups, null)).toBe(false);
        expect(showSetupCard([], null)).toBe(false);
    });
});

describe('isLandingPaneId', () => {
    const visible = buildNav({ ...NO_FLAGS, canModerate: true })
        .flatMap((g) => g.items)
        .map((it) => it.id);

    it('accepts a visible pane id', () => {
        expect(isLandingPaneId('bans', visible)).toBe(true);
    });

    it('rejects overview — the front door is null, not a pane', () => {
        expect(isLandingPaneId('overview', visible)).toBe(false);
    });

    it('rejects history, roster, reports and setup', () => {
        for (const id of ['history', 'roster', 'reports', 'setup']) {
            expect(isLandingPaneId(id, visible), id).toBe(false);
        }
    });

    it('rejects null/undefined/empty and invisible ids', () => {
        expect(isLandingPaneId(null, visible)).toBe(false);
        expect(isLandingPaneId(undefined, visible)).toBe(false);
        expect(isLandingPaneId('', visible)).toBe(false);
        expect(isLandingPaneId('groups', visible)).toBe(false);
    });
});

describe('resolveInitialPane', () => {
    const modFlags = { ...NO_FLAGS, canModerate: true };
    const groups = buildNav(modFlags);

    it('a valid ?pane= deep link wins outright', () => {
        expect(resolveInitialPane('bans', groups, modFlags)).toBe('bans');
        expect(resolveInitialPane('attention', groups, modFlags)).toBe(
            'attention',
        );
    });

    it('a bare URL and junk land on the overview (null)', () => {
        expect(resolveInitialPane(null, groups, modFlags)).toBeNull();
        expect(resolveInitialPane('not-a-pane', groups, modFlags)).toBeNull();
        expect(resolveInitialPane('overview', groups, modFlags)).toBeNull();
    });

    it('rejects overlay/redirect ids and panes the viewer cannot see', () => {
        expect(resolveInitialPane('history', groups, modFlags)).toBeNull();
        expect(resolveInitialPane('setup', groups, modFlags)).toBeNull();
        expect(resolveInitialPane('groups', groups, modFlags)).toBeNull();
    });

    it('keeps level-categories deep links landing for configurers — the item merged into Levels', () => {
        const configurerFlags = { ...NO_FLAGS, canConfigure: true };
        expect(
            resolveInitialPane(
                'level-categories',
                buildNav(configurerFlags),
                configurerFlags,
            ),
        ).toBe('level-categories');
        expect(
            resolveInitialPane('level-categories', groups, modFlags),
        ).toBeNull();
    });
});
