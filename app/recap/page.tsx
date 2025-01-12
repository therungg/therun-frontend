"use client";

import { Col } from "react-bootstrap";
import { PatreonBunnyHeartWithoutLink } from "~app/patron/patreon-info";
import { getSession } from "~src/actions/session.action";
import { TwitchLoginButton } from "~src/components/twitch/TwitchLoginButton";
import { getWrappedForUser } from "~src/lib/wrapped";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebounceValue } from "usehooks-ts";
import useSWR from "swr";
import { useAggregatedResults } from "~src/components/search/use-aggregated-results";
import { SearchResults } from "~src/components/search/find-user-or-run";
import {
    SearchItem,
    useFilteredFuzzySearch,
    useFuseSearch,
} from "~src/components/search/use-fuzzy-search";
import Link from "next/link";
import { FuzzyMatchHighlight } from "~src/components/search/fuzzy-match-highlight.component";
import { Search as SearchIcon } from "react-bootstrap-icons";
import { User } from "types/session.types";

export default function Page() {
    const [session, setSession] = useState<User | null>(null);
    const [hasSession, setHasSession] = useState(false);

    useEffect(() => {
        async function fetchSession() {
            try {
                const sessionData = await getSession();
                setSession(sessionData);

                // If session exists, preload wrapped data
                if (sessionData?.id && sessionData.id !== "") {
                    setHasSession(true);

                    try {
                        await getWrappedForUser(sessionData.user);
                    } catch (wrappedError) {
                        console.error(
                            "Error preloading wrapped data:",
                            wrappedError,
                        );
                    }
                }
                // eslint-disable-next-line
            } catch {}
        }

        fetchSession();
    }, []);

    return (
        <Col width="100%">
            <div className="text-center">
                <h1 className="display-2 mb-4">
                    Your 2024 Recap from The Run is Here!
                </h1>
                <div className="fs-5 mb-5">
                    <p>
                        We've been watching from the sidelines here at The Run,
                        and we've seen the{" "}
                        <b>
                            <i>incredible</i>
                        </b>{" "}
                        amount of dedication you've poured into your favorite
                        speed games.
                    </p>
                    <p>We think this is worth celebrating.</p>
                    <p>
                        We've compiled your 2024 stats into a Recap which you
                        can view and share with others in your community.
                    </p>
                    <p>
                        We hope the Recap can bring you some joy, laughs,
                        intrigue, and - most importantly - pride in yourself and
                        all you have achieved.
                    </p>
                </div>
                <div className="mb-5">
                    {hasSession && session ? (
                        <a
                            href={`/${session.user}/recap`}
                            className="btn btn-lg btn-primary mb-4"
                        >
                            View your 2024 Recap
                        </a>
                    ) : (
                        <>
                            <p className="fs-6 leading-relaxed mb-4">
                                To view your 2024 Recap, please login with
                                Twitch.
                            </p>
                            <TwitchLoginButton url="/api/recap" />
                        </>
                    )}
                </div>
                <div className="mb-3">
                    <p className="fs-6">
                        Or, search your username or any other username below to
                        access the Recap:
                    </p>
                </div>
                <div className="w-auto d-inline-block mb-5">
                    <UsernameSearch />
                </div>

                <Col className="justify-content-center">
                    <p className="display-6">Here's to 2025!</p>
                    <PatreonBunnyHeartWithoutLink size={125} />
                    <p className="mt-3">
                        -- Joey and <b>The</b>{" "}
                        <span
                            style={{
                                color: "var(--bs-link-color)",
                                fontWeight: "bold",
                            }}
                        >
                            Run
                        </span>
                    </p>
                </Col>
            </div>
        </Col>
    );
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const MAX_SEARCH_RESULTS = 15;

const UsernameSearch = React.memo(() => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [query, setQuery] = useState(searchParams.get("q") ?? "");
    const [isResultsPanelOpen, setIsResultsPanelOpen] = useState(false);
    const searchRef = React.useRef<HTMLInputElement>(null);
    const resultsPanelRef = React.useRef<HTMLDivElement>(null);
    const [debouncedQuery] = useDebounceValue(query, 300);

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

UsernameSearch.displayName = "UsernameSearch";

interface SearchResultsPanelProps {
    searchResults: [string, SearchItem[]][];
    isSearching: boolean;
}

export const SearchResultsPanel = React.memo(
    React.forwardRef<HTMLDivElement, SearchResultsPanelProps>(
        ({ searchResults, isSearching }, resultsPanelRef) => {
            return (
                <div
                    ref={resultsPanelRef}
                    className="dropdown-menu d-block mt-2 py-0 overflow-y-auto w-100 mh-400p"
                >
                    <dl className="list-group">
                        {!searchResults.length && !isSearching && (
                            <dt className="m-2 fw-semibold text-truncate fs-smaller">
                                No results found
                            </dt>
                        )}
                        {isSearching && !searchResults.length && (
                            <dt className="m-2 fw-semibold fs-smaller">
                                Searching...
                            </dt>
                        )}
                        {searchResults?.map(([_, results], index) => (
                            <React.Fragment key={index}>
                                {results
                                    .filter((result) => result.type === "user")
                                    .map((result) => (
                                        <SearchResultItem
                                            key={result.key}
                                            result={result}
                                        />
                                    ))}
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
            );
        },
    ),
);

SearchResultsPanel.displayName = "SearchResultsPanel";

interface SearchResultItemProps {
    result: SearchItem;
}

const SearchResultItem = React.memo<SearchResultItemProps>(({ result }) => {
    return (
        <dd className="list-group-item-action m-0">
            <Link
                href={`/${result.key}/recap`}
                title={result.key}
                className="d-block text-decoration-none px-3 py-1 text-truncate text-body lh-sm"
            >
                <FuzzyMatchHighlight
                    result={result.key}
                    highlights={result.matches}
                />
            </Link>
        </dd>
    );
});

SearchResultItem.displayName = "SearchResultItem";

interface SearchInputProps {
    query: string;
    isSearching: boolean;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    onInputFocus: React.FocusEventHandler<HTMLInputElement>;
}

const SearchInput = React.memo(
    React.forwardRef<HTMLInputElement, SearchInputProps>(
        ({ isSearching, query, onChange, onInputFocus }, searchRef) => {
            return (
                <div className="input-group">
                    <label
                        htmlFor="global-search"
                        className="input-group-text w-42p"
                    >
                        {isSearching ? (
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
                        placeholder="Find a User"
                        onChange={onChange}
                        value={query}
                        onFocus={onInputFocus}
                        id="global-search"
                    />
                </div>
            );
        },
    ),
);

SearchInput.displayName = "SearchInput";
