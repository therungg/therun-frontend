export interface NavItem {
    href: string;
    label: string;
    /** Show a live pulse indicator next to the label */
    live?: boolean;
    /** Superscript "beta" after the label, for a surface still settling. */
    beta?: boolean;
}

// Static groups (always visible, no auth/RBAC conditions)
export const exploreItems: NavItem[] = [
    { href: '/live', label: 'Live', live: true },
    { href: '/runs', label: 'Runs' },
    { href: '/games', label: 'Games', beta: true },
    // Second door to the same page on purpose: people look for "leaderboards"
    // by name, and /games is where the boards are.
    { href: '/games', label: 'Leaderboards', beta: true },
    { href: '/recap', label: 'Recap' },
];

export const competeItems: NavItem[] = [
    { href: '/races', label: 'Races' },
    { href: '/tournaments', label: 'Tournaments' },
];

// Tools group — only shown when logged in
export const toolsItems: NavItem[] = [{ href: '/upload', label: 'Upload' }];

export const aboutItems: NavItem[] = [
    { href: '/about', label: 'About' },
    { href: '/blog', label: 'Blog' },
    { href: '/patreon', label: 'Support' },
    { href: '/contact', label: 'Contact' },
];
