'use client';

import { useEffect, useRef, useState } from 'react';
import { FiCalendar, FiChevronDown, FiClock, FiX } from 'react-icons/fi';
import type { CategoryStats } from '~src/lib/game-search';
import { getCategoriesForGame } from '~src/lib/game-search';
import styles from './filter-bar.module.scss';
import { GameAutocomplete } from './game-autocomplete';
import { UserAutocomplete } from './user-autocomplete';

export interface RunsFilters {
    game: string;
    gameId: number | null;
    gameImage: string | null;
    category: string;
    categoryId: number | null;
    username: string;
    isPb: boolean;
    useGameTime: boolean;
    minTime: string;
    maxTime: string;
    afterDate: string;
    beforeDate: string;
    sort: string;
}

export const DEFAULT_FILTERS: RunsFilters = {
    game: '',
    gameId: null,
    gameImage: null,
    category: '',
    categoryId: null,
    username: '',
    isPb: false,
    useGameTime: false,
    minTime: '',
    maxTime: '',
    afterDate: '',
    beforeDate: '',
    sort: '-ended_at',
};

interface FilterBarProps {
    filters: RunsFilters;
    onFilterChange: (filters: Partial<RunsFilters>) => void;
    onClearAll: () => void;
    isPending?: boolean;
    loggedInUser?: string;
}

type PopoverType = 'time' | 'date' | null;

