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
        { dedupingInterval: 500 }, // Optional: Reduce the frequency of calls
    );
    const aggregatedResults = useAggregatedResults(searchResults);
    const isSearchEmpty = React.useMemo(() => {
        const searchKinds = Object.values(aggregatedResults);
        return searchKinds.every((kind) => !Object.values(kind).length);
    }, [aggregatedResults]);

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
    const filteredResults = useFilteredFuzzySearch(fuse, debouncedQuery);
    // @ts-expect-error private type
    const resultsLength = fuse._docs?.length;
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
            {query && !isSearchEmpty && isResultsPanelOpen ? (
                <div
                    ref={resultsPanelRef}
                    className="dropdown-menu d-block text-center mt-2 py-0 overflow-y-auto w-100 mh-400p"
                >
                    <dl className="list-group">
                        {Object.entries(filteredResults)
                            .slice(0, MAX_SEARCH_RESULTS)
                            .map(([type, results], index) => (
                                <React.Fragment key={index}>
                                    <dt className="mt-2 pe-none">
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
                                                    className="d-block text-decoration-none px-2 py-1 text-truncate"
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
                        {resultsLength > MAX_SEARCH_RESULTS && (
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
                        )}
                    </dl>
                </div>
            ) : null}
        </div>
    );
};
