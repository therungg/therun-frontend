'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback } from 'react';
import { GameTile } from '~app/(new-layout)/games/game-tile.component';
import {
    Game,
    GameSort,
    PaginatedGameResult,
} from '~app/(new-layout)/games/games.types';
import { GamesSortRail } from '~app/(new-layout)/games/games-sort-rail.component';
import { gamesFetcher } from '~src/components/pagination/fetchers/games-fetcher';
import PaginationControl from '~src/components/pagination/pagination-control';
import { PaginationSearch } from '~src/components/pagination/pagination-search';
import usePagination from '~src/components/pagination/use-pagination';
import { SkeletonGamesList } from '~src/components/skeleton/games/skeleton-games-list';
import { Title } from '~src/components/title';

export interface GamesProps {
    gamePagination: PaginatedGameResult;
}

const SORTS: GameSort[] = ['trending', 'runners', 'pbs', 'playtime'];

// The URL is the single source of truth for sort — there is no local React
// state that can fall out of sync with it. An absent or unrecognised `sort`
// param always resolves to 'trending' here, before the value ever reaches
// usePagination's cache key or the fetcher.
function sortFromParams(params: URLSearchParams): GameSort {
    const raw = params.get('sort');
    return (SORTS as string[]).includes(raw ?? '')
        ? (raw as GameSort)
        : 'trending';
}

// The Algolia index backing /games has paginationLimitedTo: 10000, so only
// floor(10000 / pageSize) pages are ever reachable — requesting past that
// errors. Clamp the pager so it never offers a page that would fail.
const ALGOLIA_GAMES_PAGINATION_LIMIT = 10000;

export const AllGamesPaginated: React.FunctionComponent<GamesProps> = ({
    gamePagination,
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sort = sortFromParams(searchParams);

    const pagination = usePagination<Game>(
        gamePagination,
        gamesFetcher,
        undefined,
        undefined,
        {
            sort,
        },
    );

    const setSort = useCallback(
        (next: GameSort) => {
            const params = new URLSearchParams(searchParams.toString());
            if (next === 'trending') {
                params.delete('sort');
            } else {
                params.set('sort', next);
            }
            const qs = params.toString();
            // A sort change is a user-visible view change, not a URL
            // correction — push a history entry so back/forward step
            // through the sorts the user actually picked. (Was
            // router.replace, which collapses every sort into one history
            // entry; back then had nothing but pre-/games history to land
            // on.)
            router.push(`/games${qs ? `?${qs}` : ''}`, { scroll: false });
        },
        [router, searchParams],
    );

    const { isLoading, data, pageSize, totalPages } = pagination;

    const maxPage = Math.floor(ALGOLIA_GAMES_PAGINATION_LIMIT / pageSize) || 1;
    const clampedPagination = {
        ...pagination,
        totalPages: Math.min(totalPages, maxPage),
    };

    return (
        <div>
            <Title>Games</Title>

            <div>
                <PaginationSearch text="Filter by game/category/user" />
            </div>
            <div className="games-grid-head">
                <h2>{sort === 'trending' ? 'Trending games' : 'All games'}</h2>
                <GamesSortRail value={sort} onChange={setSort} />
            </div>
            {isLoading && <SkeletonGamesList />}
            {!isLoading && data && (
                <div className="games-grid">
                    {data.map((game) => (
                        <GameTile key={game.game} game={game} sort={sort} />
                    ))}
                </div>
            )}
            <PaginationControl {...clampedPagination} />
        </div>
    );
};
