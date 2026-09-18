import type { ReactNode } from 'react';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { resolveGame } from '~src/lib/games-v1';
import { ConsoleThemeStyle } from '../theme/console-theme-style';

interface Props {
    children: ReactNode;
    params: Promise<{ game: string }>;
}

/**
 * The console wrapper: nothing but the board's theme, in its console form.
 * Both reads are cached ('use cache'), so this costs the routes below nothing
 * they weren't already paying, and a metadata blip just renders an unthemed
 * console.
 */
export default async function GameConsoleLayout({ children, params }: Props) {
    const { game: slug } = await params;
    const game = await resolveGame(slug).catch(() => null);
    const theme = game
        ? ((await getGameMetadata(game.id).catch(() => null))?.theme ?? null)
        : null;
    return (
        <>
            <ConsoleThemeStyle theme={theme} />
            {children}
        </>
    );
}
