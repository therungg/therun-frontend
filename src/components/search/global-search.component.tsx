"use client";
import React, { useState } from "react";
import { SearchResults } from "./find-user-or-run";
import useSWR from "swr";
import { useDebounce } from "usehooks-ts";
import { useAggregatedResults } from "./use-aggregated-results";
import { useFilteredFuzzySearch, useFuseSearch } from "./use-fuzzy-search";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchInput } from "./search-input.component";
import { SearchResultsPanel } from "./search-results-panel.component";
// import { getFormattedString } from "../util/datetime";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const MAX_SEARCH_RESULTS = 15;

// TODO: Split apart the results from the search
// If the input is its own component and continues to put the search term in the queryparams
// then we can make the results a server component by reading from the queryparams
export const GlobalSearch = React.memo(() => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [query, setQuery] = useState(searchParams.get("q") ?? "");
    const [isResultsPanelOpen, setIsResultsPanelOpen] = useState(false);
    const searchRef = React.useRef<HTMLInputElement>(null);
    const resultsPanelRef = React.useRef<HTMLDivElement>(null);
    const debouncedQuery = useDebounce(query, 300);

    const {
        data: searchResults,
        error: _error,
        isLoading,
    } = useSWR<SearchResults>(
        debouncedQuery ? `/api/search?q=${debouncedQuery}` : null,
        fetcher,
        // This avoids duplicate searches for the same key
        // _but_ won't act as a debounce.
        { dedupingInterval: 500 },
    );
    const aggregatedResults = useAggregatedResults(searchResults);
    React.useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (!query) {
            params.delete("q");
        } else {
            params.set("q", encodeURIComponent(query));
        }
        const url =
            `${pathname}` + (params.size ? `?${params.toString()}` : "");

        window.history.replaceState(
            { ...window.history.state, as: url, url },
            "",
            url,
        );
    }, [pathname, query, router, searchParams]);

    // Will be useful for correctly displaying a run in the search results
    // const getFormattedRunData = React.useCallback(
    //     (result: string, runData: RunData) => {
    //         const run = result.split("//");
    //         if (run.length !== 3) return null;
    //         const [username, game, category] = run;
    //         const pb = runData.pbgt ? runData.pbgt : runData.pb;

    //         return `${game} - ${category} by ${username} in ${getFormattedString(
    //             pb,
    //         )}`;
    //     },
    //     [],
    // );

    const fuse = useFuseSearch(aggregatedResults);
    const filteredResults = useFilteredFuzzySearch(fuse, query);
    const searchResultEntries = React.useMemo(
        () => Object.entries(filteredResults).slice(0, MAX_SEARCH_RESULTS),
        [filteredResults],
    );
    //const resultsLength = fuse._docs?.length; Unsure about this right now
    const handleInputChange: React.ChangeEventHandler<HTMLInputElement> =
        React.useCallback((e) => {
            e.preventDefault();
            const userInput = e.target.value;
            setQuery(userInput);
            setIsResultsPanelOpen(!!userInput);
        }, []);

    const handleInputFocus: React.FocusEventHandler<HTMLInputElement> =
        React.useCallback(() => {
            setIsResultsPanelOpen(true);
        }, []);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                resultsPanelRef.current &&
                !resultsPanelRef.current.contains(event.target as Node) &&
                searchRef.current &&
                !searchRef.current.contains(event.target as Node)
            ) {
                setIsResultsPanelOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const isSearching = React.useMemo(() => {
        if (!query) return false;
        /*
            If the query is different from the debounced query then we know
            that when they match that it'll trigger a new API call with useSWR.
            In other words, this is a signal that a search is _coming_.
        */
        if (query !== debouncedQuery) return true;
        /*
            If isLoading from SWR then we know we have a network request in flight.
            We are quite literally searching.
        */
        // eslint-disable-next-line sonarjs/prefer-single-boolean-return
        if (isLoading) return true;

        return false;
    }, [debouncedQuery, isLoading, query]);

    return (
        <div className="position-relative">
            <SearchInput
                query={query}
                isSearching={isSearching}
                onChange={handleInputChange}
                onInputFocus={handleInputFocus}
                ref={searchRef}
            />
            {query && isResultsPanelOpen ? (
                <SearchResultsPanel
                    searchResults={searchResultEntries}
                    isSearching={isSearching}
                    ref={resultsPanelRef}
                />
            ) : null}
        </div>
    );
});

GlobalSearch.displayName = "GlobalSearch";
