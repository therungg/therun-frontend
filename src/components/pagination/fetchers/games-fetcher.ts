"use client";

import { Game } from "~app/(old-layout)/games/games.types";
import { getBaseUrl } from "~src/actions/base-url.action";
import {
    PaginatedData,
    PaginationFetcher,
} from "~src/components/pagination/pagination.types";

export const gamesFetcher: PaginationFetcher<Game> = async (
    page: number,
    pageSize: number,
    query: string,
): Promise<PaginatedData<Game>> => {
    const baseUrl = await getBaseUrl();

    const url = `${baseUrl}/api/games?query=${query}&page=${page}&pageSize=${pageSize}`;

    const response = await fetch(url);
    return response.json();
};
