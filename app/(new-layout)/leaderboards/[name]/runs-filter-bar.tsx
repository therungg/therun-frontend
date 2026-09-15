'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'react-bootstrap-icons';
import styles from './leaderboards-profile.module.scss';
import {
    activeFilters,
    CLEARED,
    filterToUrl,
    type RunsFilter,
    SCOPES,
    SEGMENTS,
} from './runs-filters';
import { SORT_LABELS, type SortMode } from './showcase-rules';
import { setProfileUrl } from './url-state';

const n = (v: number) => v.toLocaleString('en-US');

const pill = (on: boolean) =>
    on ? `${styles.tab} ${styles.tabActive}` : styles.tab;

export const setFilter = (f: Partial<RunsFilter>) =>
    setProfileUrl(filterToUrl(f));

export const clearFilters = () => setFilter(CLEARED);

export function RunsFilterBar({
    filter,
    shown,
    total,
    platforms,
    years,
    sort,
}: {
    filter: RunsFilter;
    shown: number;
    total: number;
    platforms: string[];
    years: string[];
    /** The sort select, when there is more than one game to order. */
    sort: { options: SortMode[]; current: SortMode } | null;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const pills = activeFilters(filter);

    useEffect(() => {
        if (!menuOpen) return;
        const onPointer = (e: PointerEvent) => {
            if (!menuRef.current?.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    return (
        <div className={styles.runsFilters}>
            <div className={styles.runsFilterRow}>
                <label className={styles.runsSearch}>
                    <Search size={13} aria-hidden />
                    <input
                        type="search"
                        value={filter.search}
                        placeholder="Find a game or category"
                        aria-label="Find a game or category"
                        onChange={(e) => setFilter({ search: e.target.value })}
                    />
                </label>
                <fieldset className={styles.runsSegments}>
                    <legend className="visually-hidden">Show</legend>
                    {SEGMENTS.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            className={pill(filter.show === s.id)}
                            aria-pressed={filter.show === s.id}
                            onClick={() => setFilter({ show: s.id })}
                        >
                            {s.label}
                        </button>
                    ))}
                </fieldset>
                {sort ? (
                    <label className={styles.ledgerSort}>
                        <span className="visually-hidden">Sort</span>
                        <select
                            value={sort.current}
                            onChange={(e) =>
                                setProfileUrl({
                                    sort:
                                        e.target.value === sort.options[0]
                                            ? ''
                                            : e.target.value,
                                })
                            }
                        >
                            {sort.options.map((m) => (
                                <option key={m} value={m}>
                                    {SORT_LABELS[m]}
                                </option>
                            ))}
                        </select>
                    </label>
                ) : null}
                <div className={styles.runsMenu} ref={menuRef}>
                    <button
                        type="button"
                        className={pill(menuOpen)}
                        aria-expanded={menuOpen}
                        aria-controls="runs-filter-menu"
                        onClick={() => setMenuOpen((v) => !v)}
                    >
                        Filters
                        <ChevronDown size={10} aria-hidden />
                    </button>
                    {menuOpen ? (
                        <div
                            id="runs-filter-menu"
                            className={styles.runsMenuPanel}
                            role="dialog"
                            aria-label="Filters"
                        >
                            <label className={styles.runsMenuCheck}>
                                <input
                                    type="checkbox"
                                    checked={filter.video}
                                    onChange={(e) =>
                                        setFilter({ video: e.target.checked })
                                    }
                                />
                                Only runs with a video
                            </label>
                            <fieldset className={styles.runsMenuGroup}>
                                <legend>Boards</legend>
                                {SCOPES.map((s) => (
                                    <label
                                        key={s.id}
                                        className={styles.runsMenuCheck}
                                    >
                                        <input
                                            type="radio"
                                            name="runs-scope"
                                            checked={filter.scope === s.id}
                                            onChange={() =>
                                                setFilter({ scope: s.id })
                                            }
                                        />
                                        {s.label}
                                    </label>
                                ))}
                            </fieldset>
                            {platforms.length > 0 ? (
                                <fieldset className={styles.runsMenuGroup}>
                                    <legend>Platform</legend>
                                    <div className={styles.runsMenuPills}>
                                        {['', ...platforms].map((p) => (
                                            <button
                                                key={p || 'any'}
                                                type="button"
                                                className={pill(
                                                    filter.platform === p,
                                                )}
                                                aria-pressed={
                                                    filter.platform === p
                                                }
                                                onClick={() =>
                                                    setFilter({ platform: p })
                                                }
                                            >
                                                {p || 'Any'}
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>
                            ) : null}
                            {years.length > 1 ? (
                                <fieldset className={styles.runsMenuGroup}>
                                    <legend>Run date</legend>
                                    <div className={styles.runsMenuPills}>
                                        {['', ...years].map((y) => (
                                            <button
                                                key={y || 'any'}
                                                type="button"
                                                className={pill(
                                                    filter.since === y,
                                                )}
                                                aria-pressed={
                                                    filter.since === y
                                                }
                                                onClick={() =>
                                                    setFilter({ since: y })
                                                }
                                            >
                                                {y ? `Since ${y}` : 'Any time'}
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>
                            ) : null}
                            <label className={styles.runsMenuCheck}>
                                <input
                                    type="checkbox"
                                    checked={filter.archived}
                                    onChange={(e) =>
                                        setFilter({
                                            archived: e.target.checked,
                                        })
                                    }
                                />
                                Include archived boards
                            </label>
                        </div>
                    ) : null}
                </div>
                <span className={styles.runsCount} aria-live="polite">
                    <b>{n(shown)}</b> of {n(total)}{' '}
                    {total === 1 ? 'run' : 'runs'}
                </span>
            </div>
            {pills.length > 0 ? (
                <div className={styles.runsActive}>
                    {pills.map((p) => (
                        <button
                            key={p.label}
                            type="button"
                            className={`${styles.tab} ${styles.tabActive}`}
                            aria-label={`Remove ${p.label}`}
                            onClick={() => setFilter(p.clear)}
                        >
                            {p.label}
                            <X size={14} aria-hidden />
                        </button>
                    ))}
                    <button
                        type="button"
                        className={styles.runsClear}
                        onClick={clearFilters}
                    >
                        Clear all
                    </button>
                </div>
            ) : null}
        </div>
    );
}
