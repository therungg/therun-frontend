import { useContext, useEffect, useState } from "react";
import {
    PaginatedData,
    PaginationFetcher,
    PaginationHook,
} from "~src/components/pagination/pagination.types";
import { PaginationContext } from "~src/components/pagination/pagination.context";
import { useDebounce } from "usehooks-ts";
import { paginateArray } from "~src/components/pagination/paginate-array";
import { genericFetcher } from "~src/components/pagination/fetchers/generic-fetcher";

function usePagination<T>(
    initialData: PaginatedData<T> | T[],
    fetchPage?: PaginationFetcher<T>,
    pageSize: number = 10,
    debounce: number = 400,
): PaginationHook<T> {
    let fullData = initialData;

    if (Array.isArray(initialData)) {
        initialData = paginateArray(initialData, pageSize, 1);
    } else {
        pageSize = fullData.pageSize;
        fullData = fullData.items;
    }

    if (fetchPage === undefined) fetchPage = genericFetcher;

    const [data, setData] = useState<{ [key: string]: PaginatedData<T> }>({
        "1-": initialData,
    });
    const [currentData, setCurrentData] = useState(initialData);
    const [isLoading, setIsLoading] = useState(false);

    const { search, currentPage } = useContext(PaginationContext);
    const debouncedSearch = useDebounce(search, debounce);

    useEffect(() => {
        fetchData(1, debouncedSearch);
    }, [debouncedSearch]);

    useEffect(() => {
        fetchData(currentPage, search);
    }, [currentPage]);

    useEffect(() => {
        if (data[`${currentPage}-${search}`]) {
            fetchData(currentPage, search);
        } else {
            setIsLoading(true);
        }
    }, [search]);

    const fetchData = async (page: number, query: string) => {
        setIsLoading(true);

        if (data[`${currentPage}-${query}`]) {
            setCurrentData(data[`${currentPage}-${query}`]);
        } else {
            const result = await fetchPage(page, pageSize, query, fullData);
            setCurrentData(result);

            setData((prevData) => ({
                ...prevData,
                [`${page}-${query}`]: result,
            }));
        }
        setIsLoading(false);
    };

    return {
        data: currentData.items,
        isLoading,
        totalItems: currentData.totalItems,
        totalPages: currentData.totalPages,
        page: currentData.page,
        pageSize: currentData.pageSize,
    };
}

export default usePagination;
