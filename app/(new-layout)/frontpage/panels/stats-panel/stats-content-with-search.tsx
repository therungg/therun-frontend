'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { useDebounceValue } from 'usehooks-ts';
import { getDateOfFirstUserSummary, getUserSummary } from '~src/lib/summary';
import { UserSummary } from '~src/types/summary.types';
import { fetcher } from '~src/utils/fetcher';
import { StatsContent } from './stats-content';

const DEFAULT_SETTING = 'month' as const;

interface SearchResult {
    users?: Record<string, unknown[]>;
}

interface StatsData {
    stats: UserSummary;
    firstWeek?: string;
    firstMonth?: string;
}

interface Props {
    initialStats: UserSummary;
    loggedInUser: string;
    firstWeek?: string;
    firstMonth?: string;
    initialGameDataMap?: Record<string, unknown>;
}

export function StatsContentWithSearch({
    initialStats,
    loggedInUser,
    firstWeek,
    firstMonth,
    initialGameDataMap,
}: Props) {
    const [selectedUser, setSelectedUser] = useState<string>(loggedInUser);
    const [statsData, setStatsData] = useState<StatsData>({
        stats: initialStats,
        firstWeek,
        firstMonth,
    });
    const [searchInput, setSearchInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
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

    const handleUserSelect = async (username: string) => {
        setLoading(true);
        setShowSuggestions(false);
        try {
            const cleanUsername = username.startsWith('/')
                ? username.slice(1)
                : username;

            const [stats, newFirstWeek, newFirstMonth] = await Promise.all([
                getUserSummary(cleanUsername, DEFAULT_SETTING, 0),
                getDateOfFirstUserSummary(cleanUsername, 'week'),
                getDateOfFirstUserSummary(cleanUsername, 'month'),
            ]);

            if (stats) {
                setSelectedUser(cleanUsername);
                setStatsData({
                    stats,
                    firstWeek: newFirstWeek,
                    firstMonth: newFirstMonth,
                });
                setSearchInput('');
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBackToMyStats = () => {
        setSelectedUser(loggedInUser);
        setStatsData({
            stats: initialStats,
            firstWeek,
            firstMonth,
        });
        setSearchInput('');
    };

    return (
        <div>
            {selectedUser !== loggedInUser && (
                <div className="mb-3">
                    <button
                        onClick={handleBackToMyStats}
                        className="btn btn-sm btn-link"
                        style={{
                            fontSize: '0.9rem',
                            color: 'var(--bs-primary)',
                        }}
                    >
                        ← Back to my stats
                    </button>
                </div>
            )}

            <div className="mb-3">
                <div
                    style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                        position: 'relative',
                    }}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search for another user..."
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
                                handleUserSelect(searchInput);
                            }
                        }}
                        style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.4rem',
                            border: '1px solid rgba(96, 140, 89, 0.2)',
                            backgroundColor: 'var(--bs-body-bg)',
                            color: 'var(--bs-body-color)',
                            fontSize: '0.9rem',
                            minWidth: '200px',
                            flex: 1,
                            maxWidth: '300px',
                        }}
                    />
                    <button
                        onClick={() => {
                            if (searchInput.trim()) {
                                handleUserSelect(searchInput);
                            }
                        }}
                        disabled={loading}
                        className="btn btn-sm btn-primary"
                        style={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}
                    >
                        {loading ? 'Loading...' : 'Search'}
                    </button>

                    {searchInput && showSuggestions && (
                        <div
                            ref={suggestionsRef}
                            style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 'auto',
                                marginTop: '0.25rem',
                                backgroundColor: 'var(--bs-body-bg)',
                                border: '1px solid rgba(96, 140, 89, 0.2)',
                                borderRadius: '0.4rem',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                zIndex: 1000,
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                minWidth: '200px',
                            }}
                        >
                            {isSearching ? (
                                <div
                                    style={{
                                        padding: '0.75rem',
                                        fontSize: '0.85rem',
                                        opacity: 0.7,
                                    }}
                                >
                                    Searching...
                                </div>
                            ) : searchResults?.users &&
                              Object.keys(searchResults.users).length > 0 ? (
                                Object.keys(searchResults.users).map(
                                    (username) => (
                                        <button
                                            key={username}
                                            onClick={() =>
                                                handleUserSelect(username)
                                            }
                                            style={{
                                                display: 'block',
                                                width: '100%',
                                                padding: '0.75rem',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                color: 'var(--bs-body-color)',
                                                fontSize: '0.9rem',
                                                transition:
                                                    'background-color 0.15s ease-in-out',
                                            }}
                                            onMouseEnter={(e) => {
                                                (
                                                    e.currentTarget as HTMLButtonElement
                                                ).style.backgroundColor =
                                                    'rgba(96, 140, 89, 0.08)';
                                            }}
                                            onMouseLeave={(e) => {
                                                (
                                                    e.currentTarget as HTMLButtonElement
                                                ).style.backgroundColor =
                                                    'transparent';
                                            }}
                                        >
                                            {username}
                                        </button>
                                    ),
                                )
                            ) : (
                                <div
                                    style={{
                                        padding: '0.75rem',
                                        fontSize: '0.85rem',
                                        opacity: 0.7,
                                    }}
                                >
                                    No users found
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <StatsContent
                initialStats={statsData.stats}
                username={selectedUser}
                firstWeek={statsData.firstWeek}
                firstMonth={statsData.firstMonth}
                initialGameDataMap={
                    selectedUser === loggedInUser
                        ? initialGameDataMap
                        : undefined
                }
            />
        </div>
    );
}
