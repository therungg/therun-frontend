import React from "react";
import { Search as SearchIcon } from "react-bootstrap-icons";
import { SearchFilterValues, UniqueArray } from "./global-search.component";

interface SearchInputProps {
    query: string;
    filter?: UniqueArray<SearchFilterValues>;
    isSearching: boolean;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    onInputFocus: React.FocusEventHandler<HTMLInputElement>;
}

export const SearchInput = React.memo(
    React.forwardRef<HTMLInputElement, SearchInputProps>(
        ({ isSearching, query, filter, onChange, onInputFocus }, searchRef) => {
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
                        placeholder={getPlaceholderText(filter)}
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

const getPlaceholderText = (filter?: UniqueArray<SearchFilterValues>) => {
    const fallbackText = "Find a User or Game";

    if (!filter?.length) return fallbackText;

    if (filter.length === 1) {
        return `Find a ${filter[0] === "user" ? "User" : "Game"}`;
    }

    return fallbackText;
};
