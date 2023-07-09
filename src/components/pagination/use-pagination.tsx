import { useContext, useEffect, useState } from "react";
import {
    PaginatedData,
    PaginationFetcher,
    PaginationHook,
} from "~src/components/pagination/pagination.types";
import { PaginationContext } from "~src/components/pagination/pagination.context";
import { useDebounce } from "usehooks-ts";

function usePagination<T>(
    initialData: PaginatedData<T>,
    fetchPage: PaginationFetcher<T>,
    pageSize: number = 10
): PaginationHook<T> {
    const [data, setData] = useState<{ [key: string]: PaginatedData<T> }>({
        "1-": initialData,
    });
    const [currentData, setCurrentData] = useState(initialData);
    const [isLoading, setIsLoading] = useState(false);

    const { search, currentPage } = useContext(PaginationContext);
    const debouncedSearch = useDebounce(search, 400);

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
            const result = await fetchPage(page, pageSize, query, initialData);
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
