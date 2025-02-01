import React from "react";
import type { SearchItem } from "./use-fuzzy-search";
import Link from "next/link";
import { FuzzyMatchHighlight } from "./fuzzy-match-highlight.component";
import { SearchFilterValues, UniqueArray } from "./global-search.component";

interface SearchResultsPanelProps {
    searchResults: [string, SearchItem[]][];
    filter: UniqueArray<SearchFilterValues>;
    isSearching: boolean;
}

const toTitleCase = (text: string) =>
    text.charAt(0).toUpperCase() + text.substring(1).toLowerCase();

export const SearchResultsPanel = React.memo(
    React.forwardRef<HTMLDivElement, SearchResultsPanelProps>(
        ({ searchResults, filter, isSearching }, resultsPanelRef) => {
            const filteredResults = React.useMemo(() => {
                if (!filter?.length) {
                    return searchResults;
                }

                return searchResults
                    .map(
                        ([type, items]) =>
                            [
                                type,
                                items.filter((item) =>
                                    filter.includes(
                                        item.type as SearchFilterValues,
                                    ),
                                ),
                            ] as [string, SearchItem[]],
                    )
                    .filter(([_, items]) => items.length > 0);
            }, [searchResults, filter]);

            return (
                <div
                    ref={resultsPanelRef}
                    className="dropdown-menu d-block mt-2 py-0 overflow-y-auto w-100 mh-400p"
                >
                    <dl className="list-group">
                        {!filteredResults.length && !isSearching && (
                            <dt className="m-2 fw-semibold text-truncate fs-smaller">
                                No results found
                            </dt>
                        )}
                        {isSearching && !filteredResults.length && (
                            <dt className="m-2 fw-semibold fs-smaller">
                                Searching...
                            </dt>
                        )}
                        {filteredResults?.map(([type, results], index) => (
                            <React.Fragment key={index}>
                                {(!filter || filter.length !== 1) && (
                                    <dt
                                        className={`${
                                            0 !== index &&
                                            "pt-1 mt-1 border-top"
                                        } py-1 px-2 fw-semibold border-bottom text-truncate pe-none fs-smaller`}
                                    >
                                        {toTitleCase(type)}
                                    </dt>
                                )}
                                {results.map((result) => (
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
    const url =
        result.type === "user" ? `/${result.key}` : `/games/${result.key}`;
    return (
        <dd className="list-group-item-action m-0">
            <Link
                href={url}
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
