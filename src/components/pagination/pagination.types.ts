export interface PaginatedData<T> {
    pageSize: number;
    page: number;
    totalPages: number;
    totalItems: number;
    items: T[];
}

export interface PaginationHook<T> {
    isLoading: boolean;
    totalItems: number;
    data: T[];
    totalPages: number;
    pageSize: number;
    page: number;
}

export type PaginationFetcher<T> = (
    // eslint-disable-next-line no-unused-vars
    page: number,
    // eslint-disable-next-line no-unused-vars
    pageSize: number,
    // eslint-disable-next-line no-unused-vars
    query: string,
    // eslint-disable-next-line no-unused-vars
    initialData: T[]
) => Promise<PaginatedData<T>>;
