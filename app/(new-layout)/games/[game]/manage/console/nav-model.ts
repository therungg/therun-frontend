// Pure description of the console's sidebar IA + permission-driven visibility.
// No React, no fetching — trivially reasoned about and reused by the shell.

// Import kept first so the labels below can't drift from the wizard's.
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import {
    WORKSPACE_KIND_LABEL,
    type WorkspaceKind,
    type WorkspacePaneId,
    workspacePaneId,
    workspacePaneOf,
    workspaceScreens,
} from '~src/lib/setup/workspace';

export type NavItemId =
    | 'overview'
    | 'mod-queue'
    | 'queue-history'
    | 'auto-verify'
    | 'attention'
    | 'roster'
    | 'reports'
    | 'bans'
    | 'history'
    | 'setup'
    | 'game-details'
    | 'theme'
    | WorkspacePaneId
    | 'boards'
    | 'moderators'
    | 'reassign'
    | 'import'
    | 'match-runners';

export type NavGroupId =
    | 'overview'
    | 'moderate'
    | 'categories'
    | 'levels'
    | 'structure'
    | 'game';

export interface NavItem {
    id: NavItemId;
    label: string;
    /** Reserved/not-yet-built items render a "coming soon" placeholder. */
    reserved?: boolean;
    /** Set when the item's button opens a dialog/drawer rather than
     * navigating — renders `aria-haspopup="dialog"`. */
    hasPopup?: boolean;
}

export interface NavGroup {
    id: NavGroupId;
    label: string;
    items: NavItem[];
}

/** Ability flags resolved server-side and passed in. */
export interface NavFlags {
    canModerate: boolean; // canModerateGame
    canEditStandards: boolean; // same check as canConfigure below — gates Minimum time / Players credited
    canConfigure: boolean; // ability.can('edit','category-settings',{game})
    canReassign: boolean; // ability.can('reassign','reassignment')
    canEditMods: boolean; // ability.can('edit','moderators',{game})
    /** ability.can('moderate','admins') — global admins only. Rides
     * NavFlags for transport; buildNav does not read it. */
    canSiteBan?: boolean;
    /** canSeeBoards — whether the public board pages open for this viewer.
     * Transport only, like canSiteBan: back links go to the game page when
     * false. */
    boardsVisible?: boolean;
}

// Grouped by how often a moderator touches them, not by concept: Overview is
// the front door, Queue is the daily loop, Structure is the board's shape,
// Game is occasional administration. Setup and History are NOT nav items any
// more — Setup leaves the console and History is an overlay, so both live in
// the utility footer (buildFooterNav) where their different behavior is
// visually honest.
function workspaceNavItems(kind: WorkspaceKind): NavItem[] {
    return workspaceScreens(kind).map((s) => ({
        id: workspacePaneId(kind, s.id),
        label: s.label,
    }));
}

const ALL_GROUPS: NavGroup[] = [
    {
        id: 'overview',
        // No caption: the daily loop. Overview is the front door and the
        // mod queue is the one place a moderator goes every day, so the two
        // sit together at the top with the queue's pending count beside it.
        // Needs attention and Bans are off the nav for now; both stay
        // deep-linkable (see hiddenLandingIds) because the overview's KPI,
        // the moderators pane and the old /moderation routes all land there.
        label: '',
        items: [
            { id: 'overview', label: CONCEPT_LABEL.overview },
            { id: 'mod-queue', label: CONCEPT_LABEL['mod-queue'] },
            { id: 'auto-verify', label: CONCEPT_LABEL['auto-verify'] },
        ],
    },
    // The wizard's Categories and Levels steps, one page per screen, in the
    // order the wizard walks them.
    {
        id: 'categories',
        label: WORKSPACE_KIND_LABEL.categories,
        items: workspaceNavItems('categories'),
    },
    {
        id: 'levels',
        label: WORKSPACE_KIND_LABEL.levels,
        items: workspaceNavItems('levels'),
    },
    {
        id: 'structure',
        label: 'Structure',
        items: [{ id: 'boards', label: CONCEPT_LABEL.boards }],
    },
    {
        id: 'game',
        label: 'Game',
        items: [
            { id: 'game-details', label: CONCEPT_LABEL['game-details'] },
            { id: 'theme', label: CONCEPT_LABEL.theme },
            { id: 'moderators', label: CONCEPT_LABEL.moderators },
            { id: 'import', label: CONCEPT_LABEL.import },
            { id: 'match-runners', label: CONCEPT_LABEL['match-runners'] },
            { id: 'reassign', label: CONCEPT_LABEL.reassign },
        ],
    },
];

function anyConsoleAccess(flags: NavFlags): boolean {
    return (
        flags.canModerate ||
        flags.canConfigure ||
        flags.canEditMods ||
        flags.canReassign
    );
}

/**
 * The Categories and Levels settings pages are reachable by ANY moderator —
 * the settings table is worth reading whether or not you may write it. The
 * gating is per cell (category-matrix.tsx), and it is the same gate for every
 * one of them: each of the table's writes, the minimum included, is a
 * `category-settings` edit backend-side. A moderator without that right gets
 * the whole table as text.
 */
