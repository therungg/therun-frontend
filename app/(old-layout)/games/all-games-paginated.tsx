'use client';
import React from 'react';
import { Row } from 'react-bootstrap';
import { AllGamesCard } from '~app/(old-layout)/games/all-games-card.component';
import { Game, PaginatedGameResult } from '~app/(old-layout)/games/games.types';
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

            <Row className="gy-3 mb-3">
                <div>
                    <PaginationSearch text="Filter by game/category/user" />
                </div>
                {isLoading && <SkeletonGamesList />}
                {!isLoading &&
                    data &&
                    data.map((game) => (
                        <AllGamesCard key={game.game} game={game} />
                    ))}
                <PaginationControl {...pagination} />
            </Row>
        </div>
    );
};
