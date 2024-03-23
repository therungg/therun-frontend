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
    debounce?: number,
    params?: any,
): PaginationHook<T> {
    const [fullData, setFullData] = useState(initialData);

    useEffect(() => {
        let newInitialData = initialData;
        if (Array.isArray(initialData)) {
            newInitialData = paginateArray(initialData, pageSize, 1);
        }
        setFullData(newInitialData);

        // Reset state based on new initialData
        setData({ "1-": newInitialData });
        setCurrentData(newInitialData);
        // Potentially trigger a new fetch
        fetchData(1, search);
    }, [initialData]);

    if (Array.isArray(initialData)) {
        initialData = paginateArray(initialData, pageSize, 1);
    } else {
        pageSize = fullData.pageSize;
        setFullData(fullData.items);
    }

    if (fetchPage === undefined) {
        fetchPage = genericFetcher;
        debounce = 1;
    } else if (debounce === undefined) {
        debounce = 400;
    }

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
            const result = await fetchPage(
                page,
                pageSize,
                query,
                fullData,
                params,
            );
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
