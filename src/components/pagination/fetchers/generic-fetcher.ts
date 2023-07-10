"use client";

import { PaginatedData } from "~src/components/pagination/pagination.types";
import { paginateArray } from "~src/components/pagination/paginate-array";

export async function genericFetcher<T>(
    page: number,
    pageSize: number,
    query: string,
    initialData: PaginatedData<T>
): Promise<PaginatedData<T>> {
    return paginateArray(initialData.items, page, pageSize);
}
