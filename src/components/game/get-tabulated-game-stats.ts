import { cacheLife } from 'next/cache';
import { Game, PaginatedGameResult } from '~app/(new-layout)/games/games.types';
import { getApiKey } from '~src/actions/api-key.action';

const fetchData = async (url: string) => {
    const res = await fetch(url, {
        headers: {
            'x-api-key': await getApiKey(),
        },
    });

    const json = await res.json();

    return json.result;
};

export const getGamesPagesFromSearchParams = async (
    searchParams: URLSearchParams,
) => {
    const query = searchParams.get('query');
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');
    const sort = searchParams.get('sort');

    return getGamesPage(
        query ?? undefined,
        page ? parseInt(page) : undefined,
        pageSize ? parseInt(pageSize) : undefined,
        sort ?? undefined,
    );
};

export const getGamesPage = async (
    query: string = '',
    page: number = 1,
    pageSize: number = 60,
    sort: string = 'trending',
): Promise<PaginatedGameResult> => {
    'use cache';
    cacheLife('hours');

    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/games?query=${query}&page=${page}&pageSize=${pageSize}&sort=${sort}`;

    return fetchData(url);
};

export const getTabulatedGameStats = async () => {
    'use cache';
    cacheLife('hours');

    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/games`;

    return fetchData(url);
};

export const getTabulatedGameStatsPopular = async (): Promise<Game[]> => {
    'use cache';
    cacheLife('hours');

    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/games/stats/`;

    return fetchData(url);
};
