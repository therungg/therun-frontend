'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { useDebounceValue } from 'usehooks-ts';
import { fetcher } from '~src/utils/fetcher';
import styles from './your-stats.module.scss';

interface SearchResult {
    users?: Array<{ user: string }>;
}

export const YourStatsSearch = () => {
    const router = useRouter();
    const [searchInput, setSearchInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [debouncedQuery] = useDebounceValue(searchInput, 300);

    const { data: searchResults, isLoading: isSearching } =
        useSWR<SearchResult>(
            debouncedQuery ? `/api/search?q=${debouncedQuery}` : null,
            fetcher,
            { dedupingInterval: 500 },
        );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(event.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleNavigate = (username: string) => {
        const clean = username.startsWith('/') ? username.slice(1) : username;
        if (clean.trim()) {
            router.push(`/${clean}`);
        }
    };

    return (
        <div className={styles.searchContainer}>
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '320px',
                }}
            >
                <div className={styles.searchInputGroup}>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Enter username..."
                        autoComplete="off"
                        data-lpignore="true"
                        data-form-type="other"
                        value={searchInput}
                        onChange={(e) => {
                            setSearchInput(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && searchInput.trim()) {
                                handleNavigate(searchInput);
                            }
                        }}
                        className={styles.searchInput}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            if (searchInput.trim()) {
                                handleNavigate(searchInput);
                            }
                        }}
                        className={styles.searchButton}
                    >
                        Search
                    </button>
                </div>

                {searchInput && showSuggestions && (
                    <div
                        ref={suggestionsRef}
                        className={styles.suggestionsDropdown}
                    >
                        {isSearching ? (
                            <div className={styles.suggestionLoading}>
                                Searching...
                            </div>
                        ) : searchResults?.users &&
                          searchResults.users.length > 0 ? (
                            searchResults.users.map((userResult) => (
                                <button
                                    key={userResult.user}
                                    type="button"
                                    onClick={() =>
                                        handleNavigate(userResult.user)
                                    }
                                    className={styles.suggestionItem}
                                >
                                    {userResult.user}
                                </button>
                            ))
                        ) : (
                            <div className={styles.suggestionLoading}>
                                No users found
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
