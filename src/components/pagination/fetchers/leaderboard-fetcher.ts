'use client';

import { paginateArray } from '~src/components/pagination/paginate-array';
import {
    PaginatedData,
    PaginationFetcher,
} from '~src/components/pagination/pagination.types';
import { Count } from '~src/types/game-stats.types';
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
