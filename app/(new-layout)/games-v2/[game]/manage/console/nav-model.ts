// Pure description of the console's sidebar IA + permission-driven visibility.
// No React, no fetching — trivially reasoned about and reused by the shell.

// Import kept first so the labels below can't drift from the wizard's.
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';

export type NavItemId =
    | 'attention'
    | 'roster'
    | 'reports'
    | 'bans'
    | 'history'
    | 'setup'
    | 'game-details'
    | 'categories'
    | 'groups'
    | 'variables'
    | 'boards'
    | 'moderators'
    | 'reassign';

export type NavGroupId = 'moderate' | 'board';

export interface NavItem {
    id: NavItemId;
    label: string;
    /** Reserved/not-yet-built items render a "coming soon" placeholder. */
    reserved?: boolean;
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

const ALL_GROUPS: NavGroup[] = [
    {
        id: 'moderate',
        label: 'Moderate',
        items: [
            // Needs attention, Browse runs (roster) and Reports (a
            // pre-filtered view of the attention pane) are pulled from the
            // console for now. Their panes/routes still exist — only these
            // entry points are gone, so restoring them is re-adding the
            // items here.
            { id: 'bans', label: CONCEPT_LABEL.bans },
            { id: 'history', label: CONCEPT_LABEL.history },
        ],
    },
    {
        id: 'board',
        label: 'Board',
        items: [
            // Leaves the console for the wizard rather than opening a pane —
            // see handleNavigate in console-shell.tsx. It's the permanent
            // door back into setup, which is why it sits first and stays
            // visible after the board is live; the setup checklist card only
            // covers the not-yet-finished case.
            { id: 'setup', label: CONCEPT_LABEL.setup },
            { id: 'game-details', label: CONCEPT_LABEL['game-details'] },
            // The category index: the door to every per-category setting, and
            // the featured/archived screen that used to be its own pane.
            // Order matches the wizard: details 1, categories 2, groups 3.
            { id: 'categories', label: CONCEPT_LABEL.categories },
            { id: 'groups', label: CONCEPT_LABEL.groups },
            // The wizard's step 4, mounted as a pane: the same VariablesGrid,
            // spanning every featured category. Structure used to be reachable
            // only by opening a category and scrolling — which meant the one
            // screen that shows where categories disagree had no door.
            { id: 'variables', label: CONCEPT_LABEL.variables },
            { id: 'boards', label: CONCEPT_LABEL.boards },
            { id: 'moderators', label: CONCEPT_LABEL.moderators },
            { id: 'reassign', label: CONCEPT_LABEL.reassign },
        ],
    },
];

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
    if (itemId === 'reassign') return flags.canReassign;
    if (itemId === 'moderators') return flags.canEditMods;
    if (groupId === 'moderate') return flags.canModerate;
    if (itemId === 'categories') return flags.canConfigure || flags.canModerate;
    if (itemId === 'boards') return flags.canModerate || flags.canConfigure;
    return flags.canConfigure;
}

/** Returns only the groups/items the viewer may use; drops empty groups. */
export function buildNav(flags: NavFlags): NavGroup[] {
    return ALL_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((it) => itemVisible(g.id, it.id, flags)),
    })).filter((g) => g.items.length > 0);
}

/**
 * Sidebar items that are never a content pane: `history` is an overlay,
 * `roster` and `setup` leave the console for their own routes, and `reports`
 * normalizes into the attention pane. Used by `isLandingPaneId` so neither can
 * land the console on one of them.
 */
const NON_LANDING_IDS: readonly NavItemId[] = [
    'history',
    'roster',
    'reports',
    'setup',
];

/**
 * Reports isn't a real pane — `handleNavigate('reports')` lands on the
 * `attention` pane pre-filtered by `?kind=report`, so `activeItem` is always
 * `'attention'` whether the viewer got there via "Needs attention" or
 * "Reports". The sidebar highlight has to be derived from the `kind` query
 * param (not stored) so it stays correct when NeedsAttention's own kind-chip
 * dismiss button rewrites the URL out from under the shell.
 */
export function sidebarActiveItem(
    activeItem: NavItemId | null,
    kind: string | null,
): NavItemId | null {
    if (activeItem === 'attention' && kind === 'report') {
        return 'reports';
    }
    return activeItem;
}

/**
 * The setup-nudge slot (SetupChecklistCard while setup is incomplete,
 * BoardHealthCard once it's done) belongs on the tile grid — the front door,
 * where every viewer arrives — and above Board-group panes, where a board
 * admin is already in a "configure this board" mindset. It has no business
 * sitting above triage panes (Needs attention, Bans...): a moderator mid-queue
 * doesn't need a "finish setup" nag competing for their attention.
 */
export function showSetupCard(
    groups: NavGroup[],
    activeItem: NavItemId | null,
): boolean {
    if (activeItem == null) return true;
    const boardGroup = groups.find((g) => g.id === 'board');
    return boardGroup?.items.some((it) => it.id === activeItem) ?? false;
}

/**
 * `history`, `roster`, `reports` and `setup` are never a landing pane — see
 * NON_LANDING_IDS above and the mount-time comment in console-shell.tsx. Both
 * the `?pane=` URL reader and the per-game localStorage last-pane reader share
 * this same guard so a stored/URL id from either source is held to the same
 * bar.
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
 * landings. Needs attention was pulled from the nav "for now" (see
 * ALL_GROUPS), but the cross-game hub rows, the Moderators pane's
 * pending-applications note, the legacy /manage/moderation/* redirects and
 * the Reports normalization all still target `?pane=attention` — the deep
 * link must keep opening the pane even while no sidebar item points at it.
 */
function hiddenLandingIds(flags: NavFlags): NavItemId[] {
    return flags.canModerate ? ['attention'] : [];
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
