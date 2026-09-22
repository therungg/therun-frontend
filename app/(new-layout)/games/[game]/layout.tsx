import { type ReactNode, Suspense } from 'react';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { resolveGame } from '~src/lib/games-v1';
import { PageTheme } from './theme/page-theme';
import { ThemedSegmentsOnly } from './theme/themed-segments-only';

/**
 * The game's theme lives here rather than on each page. Every tab has its own
 * loading.tsx, and on a tab switch that skeleton replaces the page — so a
 * theme drawn by the page went with it, and the switch flashed the site's
 * default colours until the next tab arrived. A layout stays mounted across
 * its child routes, so the theme holds through the skeleton.
 */
export default function GameLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ game: string }>;
}) {
    return (
        <>
            <ThemedSegmentsOnly>
                <Suspense fallback={null}>
                    <GameTheme params={params} />
                </Suspense>
            </ThemedSegmentsOnly>
            {children}
        </>
    );
}

async function GameTheme({ params }: { params: Promise<{ game: string }> }) {
    const { game } = await params;
    const resolved = await resolveGame(game);
    if (!resolved) return null;
    const meta = await getGameMetadata(resolved.id).catch(() => null);
    return (
        <PageTheme
            kind="game"
            label={resolved.display}
            theme={meta?.theme ?? null}
        />
    );
}
