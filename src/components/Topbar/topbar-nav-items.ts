export interface NavItem {
    href: string;
    label: string;
    /** Show a live pulse indicator next to the label */
    live?: boolean;
    /** Superscript "beta" after the label, for a surface still settling. */
    beta?: boolean;
    /** Only for logged-in users: the page needs an account to do anything. */
    loggedIn?: boolean;
}

// Static groups (always visible, no auth/RBAC conditions)
export const exploreItems: NavItem[] = [
    { href: '/live', label: 'Live', live: true },
    { href: '/runs', label: 'Runs' },
    { href: '/games', label: 'Games', beta: true },
    { href: '/recap', label: 'Recap' },
];

export const competeItems: NavItem[] = [
    { href: '/races', label: 'Races' },
    { href: '/tournaments', label: 'Tournaments' },
];

export const toolsItems: NavItem[] = [
    { href: '/tools/retime', label: 'Retime' },
    { href: '/tools/compare', label: 'Compare runners' },
    { href: '/upload', label: 'Upload', loggedIn: true },
    { href: '/settings/livesplit', label: 'LiveSplit setup', loggedIn: true },
];

export const visibleToolsItems = (username?: string): NavItem[] =>
    toolsItems.filter((item) => !item.loggedIn || username);

export const aboutItems: NavItem[] = [
    { href: '/about', label: 'About' },
    { href: '/blog', label: 'Blog' },
    { href: '/patreon', label: 'Support' },
    { href: '/contact', label: 'Contact' },
];

/**
 * Top level, beside the groups rather than inside one: the boards are the
 * thing people come for, and they look for them by this name. It points at
 * /games, which is where the boards are.
 */
export const leaderboardsItem: NavItem = {
    href: '/games',
    label: 'Leaderboards',
    beta: true,
};
