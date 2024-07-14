import React from "react";
import { Search as SearchIcon } from "react-bootstrap-icons";

interface SearchInputProps {
    query: string;
    isSearching: boolean;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    onInputFocus: React.FocusEventHandler<HTMLInputElement>;
}

export const SearchInput = React.memo(
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
                        placeholder="Find a User or Game"
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
