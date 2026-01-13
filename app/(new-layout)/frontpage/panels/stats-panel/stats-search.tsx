'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { useDebounceValue } from 'usehooks-ts';
import {
    getLastSearchedUser,
    setLastSearchedUser,
} from '~src/actions/last-searched-user.action';
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

export const StatsSearch = () => {
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [statsData, setStatsData] = useState<StatsData | null>(null);
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
        async function loadLastSearchedUser() {
            const lastUser = await getLastSearchedUser();
            if (lastUser) {
                setSearchInput(lastUser);
                // Automatically fetch and display stats for the saved user
                try {
                    setLoading(true);
                    let stats = await getUserSummary(
                        lastUser,
                        DEFAULT_SETTING,
                        0,
                    );
                    let tries = 1;
                    while (stats === undefined && tries < 3) {
                        stats = await getUserSummary(
                            lastUser,
                            DEFAULT_SETTING,
                            tries++,
                        );
                    }

                    const firstWeek = await getDateOfFirstUserSummary(
                        lastUser,
                        'week',
                    );
                    const firstMonth = await getDateOfFirstUserSummary(
                        lastUser,
                        'month',
                    );

                    if (stats) {
                        setSelectedUser(lastUser);
                        setStatsData({
                            stats,
                            firstWeek,
                            firstMonth,
                        });
                    }
                } catch (error) {
                    console.error(
                        'Error loading last searched user stats:',
                        error,
                    );
                } finally {
                    setLoading(false);
                }
            }
        }
        loadLastSearchedUser();
    }, []);

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

            let stats = await getUserSummary(cleanUsername, DEFAULT_SETTING, 0);
            let tries = 1;
            while (stats === undefined && tries < 3) {
                stats = await getUserSummary(
                    cleanUsername,
                    DEFAULT_SETTING,
                    tries++,
                );
            }

            const firstWeek = await getDateOfFirstUserSummary(
                cleanUsername,
                'week',
            );
            const firstMonth = await getDateOfFirstUserSummary(
                cleanUsername,
                'month',
            );

            if (stats) {
                setSelectedUser(cleanUsername);
                setStatsData({
                    stats,
                    firstWeek,
                    firstMonth,
                });
                setSearchInput('');
                await setLastSearchedUser(cleanUsername);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (selectedUser && statsData) {
        return (
            <div>
                <div className="mb-3">
                    <button
                        onClick={() => {
                            setSelectedUser(null);
                            setStatsData(null);
                        }}
                        className="btn btn-sm btn-link"
                        style={{
                            fontSize: '0.9rem',
                            color: 'var(--bs-primary)',
                        }}
                    >
                        ← Search another user
                    </button>
                </div>
                <StatsContent
                    initialStats={statsData.stats}
                    username={selectedUser}
                    firstWeek={statsData.firstWeek}
                    firstMonth={statsData.firstMonth}
                />
            </div>
        );
    }

    return (
        <div className="text-center py-4">
            <p className="mb-3" style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                Search for a speedrunner to view their stats
            </p>
            <div style={{ position: 'relative', display: 'inline-block' }}>
                <div
                    style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                    }}
                >
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
                        style={{ fontSize: '0.9rem' }}
                    >
                        {loading ? 'Loading...' : 'Search'}
                    </button>
                </div>

                {searchInput && showSuggestions && (
                    <div
                        ref={suggestionsRef}
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: '0.25rem',
                            backgroundColor: 'var(--bs-body-bg)',
                            border: '1px solid rgba(96, 140, 89, 0.2)',
                            borderRadius: '0.4rem',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 1000,
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
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
                            Object.keys(searchResults.users).map((username) => (
                                <button
                                    key={username}
                                    onClick={() => handleUserSelect(username)}
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
                                        ).style.backgroundColor = 'transparent';
                                    }}
                                >
                                    {username}
                                </button>
                            ))
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
    );
};
