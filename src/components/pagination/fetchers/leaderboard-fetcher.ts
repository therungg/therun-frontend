'use client';

import { Count } from '~app/(old-layout)/games/[game]/game.types';
import { paginateArray } from '~src/components/pagination/paginate-array';
import {
    PaginatedData,
    PaginationFetcher,
} from '~src/components/pagination/pagination.types';
import { includesCaseInsensitive } from '~src/utils/string';

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
