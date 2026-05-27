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
    | 'game-details' // reserved (placeholder)
    | 'moderators' // reserved (placeholder)
    | 'groups'
    | 'categories-visibility'
    | 'identifiers';

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
            { id: 'roster', label: 'Roster', categoryScoped: false },
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
                reserved: true,
            },
            {
                id: 'moderators',
                label: 'Moderators',
                categoryScoped: false,
                reserved: true,
            },
            { id: 'groups', label: 'Groups', categoryScoped: false },
            {
                id: 'categories-visibility',
                label: 'Categories & visibility',
                categoryScoped: false,
            },
            { id: 'identifiers', label: 'Identifiers', categoryScoped: false },
        ],
    },
    {
        id: 'per-category',
        label: 'Per category',
        items: [
            { id: 'standards', label: 'Standards', categoryScoped: true },
            { id: 'timing', label: 'Timing', categoryScoped: true },
            { id: 'rules', label: 'Rules', categoryScoped: true },
            { id: 'variables', label: 'Variables', categoryScoped: true },
            { id: 'combinations', label: 'Combinations', categoryScoped: true },
            {
                id: 'category-settings',
                label: 'Category settings',
                categoryScoped: true,
            },
        ],
    },
];

/** Standards sits in the per-category group but is gated by canEditStandards. */
function itemVisible(
    groupId: NavGroupId,
    itemId: NavItemId,
    flags: NavFlags,
): boolean {
    if (groupId === 'moderate') return flags.canModerate;
    if (itemId === 'standards') return flags.canEditStandards;
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
