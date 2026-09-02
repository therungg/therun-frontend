import { describe, expect, it } from 'vitest';
import {
    activeSettingsItem,
    SETTINGS_GROUPS,
    SETTINGS_ICONS,
    type SettingsItemId,
    settingsHref,
} from './nav-model';

describe('settings nav model', () => {
    it('lists the seven phase-1 sections in order', () => {
        expect(
            SETTINGS_GROUPS.flatMap((g) => g.items.map((i) => i.id)),
        ).toEqual([
            'profile',
            'preferences',
            'sync',
            'patreon',
            'appearance',
            'livesplit',
            'story-mode',
        ]);
    });

    it('has an icon for every item', () => {
        for (const g of SETTINGS_GROUPS)
            for (const i of g.items)
                expect(SETTINGS_ICONS[i.id as SettingsItemId]).toBeDefined();
    });

    it('maps ids to hrefs', () => {
        expect(settingsHref('profile')).toBe('/settings/profile');
        expect(settingsHref('story-mode')).toBe('/settings/story-mode');
    });

    it('resolves the active item from the pathname', () => {
        expect(activeSettingsItem('/settings/livesplit')).toBe('livesplit');
        expect(activeSettingsItem('/settings/patreon?code=abc')).toBe(
            'patreon',
        );
        expect(activeSettingsItem('/settings')).toBeNull();
        expect(activeSettingsItem('/settings/unknown')).toBeNull();
    });
});
