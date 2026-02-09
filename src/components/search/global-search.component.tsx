'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useState } from 'react';
import useSWR from 'swr';
import { useDebounceValue } from 'usehooks-ts';
import { fetcher } from '~src/utils/fetcher';
import { SearchResults } from './find-user-or-run';
import { SearchInput } from './search-input.component';
import { SearchResultsPanel } from './search-results-panel.component';
import { type SearchItemKind } from './use-fuzzy-search';

const DEFAULT_FILTER_VALUES = ['user', 'run'] as SearchItemKind[];

interface SearchProps {
    filter?: SearchItemKind[];
    urlSuffix?: string;
}

export const GlobalSearch = React.memo<SearchProps>(
    ({ filter = DEFAULT_FILTER_VALUES, urlSuffix }) => {
        const pathname = usePathname();
        const searchParams = useSearchParams();
        const router = useRouter();

        const [query, setQuery] = useState(searchParams.get('q') ?? '');
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
            { dedupingInterval: 500 },
        );

        React.useEffect(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (!query) {
                params.delete('q');
            } else {
                params.set('q', encodeURIComponent(query));
            }
            const url =
                `${pathname}` + (params.size ? `?${params.toString()}` : '');

            window.history.replaceState(
                { ...window.history.state, as: url, url },
                '',
                url,
            );
        }, [pathname, query, router, searchParams]);

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
            const handleKeyDown = (e: KeyboardEvent) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    searchRef.current?.focus();
                }
            };

            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.removeEventListener('keydown', handleKeyDown);
            };
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

            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, []);

        const isSearching = React.useMemo(() => {
            if (!query) return false;
            if (query !== debouncedQuery) return true;
            // eslint-disable-next-line sonarjs/prefer-single-boolean-return
            if (isLoading) return true;
            return false;
        }, [debouncedQuery, isLoading, query]);

        const searchFilters = Array.from(new Set(filter));
        const showUsers = searchFilters.includes('user');
        const showRuns = searchFilters.includes('run');

        return (
            <div className="position-relative">
                <SearchInput
                    query={query}
                    filters={searchFilters}
                    isSearching={isSearching}
                    onChange={handleInputChange}
                    onInputFocus={handleInputFocus}
                    ref={searchRef}
                />
                {query && isResultsPanelOpen ? (
                    <SearchResultsPanel
                        users={searchResults?.users ?? []}
                        runs={searchResults?.runs ?? []}
                        showUsers={showUsers}
                        showRuns={showRuns}
                        isSearching={isSearching}
                        urlSuffix={urlSuffix}
                        ref={resultsPanelRef}
                    />
                ) : null}
            </div>
        );
    },
);

GlobalSearch.displayName = 'GlobalSearch';
