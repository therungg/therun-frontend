import React, { useState } from 'react';
import { Search as SearchIcon } from 'react-bootstrap-icons';
import styles from './search-results-panel.module.scss';
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
            const [isFocused, setIsFocused] = useState(false);
            const showBadge = !isFocused && !query;

            const handleFocus: React.FocusEventHandler<HTMLInputElement> = (
                e,
            ) => {
                setIsFocused(true);
                onInputFocus(e);
            };

            const handleBlur = () => {
                setIsFocused(false);
            };

            return (
                <div className="input-group" style={{ position: 'relative' }}>
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
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        id="global-search"
                    />
                    {showBadge && <ShortcutBadge />}
                </div>
            );
        },
    ),
);

SearchInput.displayName = 'SearchInput';

const ShortcutBadge = () => {
    const isMac =
        typeof navigator !== 'undefined' &&
        /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

    return (
        <span className={styles.shortcutBadge}>
            {isMac ? '\u2318' : 'Ctrl+'}K
        </span>
    );
};

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
