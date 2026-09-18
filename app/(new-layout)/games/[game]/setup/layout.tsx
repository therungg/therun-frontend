import type { ReactNode } from 'react';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { resolveGame } from '~src/lib/games-v1';
import { ConsoleThemeStyle } from '../theme/console-theme-style';

interface Props {
    children: ReactNode;
    params: Promise<{ game: string }>;
}

/**
 * Setup wears the same theme the console does — it is the same job on a
 * different screen, and its first step is the import that sets that theme, so
 * the wizard has to be able to show the result. Mirrors `manage/layout.tsx`:
 * both reads are cached ('use cache'), so this costs the page below nothing it
 * wasn't already paying, and a metadata blip renders an unthemed wizard.
 */
export default async function GameSetupLayout({ children, params }: Props) {
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
