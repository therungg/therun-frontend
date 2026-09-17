import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import { genericFetcher } from '~src/components/pagination/fetchers/generic-fetcher';
import { paginateArray } from '~src/components/pagination/paginate-array';
import { PaginationContext } from '~src/components/pagination/pagination.context';
import {
    PaginatedData,
    PaginationFetcher,
    PaginationHook,
} from '~src/components/pagination/pagination.types';

function usePagination<T>(
    initialData: PaginatedData<T> | T[],
    fetchPage?: PaginationFetcher<T>,
    pageSize: number = 10,
    debounce?: number,
    params?: { [key: string]: unknown },
): PaginationHook<T> {
    let fullData = initialData;

    if (Array.isArray(initialData)) {
        initialData = paginateArray(initialData, pageSize, 1);
    } else {
        pageSize = fullData.pageSize;
        fullData = fullData.items;
    }

    if (fetchPage === undefined) {
        fetchPage = genericFetcher;
        debounce = 1;
    } else if (debounce === undefined) {
        debounce = 400;
    }

    // Stable string form of `params` for cache keys and the effect below.
    // Some call sites (e.g. games sort) pass an inline object literal, a
    // fresh reference every render, so anything keyed or watched on
    // `params` itself would never hit the cache / would refetch every
    // render. Other call sites (e.g. race participations) pass a large,
    // stable array prop — memoize on `params` identity so those only pay
    // the JSON.stringify cost when the value actually changes, not on
    // every render. When params is undefined (generic-fetcher,
    // races-fetcher's siblings, leaderboard-fetcher today) this is '',
    // which keeps their cache keys byte-identical to before.
    const paramsKey = useMemo(
        () => (params ? JSON.stringify(params) : ''),
        [params],
    );
    const buildKey = (page: number, query: string) =>
        paramsKey ? `${page}-${query}-${paramsKey}` : `${page}-${query}`;

    const [data, setData] = useState<{ [key: string]: PaginatedData<T> }>({
        [buildKey(1, '')]: initialData,
    });
    const [currentData, setCurrentData] = useState(initialData);
    const [isLoading, setIsLoading] = useState(false);

    const { search, currentPage, setCurrentPage } =
        useContext(PaginationContext);
    const [debouncedSearch] = useDebounceValue(search, debounce);

    const fetchData = useCallback(
        async (page: number, query: string) => {
            setIsLoading(true);

            const readKey = buildKey(currentPage, query);
            const writeKey = buildKey(page, query);

            if (data[readKey]) {
                setCurrentData(data[readKey]);
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
                    [writeKey]: result,
                }));
            }
            setIsLoading(false);
        },
        [currentPage, data, fetchPage, fullData, pageSize, params, paramsKey],
    );

    useEffect(() => {
        fetchData(1, debouncedSearch);
    }, [debouncedSearch]);

    useEffect(() => {
        fetchData(currentPage, search);
    }, [currentPage]);

    useEffect(() => {
        if (data[buildKey(currentPage, search)]) {
            fetchData(currentPage, search);
        } else {
            setIsLoading(true);
        }
    }, [search]);

    // A sort/filter change riding in `params` invalidates the current page
    // of results just as much as a search or page change does — refetch and
    // land back on page 1. Guard on the serialized string, not on `params`
    // object identity, since a new literal is passed in on every render.
    useEffect(() => {
        fetchData(1, search);
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paramsKey]);

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
