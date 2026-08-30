import type { GameTheme } from '~src/lib/game-theme';
import styles from './theme.module.scss';
import { buildThemeCss } from './theme-css';

/**
 * Injects a game's mod-set theme. Rendered ONLY on the public board page (not
 * the shared game layout), so the theme never reaches the /manage, /setup or
 * /run consoles — their neutral chrome would clash with an arbitrary canvas
 * color. Server-rendered so there is no flash: the <style> lands after the head
 * stylesheets in document order, which lets the equal-specificity blocks beat
 * _overrides.scss.
 */
export function GameThemeStyle({ theme }: { theme: GameTheme | null }) {
    if (!theme) return null;
    return (
        <>
            <style
                // Safe by construction: buildThemeCss interpolates only
                // validated colors; the URL below never enters the CSS.
                dangerouslySetInnerHTML={{ __html: buildThemeCss(theme) }}
            />
            {theme.backgroundUrl ? (
                <div
                    className={styles.backdrop}
                    style={{
                        // Keep the JSON quotes: url("...") is a quoted CSS string, so
                        // JSON-escaped backslashes/quotes in the URL can't break out of it.
                        backgroundImage: `url(${JSON.stringify(theme.backgroundUrl)})`,
                    }}
                    aria-hidden
                />
            ) : null}
        </>
    );
}
