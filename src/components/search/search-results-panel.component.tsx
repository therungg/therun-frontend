import React from "react";
import type { SearchItem } from "./use-fuzzy-search";
import Link from "next/link";
import { FuzzyMatchHighlight } from "./fuzzy-match-highlight.component";

interface SearchResultsPanelProps {
    searchResults: [string, SearchItem[]][];
    showHeader: boolean;
    isSearching: boolean;
}

const toTitleCase = (text: string) =>
    text.charAt(0).toUpperCase() + text.substring(1).toLowerCase();

export const SearchResultsPanel = React.memo(
    React.forwardRef<HTMLDivElement, SearchResultsPanelProps>(
        ({ searchResults, showHeader, isSearching }, resultsPanelRef) => {
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
                        {searchResults?.map(([type, results], index) => (
                            <React.Fragment key={index}>
                                {showHeader && (
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
        <dd className="m-0">
            <Link
                href={url}
                title={result.key}
                className="list-group-item-action d-block text-decoration-none px-3 py-1 text-truncate text-body lh-sm"
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