export function FilterBar({
    filters,
    onFilterChange,
    onClearAll,
    isPending: _isPending,
    loggedInUser,
}: FilterBarProps) {
    const [openPopover, setOpenPopover] = useState<PopoverType>(null);
    const [categories, setCategories] = useState<CategoryStats[]>([]);
    const timeRef = useRef<HTMLDivElement>(null);
    const dateRef = useRef<HTMLDivElement>(null);

    // Fetch categories when game changes, clear when game is empty
    useEffect(() => {
        if (!filters.game) {
            setCategories([]);
            return;
        }
        let stale = false;
        getCategoriesForGame(filters.game).then((cats) => {
            if (stale) return;
            setCategories(cats);
            if (cats.length > 0) {
                onFilterChange({
                    gameId: cats[0].gameId,
                    gameImage: cats[0].gameImage,
                });
            }
        });
        return () => {
            stale = true;
        };
    }, [filters.game]);

    // Close popover on click outside or Escape
    useEffect(() => {
        if (!openPopover) return;

        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as Node;
            const activeRef = openPopover === 'time' ? timeRef : dateRef;
            if (activeRef.current && !activeRef.current.contains(target)) {
                setOpenPopover(null);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpenPopover(null);
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [openPopover]);

    const togglePopover = (type: PopoverType) => {
        setOpenPopover((prev) => (prev === type ? null : type));
    };

    const hasTimeFilter = filters.minTime || filters.maxTime;
    const hasDateFilter = filters.afterDate || filters.beforeDate;

    // Build active filter chips
    const chips: { label: string; onRemove: () => void }[] = [];

    if (filters.game) {
        chips.push({
            label: `Game: ${filters.game}`,
            onRemove: () =>
                onFilterChange({
                    game: '',
                    gameId: null,
                    gameImage: null,
                    category: '',
                    categoryId: null,
                }),
        });
    }
    if (filters.category) {
        chips.push({
            label: `Category: ${filters.category}`,
            onRemove: () => onFilterChange({ category: '', categoryId: null }),
        });
    }
    if (filters.username) {
        chips.push({
            label: `User: ${filters.username}`,
            onRemove: () => onFilterChange({ username: '' }),
        });
    }
    if (filters.isPb) {
        chips.push({
            label: 'PB Only',
            onRemove: () => onFilterChange({ isPb: false }),
        });
    }
    if (filters.useGameTime) {
        chips.push({
            label: 'Game Time',
            onRemove: () => onFilterChange({ useGameTime: false }),
        });
    }
    if (filters.minTime) {
        chips.push({
            label: `Min: ${filters.minTime}`,
            onRemove: () => onFilterChange({ minTime: '' }),
        });
    }
    if (filters.maxTime) {
        chips.push({
            label: `Max: ${filters.maxTime}`,
            onRemove: () => onFilterChange({ maxTime: '' }),
        });
    }
    if (filters.afterDate) {
        chips.push({
            label: `After: ${filters.afterDate}`,
            onRemove: () => onFilterChange({ afterDate: '' }),
        });
    }
    if (filters.beforeDate) {
        chips.push({
            label: `Before: ${filters.beforeDate}`,
            onRemove: () => onFilterChange({ beforeDate: '' }),
        });
    }

    const hasFilters = chips.length > 0;

    return (
        <div className={styles.filterBar}>
            {/* Row 1: Controls */}
            <div className={styles.controls}>
                <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Game</label>
                    <GameAutocomplete
                        value={filters.game}
                        onChange={(game) =>
                            onFilterChange({
                                game,
                                gameId: null,
                                gameImage: null,
                                category: '',
                                categoryId: null,
                            })
                        }
                        className={styles.textInput}
                    />
                </div>

                {filters.game && (
                    <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Category</label>
                        {categories.length > 0 ? (
                            <select
                                className={styles.selectInput}
                                value={filters.category}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const cat = categories.find(
                                        (c) => c.categoryDisplay === val,
                                    );
                                    onFilterChange({
                                        category: val,
                                        categoryId: cat?.categoryId ?? null,
                                    });
                                }}
                            >
                                <option value="">All categories</option>
                                {categories.map((cat) => (
                                    <option
                                        key={cat.categoryId}
                                        value={cat.categoryDisplay}
                                    >
                                        {cat.categoryDisplay}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                className={styles.textInput}
                                placeholder="Search category..."
                                value={filters.category}
                                onChange={(e) =>
                                    onFilterChange({ category: e.target.value })
                                }
                            />
                        )}
                    </div>
                )}

                <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Username</label>
                    <UserAutocomplete
                        value={filters.username}
                        onChange={(username) => onFilterChange({ username })}
                        className={styles.textInput}
                    />
                </div>

                <button
                    type="button"
                    className={`${styles.pbToggle} ${filters.isPb ? styles.pbToggleActive : ''}`}
                    onClick={() => onFilterChange({ isPb: !filters.isPb })}
                >
                    PB Only
                </button>

                {loggedInUser && (
                    <button
                        type="button"
                        className={`${styles.pbToggle} ${filters.username === loggedInUser ? styles.pbToggleActive : ''}`}
                        onClick={() =>
                            onFilterChange({
                                username:
                                    filters.username === loggedInUser
                                        ? ''
                                        : loggedInUser,
                            })
                        }
                    >
                        My Runs
                    </button>
                )}

                {/* Time trigger + popover */}
                <div className={styles.triggerWrapper} ref={timeRef}>
                    <button
                        type="button"
                        className={`${styles.trigger} ${hasTimeFilter ? styles.triggerActive : ''} ${openPopover === 'time' ? styles.triggerOpen : ''}`}
                        onClick={() => togglePopover('time')}
                    >
                        <FiClock size={14} />
                        Time
                        <FiChevronDown
                            size={12}
                            className={`${styles.chevron} ${openPopover === 'time' ? styles.chevronOpen : ''}`}
                        />
                    </button>

                    {openPopover === 'time' && (
                        <div className={styles.popover}>
                            <div className={styles.popoverFields}>
                                <div className={styles.popoverField}>
                                    <label className={styles.popoverLabel}>
                                        Min
                                    </label>
                                    <input
                                        type="text"
                                        className={`${styles.popoverInput} ${styles.durationInput}`}
                                        placeholder="h:mm:ss"
                                        value={filters.minTime}
                                        onChange={(e) =>
                                            onFilterChange({
                                                minTime: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className={styles.popoverField}>
                                    <label className={styles.popoverLabel}>
                                        Max
                                    </label>
                                    <input
                                        type="text"
                                        className={`${styles.popoverInput} ${styles.durationInput}`}
                                        placeholder="h:mm:ss"
                                        value={filters.maxTime}
                                        onChange={(e) =>
                                            onFilterChange({
                                                maxTime: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={filters.useGameTime}
                                    onChange={(e) =>
                                        onFilterChange({
                                            useGameTime: e.target.checked,
                                        })
                                    }
                                />
                                Use game time
                            </label>
                        </div>
                    )}
                </div>

                {/* Date trigger + popover */}
                <div className={styles.triggerWrapper} ref={dateRef}>
                    <button
                        type="button"
                        className={`${styles.trigger} ${hasDateFilter ? styles.triggerActive : ''} ${openPopover === 'date' ? styles.triggerOpen : ''}`}
                        onClick={() => togglePopover('date')}
                    >
                        <FiCalendar size={14} />
                        Date
                        <FiChevronDown
                            size={12}
                            className={`${styles.chevron} ${openPopover === 'date' ? styles.chevronOpen : ''}`}
                        />
                    </button>

                    {openPopover === 'date' && (
                        <div className={styles.popover}>
                            <div className={styles.popoverFields}>
                                <div className={styles.popoverField}>
                                    <label className={styles.popoverLabel}>
                                        After
                                    </label>
                                    <input
                                        type="date"
                                        className={`${styles.popoverInput} ${styles.dateInput}`}
                                        value={filters.afterDate}
                                        onChange={(e) =>
                                            onFilterChange({
                                                afterDate: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className={styles.popoverField}>
                                    <label className={styles.popoverLabel}>
                                        Before
                                    </label>
                                    <input
                                        type="date"
                                        className={`${styles.popoverInput} ${styles.dateInput}`}
                                        value={filters.beforeDate}
                                        onChange={(e) =>
                                            onFilterChange({
                                                beforeDate: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Row 2: Active filter chips */}
            {hasFilters && (
                <div className={styles.chipsRow}>
                    {chips.map((chip) => (
                        <span key={chip.label} className={styles.chip}>
                            {chip.label}
                            <button
                                type="button"
                                className={styles.chipRemove}
                                onClick={chip.onRemove}
                                aria-label={`Remove ${chip.label}`}
                            >
                                <FiX size={12} />
                            </button>
                        </span>
                    ))}
                    <button
                        type="button"
                        className={styles.clearAll}
                        onClick={onClearAll}
                    >
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
}
