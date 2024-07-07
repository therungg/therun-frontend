"use client";
import React, { useState } from "react";
import { Search as SearchIcon } from "react-bootstrap-icons";
import { SearchResults } from "./find-user-or-run";
import useSWR from "swr";
import { useDebounce } from "usehooks-ts";
import { FuzzyMatchHighlight } from "./fuzzy-match-highlight";
import { useAggregatedResults } from "./use-aggregated-results";
import { useFilteredFuzzySearch, useFuseSearch } from "./use-fuzzy-search";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
// import { getFormattedString } from "../util/datetime";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const toTitleCase = (text: string) =>
    text.charAt(0).toUpperCase() + text.substring(1).toLowerCase();

const MAX_SEARCH_RESULTS = 15;

// TODO: Split apart the results from the search
// If the input is its own component and continues to put the search term in the queryparams
// then we can make the results a server component by reading from the queryparams
export const GlobalSearch = () => {
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
            params.set("q", query);
        }
        router.push(`${pathname}?${params.toString()}`);
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
        () => Object.entries(filteredResults),
        [filteredResults],
    );
    //const resultsLength = fuse._docs?.length; Unsure about this right now
    const onChange: React.ChangeEventHandler<HTMLInputElement> =
        React.useCallback((e) => {
            e.preventDefault();
            const userInput = e.target.value;
            setQuery(userInput);
            setIsResultsPanelOpen(!!userInput);
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
            <div className="input-group">
                <label
                    htmlFor="global-search"
                    className="input-group-text w-42p"
                >
                    {isLoading ? (
                        <div
                            className="spinner-border spinner-border-sm"
                            role="status"
                        />
                    ) : (
                        <SearchIcon size={18} />
                    )}
                </label>
                <input
                    ref={searchRef}
                    type="search"
                    autoComplete="off"
                    className="form-control"
                    placeholder="Find a User or Game"
                    onChange={onChange}
                    value={query}
                    onFocus={() => setIsResultsPanelOpen(true)}
                    id="global-search"
                />
            </div>
            {query && isResultsPanelOpen ? (
                <div
                    ref={resultsPanelRef}
                    className="dropdown-menu d-block mt-2 py-0 overflow-y-auto w-100 mh-400p"
                >
                    <dl className="list-group mb-1">
                        {!searchResultEntries.length && !isSearching && (
                            <dt className="m-2 fw-semibold text-truncate">
                                <span className="fs-smaller">
                                    No results found
                                </span>
                            </dt>
                        )}
                        {isSearching && !searchResultEntries.length && (
                            <dt className="m-2 fw-semibold">
                                <span className="fs-smaller">Searching...</span>
                            </dt>
                        )}
                        {!!searchResultEntries.length &&
                            searchResultEntries
                                .slice(0, MAX_SEARCH_RESULTS)
                                .map(([type, results], index) => (
                                    <React.Fragment key={index}>
                                        <dt
                                            className={`${
                                                0 !== index &&
                                                "pt-1 mt-1 border-top"
                                            } py-1 px-2 fw-semibold border-bottom text-truncate pe-none fs-smaller`}
                                        >
                                            {toTitleCase(type)}
                                        </dt>
                                        {results.map((result, index) => {
                                            const url =
                                                result.type === "user"
                                                    ? `/${result.key}`
                                                    : `/games/${result.key}`;
                                            return (
                                                <dd
                                                    key={index}
                                                    className="list-group-item-action m-0"
                                                >
                                                    <Link
                                                        href={url}
                                                        title={result.key}
                                                        className="d-block text-decoration-none px-3 py-1 text-truncate text-body lh-sm"
                                                    >
                                                        <FuzzyMatchHighlight
                                                            result={result.key}
                                                            highlights={
                                                                result.matches
                                                            }
                                                        />
                                                    </Link>
                                                </dd>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                        {/*{resultsLength > MAX_SEARCH_RESULTS && (
                            <li className="list-group-item-action border-top mt-1">
                                <Link
                                    href={`/search?q=${encodeURIComponent(
                                        query,
                                    )}`}
                                    className="d-block text-decoration-none px-2 py-1"
                                >
                                    View all results
                                </Link>
                            </li>
                        )}*/}
                    </dl>
                </div>
            ) : null}
        </div>
    );
};
