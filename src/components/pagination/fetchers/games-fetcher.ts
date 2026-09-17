'use client';

import { Game } from '~app/(new-layout)/games/games.types';
import { getBaseUrl } from '~src/actions/base-url.action';
import {
    PaginatedData,
    PaginationFetcher,
} from '~src/components/pagination/pagination.types';

export const gamesFetcher: PaginationFetcher<Game> = async (
    page: number,
    pageSize: number,
    query: string,
    _initialData?: Game[],
    params?: { [key: string]: unknown },
): Promise<PaginatedData<Game>> => {
    const baseUrl = await getBaseUrl();
    const sort = typeof params?.sort === 'string' ? params.sort : 'trending';

    const url = `${baseUrl}/api/games?query=${query}&page=${page}&pageSize=${pageSize}&sort=${sort}`;

    const response = await fetch(url);
    return response.json();
};
