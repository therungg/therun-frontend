'use client';
import React from 'react';
import {
    AllGamesPaginated,
    GamesProps,
} from '~app/(old-layout)/games/all-games-paginated';
import { PaginationContextProvider } from '~src/components/pagination/pagination.context-provider';

export const AllGames: React.FunctionComponent<GamesProps> = ({
    gamePagination,
}) => {
    return (
        <PaginationContextProvider>
            <AllGamesPaginated gamePagination={gamePagination} />
        </PaginationContextProvider>
    );
};
