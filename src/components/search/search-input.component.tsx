import React from 'react';
import { Search as SearchIcon } from 'react-bootstrap-icons';
import { type SearchItemKind } from './use-fuzzy-search';

interface SearchInputProps {
    query: string;
    filters: SearchItemKind[];
    isSearching: boolean;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    onInputFocus: React.FocusEventHandler<HTMLInputElement>;
}

export const SearchInput = React.memo(
    React.forwardRef<HTMLInputElement, SearchInputProps>(
        (
            { isSearching, query, filters, onChange, onInputFocus },
            searchRef,
        ) => {
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
                        placeholder={getPlaceholderText(filters)}
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

SearchInput.displayName = 'SearchInput';

const getPlaceholderText = (filters: SearchItemKind[]) => {
    // TODO: Localize this.
    const labels: Record<SearchItemKind, string> = {
        user: 'User',
        run: 'Run',
        game: 'Game',
    };
    const formatter = new Intl.ListFormat('en-US', {
        style: 'short',
        type: 'disjunction',
    });
    const itemList = formatter.format(filters.map((f) => labels[f]));

    return `Find a ${itemList}`;
};
