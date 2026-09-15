import type { GameTheme } from '~src/lib/game-theme';
import type { ThemePick, ThemeSettings } from '~src/lib/theme-settings';

export type { ThemePick };

/** The spec's four rules, in order. */
export function choosePick({
    hasPage,
    kind,
    viewer,
}: {
    hasPage: boolean;
    kind: 'profile' | 'game';
    viewer: ThemeSettings | null;
}): ThemePick {
    const mine = !!viewer?.theme && viewer.siteWide;
    const overrides =
        kind === 'profile' ? viewer?.overProfiles : viewer?.overGames;
    if (hasPage && mine && overrides) return 'mine';
    if (hasPage) return 'page';
    if (mine) return 'mine';
    return 'none';
}

/** Inline script body setting the pick attributes before paint. Values are from a closed set. */
export function pickScript(pick: ThemePick, kind: 'profile' | 'game'): string {
    // A theme runs on the dark color mode (see theme-scheme.ts); 'none' leaves
    // the mode next-themes already set from the visitor's choice.
    const dark =
        pick === 'none'
            ? ''
            : "h.setAttribute('data-bs-theme','dark');h.style.colorScheme='dark';";
    return `(function(h){h.dataset.themePage=${JSON.stringify(kind)};h.dataset.themeDefault=${JSON.stringify(pick)};h.dataset.themePick=${JSON.stringify(pick)};${dark}})(document.documentElement);`;
}

/**
 * A profile's page theme from its head payload. `theme` is the backend's
 * resolved profile theme, where null means the runner chose none; only a
 * payload without the field (older backend) falls back to the main game's.
 */
export function profileThemeOf(head: {
    theme?: GameTheme | null;
    mainGame?: { theme: GameTheme | null } | null;
}): GameTheme | null {
    return head.theme !== undefined
        ? head.theme
        : (head.mainGame?.theme ?? null);
}
