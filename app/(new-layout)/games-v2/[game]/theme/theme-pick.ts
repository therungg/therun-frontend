import type { GameTheme } from '~src/lib/game-theme';
import type { ThemePick, ThemeSettings } from '~src/lib/theme-settings';
import { THEME_PICKS_KEY } from './theme-memory';

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

/**
 * Inline script body setting the pick attributes before paint. The visitor's
 * remembered pick for this runner or game (theme-memory.ts) wins over `pick`
 * when it is one of `allowed`. Values are JSON-encoded.
 */
export function pickScript(
    pick: ThemePick,
    kind: 'profile' | 'game',
    context: string,
    allowed: ThemePick[],
): string {
    // A theme runs on the dark color mode (see theme-scheme.ts); 'none' leaves
    // the mode next-themes already set from the visitor's choice. `<` is
    // escaped so a runner or game name can never close the script tag.
    const js = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');
    return `(function(h){var p=${js(pick)};try{var s=JSON.parse(localStorage.getItem(${js(THEME_PICKS_KEY)})||'{}')[${js(context)}];if(${js(allowed)}.indexOf(s)>=0)p=s}catch(e){}h.dataset.themePage=${js(kind)};h.dataset.themeDefault=${js(pick)};h.dataset.themePick=p;if(p!=='none'){h.setAttribute('data-bs-theme','dark');h.style.colorScheme='dark'}})(document.documentElement);`;
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
