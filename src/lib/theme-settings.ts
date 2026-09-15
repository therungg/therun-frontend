import { cacheLife, cacheTag } from 'next/cache';
import type { GameTheme } from '~src/lib/game-theme';
import { ApiError, apiFetch } from './api-client';

/** What a runner's profile wears: their own theme, their main game's, or none. */
export type ProfileThemeSource = 'own' | 'mainGame' | 'none';

export interface ThemeSettings {
    theme: GameTheme | null;
    profileTheme: ProfileThemeSource;
    /** Use my theme across the site, on theme-capable pages without their own theme. */
    siteWide: boolean;
    /** Show my theme over other runners' profiles. */
    overProfiles: boolean;
    /** Show my theme over game boards. */
    overGames: boolean;
}

/** Which theme a theme-capable page currently renders: the page's own, the viewer's, or neither. */
export type ThemePick = 'page' | 'mine' | 'none';

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
    theme: null,
    profileTheme: 'mainGame',
    siteWide: false,
    overProfiles: false,
    overGames: false,
};

export const themeSettingsTag = (name: string) =>
    `theme-settings:${name.toLowerCase()}`;

/** A runner's theme settings. Defaults applied when the runner never saved any. */
export async function getThemeSettings(name: string): Promise<ThemeSettings> {
    'use cache';
    cacheLife('minutes');
    cacheTag(themeSettingsTag(name));
    try {
        return await apiFetch<ThemeSettings>(
            `/users/global/${encodeURIComponent(name)}?part=theme`,
        );
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
            return DEFAULT_THEME_SETTINGS;
        }
        throw e;
    }
}
