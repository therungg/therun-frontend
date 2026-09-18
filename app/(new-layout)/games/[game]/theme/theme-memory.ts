import type { ThemePick } from '~src/lib/theme-settings';

/**
 * The visitor's own theme picks from the Themes menu, remembered per runner and
 * per game in this browser, so a pick holds across that runner's or game's
 * tabs. One map in localStorage: `{ "profile:<name>": pick, "game:<name>": pick }`.
 */
export const THEME_PICKS_KEY = 'therun-theme-picks';

export const themeContext = (kind: 'profile' | 'game', label: string) =>
    `${kind}:${label.toLowerCase()}`;

const PICKS: ThemePick[] = ['page', 'mine', 'none'];

function readPicks(): Record<string, string> {
    try {
        const parsed = JSON.parse(
            localStorage.getItem(THEME_PICKS_KEY) ?? '{}',
        );
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

/** The remembered pick for this context when the page can still show it. */
export function rememberedPick(
    context: string,
    allowed: ThemePick[],
): ThemePick | null {
    const pick = readPicks()[context] as ThemePick | undefined;
    return pick && PICKS.includes(pick) && allowed.includes(pick) ? pick : null;
}

export function rememberPick(context: string, pick: ThemePick) {
    try {
        const picks = readPicks();
        picks[context] = pick;
        localStorage.setItem(THEME_PICKS_KEY, JSON.stringify(picks));
    } catch {
        // Storage blocked: the pick still applies to this page.
    }
}

/** The picks this page can show: its own theme, the viewer's, or none. */
export const allowedPicks = (hasPage: boolean, mine: boolean): ThemePick[] => [
    ...(hasPage ? (['page'] as const) : []),
    ...(mine ? (['mine'] as const) : []),
    'none',
];
