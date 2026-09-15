import type { ThemePick } from '~src/lib/theme-settings';

/**
 * Every theme is a tint of a dark board (see deriveThemeVars), so a page
 * wearing one must run on the dark color mode underneath: in light mode the
 * text, topbar and backdrop scrim the theme doesn't set would stay light-mode
 * and clash with it. Without a theme the page goes back to the visitor's own
 * light/dark choice, which next-themes keeps in localStorage under "theme".
 */
export function storedScheme(): 'light' | 'dark' {
    let stored: string | null = null;
    try {
        stored = localStorage.getItem('theme');
    } catch {
        stored = null;
    }
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}

/** Puts the color mode under the given pick: dark for a theme, else the visitor's own. */
export function applyThemeScheme(pick: ThemePick) {
    const html = document.documentElement;
    const mode = pick === 'none' ? storedScheme() : 'dark';
    if (html.getAttribute('data-bs-theme') !== mode) {
        html.setAttribute('data-bs-theme', mode);
    }
    html.style.colorScheme = mode;
}

/**
 * next-themes re-applies the stored mode from its own effects (on mount, on a
 * system change), which run after a page has set its pick. While a theme pick
 * is active, put dark back whenever that happens. Returns the disconnect.
 */
export function holdThemeScheme(): () => void {
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
        const pick = html.dataset.themePick;
        if (
            (pick === 'page' || pick === 'mine') &&
            html.getAttribute('data-bs-theme') !== 'dark'
        ) {
            applyThemeScheme(pick);
        }
    });
    observer.observe(html, {
        attributes: true,
        attributeFilter: ['data-bs-theme'],
    });
    return () => observer.disconnect();
}
