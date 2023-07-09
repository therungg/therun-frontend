import { PaginatedGameResult } from "~app/games/games.types";

const fetchData = async (url: string, revalidate: number = 0) => {
    // const res = await fetch(url, { next: { revalidate: 60 * 30 } });
    const res = await fetch(url, { next: { revalidate } });

    const json = await res.json();

    return json.result;
};

export const getGamesPagesFromSearchParams = async (
    searchParams: URLSearchParams
) => {
    const query = searchParams.get("query");
    const page = searchParams.get("page");
    const pageSize = searchParams.get("pageSize");

    return getGamesPage(
        query ?? undefined,
        page ? parseInt(page) : undefined,
        pageSize ? parseInt(pageSize) : undefined
    );
};

export const getGamesPage = async (
    query: string = "",
    page: number = 1,
    pageSize: number = 10
): Promise<PaginatedGameResult> => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/games?query=${query}&page=${page}&pageSize=${pageSize}`;

    return fetchData(url, 60 * 60);
};

export const getTabulatedGameStats = async () => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/games`;

    return fetchData(url);
};

export const getTabulatedGameStatsPopular = async () => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/games/stats/`;

    return fetchData(url, 60 * 60 * 2);
};