function itemVisible(
    groupId: NavGroupId,
    itemId: NavItemId,
    flags: NavFlags,
): boolean {
    if (itemId === 'overview') return anyConsoleAccess(flags);
    // Merging two of this game's boards is a moderator's job on their own
    // game, authorised per game by the backend, so it rides canConfigure
    // rather than canReassign — that grant is site-wide and would advertise
    // Merge on every game to whoever holds it.
    if (itemId === 'reassign') return flags.canConfigure;
    if (itemId === 'moderators') return flags.canEditMods;
    if (
        groupId === 'moderate' ||
        itemId === 'mod-queue' ||
        itemId === 'auto-verify'
    )
        return flags.canModerate;
    // Settings holds Minimum time, which any moderator may set.
    if (itemId === 'categories/settings' || itemId === 'levels/settings') {
        return flags.canConfigure || flags.canModerate;
    }
    // Boards is pulled from the console for now. Hiding it here also drops
    // the `?pane=boards` deep link (resolveInitialPane only accepts visible
    // ids) and the board-overview rail card. Restore by returning
    // `flags.canModerate || flags.canConfigure`.
    if (itemId === 'boards') return false;
    if (itemId === 'import') return flags.canConfigure || flags.canModerate;
    if (itemId === 'match-runners') return flags.canModerate;
    return flags.canConfigure;
}

/**
 * The nav item's full name. Workspace items read "List" or "Settings" under
 * their sidebar heading; anywhere else they need the long label.
 */
export function navItemLongLabel(item: NavItem): string {
    return item.id in CONCEPT_LABEL
        ? CONCEPT_LABEL[item.id as keyof typeof CONCEPT_LABEL]
        : item.label;
}

/**
 * The first page of a kind this viewer can open, or null. A moderator who
 * cannot configure sees only Settings, so a link to "Categories" must not
 * assume the List page.
 */
export function firstWorkspacePane(
    groups: NavGroup[],
    kind: WorkspaceKind,
): NavItemId | null {
    return groups.find((g) => g.id === kind)?.items[0]?.id ?? null;
}

/** Returns only the groups/items the viewer may use; drops empty groups. */
export function buildNav(flags: NavFlags): NavGroup[] {
    return ALL_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((it) => itemVisible(g.id, it.id, flags)),
    })).filter((g) => g.items.length > 0);
}

/** The utility footer under the nav: doors that are not panes. Setup leaves
 * the console for the wizard; History opens an overlay drawer. */
export function buildFooterNav(flags: NavFlags): NavItem[] {
    const items: NavItem[] = [];
    if (flags.canConfigure) {
        items.push({ id: 'setup', label: CONCEPT_LABEL.setup });
    }
    if (flags.canModerate) {
        items.push({
            id: 'history',
            label: CONCEPT_LABEL.history,
            hasPopup: true,
        });
    }
    return items;
}

/**
 * Sidebar items that are never a content pane: `history` is an overlay,
 * `roster` and `setup` leave the console for their own routes, `reports`
 * normalizes into the attention pane, and `overview` is the front door
 * (`activeItem === null`), not a pane id anyone can land on. Used by
 * `isLandingPaneId` so none of these can land the console on itself.
 */
const NON_LANDING_IDS: readonly NavItemId[] = [
    'overview',
    'history',
    'roster',
    'reports',
    'setup',
];

/**
 * The sidebar highlight: the front door (activeItem null) IS the Overview
 * item. `kind=report` used to promote the highlight to a separate Reports
 * item; that item is retired, so the attention pane is simply current
 * whatever its filter.
 */
export function sidebarActiveItem(
    activeItem: NavItemId | null,
    _kind: string | null,
): NavItemId | null {
    if (activeItem === null) return 'overview';
    return activeItem;
}

/**
 * `overview`, `history`, `roster`, `reports` and `setup` are never a landing
 * pane — see NON_LANDING_IDS above and the mount-time comment in
 * console-shell.tsx. Both the `?pane=` URL reader and the per-game
 * localStorage last-pane reader share this same guard so a stored/URL id from
 * either source is held to the same bar.
 */
export function isLandingPaneId(
    id: string | null | undefined,
    visible: readonly NavItemId[],
): id is NavItemId {
    return (
        !!id &&
        !NON_LANDING_IDS.includes(id as NavItemId) &&
        visible.includes(id as NavItemId)
    );
}

/**
 * Panes that stay out of the sidebar nav but remain valid deep-link
 * landings. Needs attention and Bans are hidden from the Queue group for
 * now but every `?pane=attention` / `?pane=bans` link still opens them.
 * `queue-history` is the old Mod queue pane, kept reachable for decided
 * runs (Approved / Declined) and the auto-verify spot check now that
 * `mod-queue` itself opens the worklist.
 */
function hiddenLandingIds(flags: NavFlags): NavItemId[] {
    return flags.canModerate
        ? (['attention', 'bans', 'queue-history'] as NavItemId[])
        : [];
}

/**
 * Resolves which pane the console lands on: a valid `?pane=` deep link wins,
 * and anything else lands on the tile grid (`null`) — the console's front
 * door. A Categories or Levels page the viewer cannot open lands on the first
 * page of that kind they can, so old links and redirects never dead-end.
 * There is no default pane and no stored-pane restore any more; see
 * docs/superpowers/specs/2026-07-29-console-tile-grid-design.md.
 */
export function resolveInitialPane(
    requestedPane: string | null,
    groups: NavGroup[],
    flags: NavFlags,
): NavItemId | null {
    const visible = [
        ...groups.flatMap((g) => g.items).map((it) => it.id),
        ...hiddenLandingIds(flags),
    ];
    if (isLandingPaneId(requestedPane, visible)) return requestedPane;
    const workspace = workspacePaneOf(requestedPane);
    return workspace ? firstWorkspacePane(groups, workspace.kind) : null;
}
