import { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { getGamesPage } from '~src/components/game/get-tabulated-game-stats';
import buildMetadata from '~src/utils/metadata';
import { AllGames } from './all-games';

export const metadata: Metadata = buildMetadata({
    title: 'Game overview',
    description: 'All games overview',
});

export default async function AllGamesPage() {
    'use cache';
    cacheLife('hours');

    const allGames = await getGamesPage();

    return <AllGames gamePagination={allGames} />;
}
