'use client';
import React from 'react';
import { GameTile } from '~app/(new-layout)/games/game-tile.component';
import { Game, PaginatedGameResult } from '~app/(new-layout)/games/games.types';
import { gamesFetcher } from '~src/components/pagination/fetchers/games-fetcher';
import PaginationControl from '~src/components/pagination/pagination-control';
import { PaginationSearch } from '~src/components/pagination/pagination-search';
import usePagination from '~src/components/pagination/use-pagination';
import { SkeletonGamesList } from '~src/components/skeleton/games/skeleton-games-list';
import { Title } from '~src/components/title';

export interface GamesProps {
    gamePagination: PaginatedGameResult;
}

export const AllGamesPaginated: React.FunctionComponent<GamesProps> = ({
    gamePagination,
}) => {
    const pagination = usePagination<Game>(gamePagination, gamesFetcher);

    const { isLoading, data } = pagination;
    return (
        <div>
            <Title>Games</Title>

            <div>
                <PaginationSearch text="Filter by game/category/user" />
            </div>
            {isLoading && <SkeletonGamesList />}
            {!isLoading && data && (
                <div className="games-grid">
                    {data.map((game) => (
                        <GameTile key={game.game} game={game} sort="trending" />
                    ))}
                </div>
            )}
            <PaginationControl {...pagination} />
        </div>
    );
};
