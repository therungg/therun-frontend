import { PaginatedData } from '~src/components/pagination/pagination.types';

export function paginateArray<T>(
    subject: T[],
    pageSize: number,
    page: number,
    totalItemsOverride?: number,
): PaginatedData<T> {
    const totalItems = totalItemsOverride || subject.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, totalItems);

    const items = subject.slice(start, end);

    return {
        items,
        totalItems,
        totalPages,
        page,
        pageSize,
    };
}
