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
    // the stringify cost when the value actually changes, not on every
    // render. When params is undefined (generic-fetcher, races-fetcher's
    // siblings, leaderboard-fetcher today) this is '', which keeps their
    // cache keys byte-identical to before.
    //
    // An array param (race participations, one object per race) is keyed
    // on its length rather than JSON.stringify'd whole: it can carry
    // hundreds of full participant records, and JSON.stringify-ing all of
    // them on every params change was pure cost for a value only ever
    // used as a cache-key/effect-dependency string, never compared for
    // content. Length is stable and cheap; it stays correct here because
    // the only thing that changes a participations array for a given
    // hook instance is the participant count itself.
    const paramsKey = useMemo(() => {
        if (!params) return '';
        if (Array.isArray(params)) return `array:${params.length}`;
        return JSON.stringify(params);
    }, [params]);
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
    //
    // When we're not already on page 1, only reset the page here and let
    // the [currentPage] effect above do the actual fetch — calling
    // fetchData(1, ...) from both effects fired the same request twice
    // (once here with the stale currentPage still in the readKey, once
    // more from the currentPage effect once the reset landed). When we're
    // already on page 1, setCurrentPage(1) is a no-op and that effect will
    // never fire, so this one has to fetch itself.
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        } else {
            fetchData(1, search);
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
