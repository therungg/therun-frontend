import type { GameTheme } from '~src/lib/game-theme';
import styles from './console-theme.module.scss';
import { buildConsoleThemeCss, buildOwnPortalThemeCss } from './theme-css';

/**
 * Injects the console derivation of a game's mod-set theme: accent, a tint of
 * the panel color on the console's panels, a tint of the background color on
 * its canvas, and the background art as
 * a band behind the masthead (see `deriveConsoleThemeVars` and
 * console-theme.module.scss). Text colors are the one thing it never takes.
 * It also carries the board's own (public) theme for the portals that ask
 * for it, so the run review modal opened here looks as it does on the board.
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
                    __html: `${buildConsoleThemeCss(theme)}\n${buildOwnPortalThemeCss(theme)}`,
                }}
            />
            <div className={styles.anchor} aria-hidden>
                <div
                    className={styles.art}
                    style={
                        {
                            // Handed to the stylesheet as a variable because
                            // the image is painted by a pseudo-element (it is
                            // the blurred layer, under the scrim). Keep the
                            // JSON quotes: url("...") is a quoted CSS string,
                            // so JSON-escaped backslashes/quotes in the URL
                            // can't break out of it.
                            //
                            // Rendered even with no image: this element also
                            // carries the color wash that runs the length of
                            // the page, which a board with no art needs just
                            // as much as one with it. `none` simply leaves the
                            // picture layer empty.
                            '--console-art': theme.backgroundUrl
                                ? `url(${JSON.stringify(theme.backgroundUrl)})`
                                : 'none',
                        } as React.CSSProperties
                    }
                />
            </div>
        </>
    );
}
