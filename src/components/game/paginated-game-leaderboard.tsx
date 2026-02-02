import React, { memo, ReactElement, useMemo } from 'react';
import { Count } from '~app/(old-layout)/games/[game]/game.types';
import { getLeaderboard } from '~src/components/game/game-leaderboards';
import { leaderboardFetcher } from '~src/components/pagination/fetchers/leaderboard-fetcher';
import { PaginationContextProvider } from '~src/components/pagination/pagination.context-provider';
import PaginationControl from '~src/components/pagination/pagination-control';
import { PaginationSearch } from '~src/components/pagination/pagination-search';
import usePagination from '~src/components/pagination/use-pagination';

export interface PaginatedGameLeaderboardProps {
    name: string;
    leaderboard: Count[];
    transform?: (
        stat: string | number,
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

PaginatedGameLeaderboard.displayName = 'PaginatedGameLeaderboard';

const PaginatedGameLeaderboardComponent = memo(
    ({ name, leaderboard = [], transform }: PaginatedGameLeaderboardProps) => {
        const pagination = usePagination<Count>(
            leaderboard,
            leaderboardFetcher,
            15,
        );

        const Leaderboard = useMemo(
            () => getLeaderboard(name, pagination.data, '', transform),
            [name, pagination.data, transform],
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
    'PaginatedGameLeaderboardComponent';
