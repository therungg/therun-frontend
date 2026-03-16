export interface NavItem {
    href: string;
    label: string;
}

// Static groups (always visible, no auth/RBAC conditions)
export const runItems: NavItem[] = [
    { href: '/upload', label: 'Upload' },
    { href: '/live', label: 'Live' },
    { href: '/runs', label: 'Runs' },
];

export const competeItems: NavItem[] = [
    { href: '/races', label: 'Races' },
    { href: '/tournaments', label: 'Tournaments' },
    { href: '/events', label: 'Events' },
];

export const exploreItems: NavItem[] = [
    { href: '/games', label: 'Games' },
    { href: '/recap', label: 'Recap' },
];

export const toolsItems: NavItem[] = [
    { href: '/livesplit', label: 'LiveSplit Key' },
    { href: '/change-appearance', label: 'Change Appearance' },
    { href: '/stories/manage', label: 'Story Preferences' },
];

export const aboutItems: NavItem[] = [
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/blog', label: 'Blog' },
    { href: '/faq', label: 'FAQ' },
    { href: '/roadmap', label: 'Roadmap' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
];
