import type { GameTheme } from '~src/lib/game-theme';
import { buildConsoleThemeCss } from './theme-css';

/**
 * Injects the quiet console derivation of a game's mod-set theme (accent +
 * a hint of the panel color; no canvas repaint, no art, no text colors — see
 * `deriveConsoleThemeVars`). Rendered from the manage layout, so every console
 * route carries it. Server-rendered so there is no flash: the <style> lands
 * after the head stylesheets in document order, which lets the equal-specificity
 * blocks beat _overrides.scss.
 */
export function ConsoleThemeStyle({ theme }: { theme: GameTheme | null }) {
    if (!theme) return null;
    return (
        <style
            // Safe by construction: buildConsoleThemeCss interpolates only
            // validated colors.
            dangerouslySetInnerHTML={{ __html: buildConsoleThemeCss(theme) }}
        />
    );
}
