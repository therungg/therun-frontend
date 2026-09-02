// Pure description of the console's sidebar IA + permission-driven visibility.
// No React, no fetching — trivially reasoned about and reused by the shell.

// Import kept first so the labels below can't drift from the wizard's.
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';

export type NavItemId =
    | 'overview'
    | 'attention'
    | 'roster'
    | 'reports'
    | 'bans'
    | 'history'
    | 'setup'
    | 'game-details'
    | 'theme'
    | 'categories'
    | 'groups'
    | 'levels'
    | 'level-categories'
    | 'variables'
    | 'boards'
    | 'moderators'
    | 'reassign'
    | 'import';

export type NavGroupId = 'overview' | 'moderate' | 'structure' | 'game';

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
    canEditStandards: boolean; // ability.can('edit','moderators')
    canConfigure: boolean; // ability.can('edit','category-settings',{game})
    canReassign: boolean; // ability.can('reassign','reassignment')
    canEditMods: boolean; // ability.can('edit','moderators',{game})
    /** ability.can('moderate','admins') — global admins only. Rides
     * NavFlags for transport; buildNav does not read it. */
    canSiteBan?: boolean;
}

// Grouped by how often a moderator touches them, not by concept: Overview is
// the front door, Queue is the daily loop, Structure is the board's shape,
// Game is occasional administration. Setup and History are NOT nav items any
// more — Setup leaves the console and History is an overlay, so both live in
// the utility footer (buildFooterNav) where their different behavior is
// visually honest.
const ALL_GROUPS: NavGroup[] = [
    {
        id: 'overview',
        // No caption — a one-item "group" for the front door.
        label: '',
        items: [{ id: 'overview', label: CONCEPT_LABEL.overview }],
    },
    {
        id: 'moderate',
        label: 'Queue',
        items: [
            { id: 'attention', label: CONCEPT_LABEL.attention },
            { id: 'bans', label: CONCEPT_LABEL.bans },
        ],
    },
    {
        id: 'structure',
        label: 'Structure',
        items: [
            { id: 'boards', label: CONCEPT_LABEL.boards },
            { id: 'categories', label: CONCEPT_LABEL.categories },
            { id: 'groups', label: CONCEPT_LABEL.groups },
            // One item now: the level categories (templates) are a tab inside
            // the Levels pane. ?pane=level-categories still deep-links there.
            { id: 'levels', label: CONCEPT_LABEL.levels },
            { id: 'variables', label: CONCEPT_LABEL.variables },
        ],
    },
    {
        id: 'game',
        label: 'Game',
        items: [
            { id: 'game-details', label: CONCEPT_LABEL['game-details'] },
            { id: 'theme', label: CONCEPT_LABEL.theme },
            { id: 'moderators', label: CONCEPT_LABEL.moderators },
            { id: 'import', label: CONCEPT_LABEL.import },
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
 * The category index is reachable by ANY moderator, because Minimum time is —
 * that used to be the `standards` carve-out here. Now that the six
 * per-category panes are sections on one detail screen, the gating moved to
 * section level (category-detail.tsx): a moderator who cannot configure sees
 * the index and Minimum time, and nothing else.
 */
function itemVisible(
    groupId: NavGroupId,
    itemId: NavItemId,
    flags: NavFlags,
): boolean {
    if (itemId === 'overview') return anyConsoleAccess(flags);
    // Merge (game/category reassignment) is temporarily hidden while the
    // backend merge endpoints are disabled. Restore by returning
    // `flags.canReassign`.
    if (itemId === 'reassign') return false;
    if (itemId === 'moderators') return flags.canEditMods;
    if (groupId === 'moderate') return flags.canModerate;
    if (itemId === 'categories') return flags.canConfigure || flags.canModerate;
    if (itemId === 'boards') return flags.canModerate || flags.canConfigure;
    // Import is pulled from the console for now — server actions in
    // src-import-actions.ts also refuse to run. Restore by returning
    // `flags.canModerate || flags.canConfigure` here (and flipping
    // IMPORT_DISABLED back to false there).
    if (itemId === 'import') return false;
    return flags.canConfigure;
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
 * The board-health slot (BoardHealthCard, shown once setup is done) sits above
 * Structure/Game panes, where a board admin is already in a "configure this
 * board" mindset. It has no business sitting above triage panes (Needs
 * attention, Bans...): a moderator mid-queue doesn't need it competing for
 * their attention. While setup is still incomplete the slot shows nothing —
 * the Setup wizard sidebar dot carries that signal instead.
 *
 * The front door (`activeItem == null`) is deliberately excluded: BoardOverview
 * renders the same card inside its own rail, so the shell must not also stack
 * one above it.
 */
export function showSetupCard(
    groups: NavGroup[],
    activeItem: NavItemId | null,
): boolean {
    if (activeItem == null) return false;
    return groups.some(
        (g) =>
            (g.id === 'structure' || g.id === 'game') &&
            g.items.some((it) => it.id === activeItem),
    );
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
 * landings. Needs attention is back in the nav (see ALL_GROUPS), so it no
 * longer needs to be listed here. `level-categories` merged into the Levels
 * pane but stays deep-linkable — it lands on the Levels pane's templates tab
 * (see content-router.tsx).
 */
function hiddenLandingIds(flags: NavFlags): NavItemId[] {
    return flags.canConfigure ? ['level-categories'] : [];
}

/**
 * Resolves which pane the console lands on: a valid `?pane=` deep link wins,
 * and anything else lands on the tile grid (`null`) — the console's front
 * door. There is no default pane and no stored-pane restore any more; see
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
    return isLandingPaneId(requestedPane, visible) ? requestedPane : null;
}
