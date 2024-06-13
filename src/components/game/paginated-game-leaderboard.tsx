import { Count } from "~app/games/[game]/game.types";
import React, { memo, useMemo, ReactElement } from "react";
import { PaginationContextProvider } from "~src/components/pagination/pagination.context-provider";
import usePagination from "~src/components/pagination/use-pagination";
import { leaderboardFetcher } from "~src/components/pagination/fetchers/leaderboard-fetcher";
import { getLeaderboard } from "~src/components/game/game-leaderboards";
import PaginationControl from "~src/components/pagination/pagination-control";
import { PaginationSearch } from "~src/components/pagination/pagination-search";

export interface PaginatedGameLeaderboardProps {
    name: string;
    leaderboard: Count[];
    transform?: (
        // eslint-disable-next-line no-unused-vars
        stat: string | number,
        // eslint-disable-next-line no-unused-vars
        key: number,
    ) => string | number | ReactElement;
}

export const PaginatedGameLeaderboard = memo(
    (props: PaginatedGameLeaderboardProps) => {
        return (
            <PaginationContextProvider>
                <PaginatedGameLeaderboardComponent {...props} />
            </PaginationContextProvider>
        );
    },
);

PaginatedGameLeaderboard.displayName = "PaginatedGameLeaderboard";

const PaginatedGameLeaderboardComponent = memo(
    ({ name, leaderboard = [], transform }: PaginatedGameLeaderboardProps) => {
        const pagination = usePagination<Count>(
            leaderboard,
            leaderboardFetcher,
            15,
        );

        const Leaderboard = useMemo(
            () => getLeaderboard(name, pagination.data, "", transform),
            [name, pagination.data, transform, getLeaderboard],
        );

        return (
            <div>
                <div className="mb-2">
                    <PaginationSearch text="Search user" />
                </div>
                {Leaderboard}
                <PaginationControl {...pagination} minimalLayout={true} />
            </div>
        );
    },
);

PaginatedGameLeaderboardComponent.displayName =
    "PaginatedGameLeaderboardComponent";
