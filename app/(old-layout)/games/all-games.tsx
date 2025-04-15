"use client";
import React from "react";
import { PaginationContextProvider } from "~src/components/pagination/pagination.context-provider";
import {
    AllGamesPaginated,
    GamesProps,
} from "~app/(old-layout)/games/all-games-paginated";

export const AllGames: React.FunctionComponent<GamesProps> = ({
    gamePagination,
}) => {
    return (
        <PaginationContextProvider>
            <AllGamesPaginated gamePagination={gamePagination} />
        </PaginationContextProvider>
    );
};
