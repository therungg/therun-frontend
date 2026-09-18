import { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { Suspense } from 'react';
import { getGamesPage } from '~src/components/game/get-tabulated-game-stats';
import buildMetadata from '~src/utils/metadata';
import { AllGames } from './all-games';
import { LiveGamesRail } from './live-games-rail.component';
import { YourGamesRail } from './your-games-rail.component';

export const metadata: Metadata = buildMetadata({
    title: 'Game overview',
    description: 'All games overview',
});

// The grid is fetched once an hour (CachedGamesGrid, below) and prerendered
// as static shell. Live run data can't share that lifetime -- it's stale
// within seconds -- so it can't be awaited from inside a 'use cache' scope
// without freezing at whatever the grid last cached. Keeping this top-level
// page function itself uncached, and rendering the rail as a sibling in its
// own Suspense boundary, lets LiveGamesRail opt into per-request rendering
// (via connection()) while the grid below it stays a prerendered hole that
// only regenerates hourly. See the "Interleaving" section of the `use cache`
// docs (node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md)
// for why this has to be a sibling/slot rather than a call from inside
// CachedGamesGrid's own body.
export default function AllGamesPage() {
    return (
        <>
            <Suspense fallback={null}>
                <LiveGamesRail />
            </Suspense>
            <Suspense fallback={null}>
                <YourGamesRail />
            </Suspense>
            <CachedGamesGrid />
        </>
    );
}

async function CachedGamesGrid() {
    'use cache';
    cacheLife('hours');

    const allGames = await getGamesPage();

    return <AllGames gamePagination={allGames} />;
}
