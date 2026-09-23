'use client';

import { useRef, useState } from 'react';
import gamePageStyles from '../../../game-page.module.scss';
import { PopoverLayer } from '../../../shared/popover-layer';
import { usePopoverFocus } from '../../../shared/use-popover-focus';
import styles from './worklist-pane.module.scss';

/** Up to this many boards with runs waiting show as pills. */
const MAX_PILLS = 5;
/** More boards than this get a search box in the picker. */
const SEARCH_FROM = 12;

type Board = { id: number; display: string };

interface Props {
    boards: Board[];
    /** Runs waiting per board; null when the list can't count them. */
    counts: Map<number, number> | null;
    /** Boards that are levels rather than categories. */
    levelIds: Set<number>;
    value: number | undefined;
    onChange: (categoryId: number | undefined) => void;
    /** The picker is open: the queue's own keys stand down. */
    onOpenChange?: (open: boolean) => void;
}

/**
 * The queue's board filter. A handful of boards with runs waiting are pills;
 * more than that fold into one button with a searchable list.
 */
export function BoardFilter({
    boards,
    counts,
    levelIds,
    value,
    onChange,
    onOpenChange,
}: Props) {
    const [open, setOpenState] = useState(false);
    const [search, setSearch] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const setOpen = (next: boolean) => {
        setOpenState(next);
        if (!next) setSearch('');
        onOpenChange?.(next);
    };
    const close = () => setOpen(false);
    usePopoverFocus({ open, onClose: close, panelRef });

    const countOf = (id: number) => counts?.get(id) ?? null;
    const waiting = counts
        ? boards.filter((b) => (counts.get(b.id) ?? 0) > 0)
        : boards;
    const picked = boards.find((b) => b.id === value);

    if (waiting.length <= 1 && !picked) return null;

    const pick = (id: number | undefined) => {
        onChange(id);
        close();
    };

    if (waiting.length <= MAX_PILLS) {
        const shown =
            picked && !waiting.includes(picked)
                ? [...waiting, picked]
                : waiting;
        return (
            <div className={styles.boards} role="group" aria-label="Board">
                <button
                    type="button"
                    className={
                        value === undefined
                            ? styles.boardPillActive
                            : styles.boardPill
                    }
                    aria-pressed={value === undefined}
                    onClick={() => onChange(undefined)}
                >
                    All boards
                </button>
                {shown.map((b) => {
                    const count = countOf(b.id);
                    return (
                        <button
                            key={b.id}
                            type="button"
                            className={
                                value === b.id
                                    ? styles.boardPillActive
                                    : styles.boardPill
                            }
                            aria-pressed={value === b.id}
                            onClick={() => onChange(b.id)}
                        >
                            {b.display}
                            {count != null && (
                                <span className={styles.boardCount}>
                                    {count.toLocaleString()}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    }

    const needle = search.trim().toLowerCase();
    const matches = needle
        ? waiting.filter((b) => b.display.toLowerCase().includes(needle))
        : waiting;
    const groups = [
        {
            label: 'Categories',
            boards: matches.filter((b) => !levelIds.has(b.id)),
        },
        { label: 'Levels', boards: matches.filter((b) => levelIds.has(b.id)) },
    ].filter((g) => g.boards.length > 0);
    const total = counts
        ? [...counts.values()].reduce((sum, n) => sum + n, 0)
        : null;

    const option = (
        id: number | undefined,
        label: string,
        count: number | null,
    ) => (
        <button
            key={id ?? 'all'}
            type="button"
            className={
                value === id ? styles.boardOptionActive : styles.boardOption
            }
            aria-pressed={value === id}
            onClick={() => pick(id)}
        >
            <span className={styles.boardOptionName}>{label}</span>
            {count != null && (
                <span className={styles.boardCount}>
                    {count.toLocaleString()}
                </span>
            )}
        </button>
    );

    return (
        <div className={styles.boards} ref={rootRef}>
            <button
                type="button"
                className={picked ? styles.boardPillActive : styles.boardPill}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
            >
                {picked?.display ?? 'All boards'}
                <span aria-hidden>▾</span>
            </button>
            <PopoverLayer
                open={open}
                anchorRef={rootRef}
                onClose={close}
                align="start"
            >
                <div
                    ref={panelRef}
                    className={`${gamePageStyles.popoverPanel} ${styles.boardPanel}`}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Pick a board"
                >
                    {waiting.length > SEARCH_FROM && (
                        <input
                            type="search"
                            className={`form-control form-control-sm ${styles.boardSearch}`}
                            placeholder="Find a board"
                            aria-label="Find a board"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    )}
                    <div className={styles.boardOptions}>
                        {!needle && option(undefined, 'All boards', total)}
                        {groups.map((g) => (
                            <div
                                key={g.label}
                                role="group"
                                aria-label={g.label}
                                className={styles.boardGroup}
                            >
                                {groups.length > 1 && (
                                    <div className={styles.boardGroupLabel}>
                                        {g.label}
                                    </div>
                                )}
                                {g.boards.map((b) =>
                                    option(b.id, b.display, countOf(b.id)),
                                )}
                            </div>
                        ))}
                        {needle && groups.length === 0 && (
                            <p className={styles.boardNone}>No board matches</p>
                        )}
                    </div>
                </div>
            </PopoverLayer>
        </div>
    );
}
