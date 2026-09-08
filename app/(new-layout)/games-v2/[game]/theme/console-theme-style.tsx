import type { GameTheme } from '~src/lib/game-theme';
import styles from './console-theme.module.scss';
import { buildConsoleThemeCss } from './theme-css';

/**
 * Injects the console derivation of a game's mod-set theme: accent, a tint of
 * the panel color on the console's panels and canvas, and the background art as
 * a band behind the masthead (see `deriveConsoleThemeVars` and
 * console-theme.module.scss). Text colors are the one thing it never takes.
 * Rendered from the manage layout, so every console route carries it.
 * Server-rendered so there is no flash: the <style> lands after the head
 * stylesheets in document order, which lets the equal-specificity blocks beat
 * _overrides.scss.
 */
export function ConsoleThemeStyle({ theme }: { theme: GameTheme | null }) {
    if (!theme) return null;
    return (
        <>
            <style
                // Safe by construction: buildConsoleThemeCss interpolates only
                // validated colors.
                dangerouslySetInnerHTML={{
                    __html: buildConsoleThemeCss(theme),
                }}
            />
            {theme.backgroundUrl ? (
                <div className={styles.anchor} aria-hidden>
                    <div
                        className={styles.art}
                        style={{
                            // Keep the JSON quotes: url("...") is a quoted CSS
                            // string, so JSON-escaped backslashes/quotes in the
                            // URL can't break out of it.
                            backgroundImage: `url(${JSON.stringify(theme.backgroundUrl)})`,
                        }}
                    />
                </div>
            ) : null}
        </>
    );
}
