"use client";

import { PaginatedData } from "~src/components/pagination/pagination.types";
import { paginateArray } from "~src/components/pagination/paginate-array";
import { includesCaseInsensitive } from "~src/utils/string";

export async function genericFetcher<T>(
    page: number,
    pageSize: number,
    query: string,
    initialData: T[],
): Promise<PaginatedData<T>> {
    const newItems = initialData.filter((item) => {
        return includesCaseInsensitive(query, JSON.stringify(item));
    });

    return paginateArray(newItems, pageSize, page);
}
