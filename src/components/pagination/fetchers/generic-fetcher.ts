'use client';

import { paginateArray } from '~src/components/pagination/paginate-array';
import { PaginatedData } from '~src/components/pagination/pagination.types';
import { includesCaseInsensitive } from '~src/utils/string';

export async function genericFetcher<T>(
    page = 1,
    pageSize = 10,
    query?: string,
    initialData?: T[],
): Promise<PaginatedData<T>> {
    const newItems =
        initialData?.filter((item) => {
            return includesCaseInsensitive(query || '', JSON.stringify(item));
        }) || [];

    return paginateArray(newItems, pageSize, page);
}
