'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import type { SearchResults } from '~src/components/search/find-user-or-run';
import { fetcher } from '~src/utils/fetcher';
import styles from './user-autocomplete.module.scss';

interface UserAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    placeholder?: string;
}

export function UserAutocomplete({
    value,
    onChange,
    className,
    placeholder = 'Search user...',
}: UserAutocompleteProps) {
    const [query, setQuery] = useState(value);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keep local query in sync if value changes externally (e.g. clear filters)
    useEffect(() => {
        setQuery(value);
    }, [value]);

    const { data } = useSWR<SearchResults>(
        query.length >= 2 ? `/api/search?q=${encodeURIComponent(query)}` : null,
        fetcher,
        { dedupingInterval: 500 },
    );

    const users = data?.users ?? [];
    const showDropdown = open && query.length >= 2 && users.length > 0;

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handleMouseDown = (e: MouseEvent) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [open]);

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const val = e.target.value;
        setQuery(val);
        setOpen(true);
        setActiveIndex(-1);
        onChange(val);
    }

    function handleSelect(username: string) {
        setQuery(username);
        setOpen(false);
        setActiveIndex(-1);
        onChange(username);
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (!showDropdown) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, users.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            handleSelect(users[activeIndex].user);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    }

    return (
        <div className={styles.wrapper} ref={wrapperRef}>
            <input
                ref={inputRef}
                type="text"
                className={className}
                placeholder={placeholder}
                value={query}
                onChange={handleInputChange}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
                role="combobox"
                aria-expanded={showDropdown}
                aria-autocomplete="list"
                aria-activedescendant={
                    activeIndex >= 0 ? `user-option-${activeIndex}` : undefined
                }
            />
            {showDropdown && (
                <ul className={styles.dropdown} role="listbox">
                    {users.slice(0, 8).map((user, i) => (
                        <li
                            key={user.user}
                            id={`user-option-${i}`}
                            role="option"
                            aria-selected={i === activeIndex}
                            className={`${styles.option}${i === activeIndex ? ` ${styles.optionActive}` : ''}`}
                            onMouseDown={() => handleSelect(user.user)}
                            onMouseEnter={() => setActiveIndex(i)}
                        >
                            {user.picture && (
                                <img
                                    src={user.picture}
                                    alt=""
                                    className={styles.avatar}
                                />
                            )}
                            <span className={styles.username}>{user.user}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
