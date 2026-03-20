export interface NavItem {
    href: string;
    label: string;
    /** Show a live pulse indicator next to the label */
    live?: boolean;
}

// Static groups (always visible, no auth/RBAC conditions)
export const exploreItems: NavItem[] = [
    { href: '/live', label: 'Live', live: true },
    { href: '/runs', label: 'Runs' },
    { href: '/games', label: 'Games' },
    { href: '/recap', label: 'Recap' },
];

export const competeItems: NavItem[] = [
    { href: '/races', label: 'Races' },
    { href: '/tournaments', label: 'Tournaments' },
];

// Tools group — only shown when logged in
export const toolsItems: NavItem[] = [
    { href: '/upload', label: 'Upload' },
    { href: '/livesplit', label: 'LiveSplit Key' },
    { href: '/change-appearance', label: 'Change Appearance' },
    { href: '/stories/manage', label: 'Story Mode' },
];

export const aboutItems: NavItem[] = [
    { href: '/about', label: 'About' },
    { href: '/getting-started', label: 'Getting Started' },
    { href: '/blog', label: 'Blog' },
    { href: '/contact', label: 'Contact' },
];
