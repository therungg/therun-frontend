import type React from 'react';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { resolveGame } from '~src/lib/games-v1';
import styles from './theme/theme.module.scss';
import { buildThemeCss } from './theme/theme-css';

/**
 * Applies the game's mod-set theme to everything under games-v2/[game].
 * Server-rendered so there is no flash: the <style> tag lands after the head
 * stylesheets in document order, which is what lets equal-specificity
 * [data-bs-theme] blocks beat _overrides.scss. Both reads are 'use cache'
 * functions the page fetches anyway.
 */
export default async function GameThemeLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ game: string }>;
}) {
    const { game: slug } = await params;
    const game = await resolveGame(slug).catch(() => null);
    const theme = game
        ? ((await getGameMetadata(game.id).catch(() => null))?.theme ?? null)
        : null;
    if (!theme) return children;

    return (
        <>
            <style
                // Safe by construction: buildThemeCss interpolates only
                // validated integers; the URL below never enters the CSS.
                dangerouslySetInnerHTML={{ __html: buildThemeCss(theme) }}
            />
            {theme.backgroundUrl ? (
                <div
                    className={styles.backdrop}
                    style={{
                        backgroundImage: `url(${JSON.stringify(theme.backgroundUrl).slice(1, -1)})`,
                    }}
                    aria-hidden
                />
            ) : null}
            {children}
        </>
    );
}
