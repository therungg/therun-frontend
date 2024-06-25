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
    page: number,
    pageSize: number,
    query?: string,
    initialData?: T[],
    params?: { [key: string]: unknown },
) => Promise<PaginatedData<T>>;
