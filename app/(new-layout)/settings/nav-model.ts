// Pure IA for /settings. No React, no fetching.
import {
    ArrowRepeat,
    BookHalf,
    Gear,
    Heart,
    type Icon as IconType,
    Key,
    Palette,
    PersonCircle,
} from 'react-bootstrap-icons';
import type { NavGroup } from '~src/components/console-chrome/nav-types';

export type SettingsItemId =
    | 'profile'
    | 'preferences'
    | 'sync'
    | 'patreon'
    | 'appearance'
    | 'livesplit'
    | 'story-mode';

export const SETTINGS_GROUPS: NavGroup[] = [
    {
        id: 'account',
        label: 'Account',
        items: [
            { id: 'profile', label: 'Profile' },
            { id: 'preferences', label: 'General preferences' },
            { id: 'sync', label: 'Run sync' },
        ],
    },
    {
        id: 'supporter',
        label: 'Supporter',
        items: [
            { id: 'patreon', label: 'Patreon' },
            { id: 'appearance', label: 'Appearance' },
        ],
    },
    {
        id: 'tools',
        label: 'Tools',
        items: [
            { id: 'livesplit', label: 'LiveSplit key' },
            { id: 'story-mode', label: 'Story Mode' },
        ],
    },
];

export const SETTINGS_ICONS: Record<SettingsItemId, IconType> = {
    profile: PersonCircle,
    preferences: Gear,
    sync: ArrowRepeat,
    patreon: Heart,
    appearance: Palette,
    livesplit: Key,
    'story-mode': BookHalf,
};

const ALL_IDS = new Set<string>(
    SETTINGS_GROUPS.flatMap((g) => g.items.map((i) => i.id)),
);

export function settingsHref(id: SettingsItemId): string {
    return `/settings/${id}`;
}

export function activeSettingsItem(pathname: string): SettingsItemId | null {
    const path = pathname.split('?')[0];
    const seg = path.replace(/^\/settings\/?/, '').split('/')[0];
    return seg && ALL_IDS.has(seg) ? (seg as SettingsItemId) : null;
}
