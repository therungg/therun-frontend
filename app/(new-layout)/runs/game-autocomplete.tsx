'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameSearchResult } from '~src/lib/game-search';
import { searchGames } from '~src/lib/game-search';
import styles from './game-autocomplete.module.scss';

interface GameAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    placeholder?: string;
}

export function GameAutocomplete({
    value,
    onChange,
    className,
    placeholder = 'Search game...',
}: GameAutocompleteProps) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<GameSearchResult[]>([]);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Sync local query when value changes externally (e.g. clear filters)
    useEffect(() => {
        setQuery(value);
        if (!value) {
            setResults([]);
        }
    }, [value]);

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

    function fetchResults(q: string) {
        clearTimeout(debounceRef.current);
        if (q.length < 2) {
            setResults([]);
            return;
        }
        setLoading(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const data = await searchGames(q);
                setResults(data);
                // No results — use the typed text as the filter directly
                if (data.length === 0) {
                    onChange(q);
                }
            } catch {
                setResults([]);
                onChange(q);
            } finally {
                setLoading(false);
            }
        }, 300);
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const val = e.target.value;
        setQuery(val);
        setOpen(true);
        setActiveIndex(-1);
        // Only propagate immediately when clearing
        if (!val) onChange('');
        fetchResults(val);
    }

    function handleSelect(game: GameSearchResult) {
        setQuery(game.display);
        setOpen(false);
        setActiveIndex(-1);
        onChange(game.display);
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (!showDropdown) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            handleSelect(results[activeIndex]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    }

    const showDropdown = open && results.length > 0 && !loading;

    return (
        <div className={styles.wrapper} ref={wrapperRef}>
            <input
                type="text"
                className={className}
                placeholder={placeholder}
                value={query}
                onChange={handleInputChange}
                onFocus={() => {
                    if (results.length > 0) setOpen(true);
                }}
                onKeyDown={handleKeyDown}
                role="combobox"
                aria-expanded={showDropdown}
                aria-autocomplete="list"
                aria-activedescendant={
                    activeIndex >= 0 ? `game-option-${activeIndex}` : undefined
                }
            />
            {showDropdown && (
                <ul className={styles.dropdown} role="listbox">
                    {results.map((game, i) => (
                        <li
                            key={game.game}
                            id={`game-option-${i}`}
                            role="option"
                            aria-selected={i === activeIndex}
                            className={`${styles.option}${i === activeIndex ? ` ${styles.optionActive}` : ''}`}
                            onMouseDown={() => handleSelect(game)}
                            onMouseEnter={() => setActiveIndex(i)}
                        >
                            {game.image && (
                                <img
                                    src={game.image}
                                    alt=""
                                    className={styles.gameImage}
                                />
                            )}
                            <span className={styles.gameName}>
                                {game.display}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
