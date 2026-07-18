// Pure description of the console's sidebar IA + permission-driven visibility.
// No React, no fetching — trivially reasoned about and reused by the shell.

export type NavItemId =
    | 'attention'
    | 'roster'
    | 'reports'
    | 'bans'
    | 'history'
    | 'standards'
    | 'timing'
    | 'rules'
    | 'variables'
    | 'combinations'
    | 'category-settings'
    | 'game-details'
    | 'moderators'
    | 'groups'
    | 'categories-visibility'
    | 'identifiers'
    | 'reassign';

export type NavGroupId = 'moderate' | 'game' | 'per-category';

export interface NavItem {
    id: NavItemId;
    label: string;
    /** Per-category items need the selected category to render. */
    categoryScoped: boolean;
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
}

const ALL_GROUPS: NavGroup[] = [
    {
        id: 'moderate',
        label: 'Moderate',
        items: [
            {
                id: 'attention',
                label: 'Needs attention',
                categoryScoped: false,
            },
            { id: 'roster', label: 'Browse runs', categoryScoped: false },
            { id: 'reports', label: 'Reports', categoryScoped: false },
            { id: 'bans', label: 'Bans', categoryScoped: false },
            { id: 'history', label: 'History', categoryScoped: false },
        ],
    },
    {
        id: 'game',
        label: 'Game',
        items: [
            {
                id: 'game-details',
                label: 'Details & metadata',
                categoryScoped: false,
            },
            {
                id: 'moderators',
                label: 'Moderators',
                categoryScoped: false,
            },
            { id: 'groups', label: 'Groups', categoryScoped: false },
            {
                id: 'categories-visibility',
                label: 'Categories & visibility',
                categoryScoped: false,
            },
            {
                id: 'identifiers',
                label: 'URL & abbreviation',
                categoryScoped: false,
            },
            {
                id: 'reassign',
                label: 'Merge games & categories',
                categoryScoped: false,
            },
        ],
    },
    {
        id: 'per-category',
        label: 'Per category',
        items: [
            { id: 'standards', label: 'Minimum time', categoryScoped: true },
            { id: 'timing', label: 'Timing', categoryScoped: true },
            { id: 'rules', label: 'Rules', categoryScoped: true },
            { id: 'variables', label: 'Variables', categoryScoped: true },
            { id: 'combinations', label: 'Sub-boards', categoryScoped: true },
            {
                id: 'category-settings',
                label: 'Category settings',
                categoryScoped: true,
            },
        ],
    },
];

/**
 * Standards lives in the per-category group but is visible to ANY moderator
 * (read-only preview); only board-admins (canEditStandards) may edit it, and that
 * edit-gating is handled by the Standards component, not by visibility here.
 */
function itemVisible(
    groupId: NavGroupId,
    itemId: NavItemId,
    flags: NavFlags,
): boolean {
    if (itemId === 'reassign') return flags.canReassign;
    if (itemId === 'moderators') return flags.canEditMods;
    if (groupId === 'moderate') return flags.canModerate;
    if (itemId === 'standards') return flags.canModerate;
    // remaining per-category items + all game items
    return flags.canConfigure;
}

/** Returns only the groups/items the viewer may use; drops empty groups. */
export function buildNav(flags: NavFlags): NavGroup[] {
    return ALL_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((it) => itemVisible(g.id, it.id, flags)),
    })).filter((g) => g.items.length > 0);
}

/** First visible item, used as the default landing pane. */
export function defaultItem(groups: NavGroup[]): NavItemId | null {
    return groups[0]?.items[0]?.id ?? null;
}

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
 * BoardHealthCard once it's done) belongs above Game-group panes — where a
 * board admin is already in a "configure this board" mindset — and on
 * whichever pane is this viewer's actual console landing page, so newcomers
 * see it on arrival regardless of which group happens to be first for their
 * permission set. It has no business sitting above triage panes (Needs
 * attention, Roster, Bans...): a moderator mid-queue doesn't need a "finish
 * setup" nag competing for their attention.
 */
export function showSetupCard(
    groups: NavGroup[],
    activeItem: NavItemId | null,
): boolean {
    if (activeItem == null) return true;
    if (activeItem === defaultItem(groups)) return true;
    const gameGroup = groups.find((g) => g.id === 'game');
    return gameGroup?.items.some((it) => it.id === activeItem) ?? false;
}

/**
 * `history`, `roster`, and `reports` are never a landing pane — see the
 * mount-time comment in console-shell.tsx. Both the `?pane=` URL reader and
 * the per-game localStorage last-pane reader share this same guard so a
 * stored/URL id from either source is held to the same bar.
 */
export function isLandingPaneId(
    id: string | null | undefined,
    visible: readonly NavItemId[],
): id is NavItemId {
    return (
        !!id &&
        id !== 'history' &&
        id !== 'roster' &&
        id !== 'reports' &&
        visible.includes(id as NavItemId)
    );
}

/**
 * Resolves which pane the console should land on: a valid `?pane=` deep link
 * wins outright; otherwise a valid per-game `localStorage` memory of the last
 * pane this viewer used; otherwise this viewer's default landing pane.
 */
export function resolveInitialPane(
    requestedPane: string | null,
    storedPane: string | null,
    groups: NavGroup[],
): NavItemId | null {
    const visible = groups.flatMap((g) => g.items).map((it) => it.id);
    if (isLandingPaneId(requestedPane, visible)) {
        return requestedPane;
    }
    if (!requestedPane && isLandingPaneId(storedPane, visible)) {
        return storedPane;
    }
    return defaultItem(groups);
}

/**
 * Resolves the selected category from a `?cat=` URL value: a valid id (one
 * that's actually in this game's category list) wins; an absent or invalid
 * id falls back to the caller-supplied default rather than `null`, so a
 * malformed `cat` never blanks out the per-category picker.
 */
export function resolveCategoryId(
    requestedCat: string | null,
    categories: readonly { id: number }[],
    fallback: number | null,
): number | null {
    if (requestedCat) {
        const parsed = Number.parseInt(requestedCat, 10);
        if (
            Number.isFinite(parsed) &&
            categories.some((c) => c.id === parsed)
        ) {
            return parsed;
        }
    }
    return fallback;
}
