"use client";

import {
    PaginatedData,
    PaginationFetcher,
} from "~src/components/pagination/pagination.types";
import { Count } from "~app/games/[game]/game.types";
import { paginateArray } from "~src/components/pagination/paginate-array";
import { includesCaseInsensitive } from "~src/utils/string";

export const leaderboardFetcher: PaginationFetcher<Count> = async (
    page: number,
    pageSize: number,
    query: string,
    initialData: Count[],
): Promise<PaginatedData<Count>> => {
    const newItems = initialData.filter((item) => {
        return includesCaseInsensitive(query, item.username);
    });

    return paginateArray(newItems, pageSize, page);
};
