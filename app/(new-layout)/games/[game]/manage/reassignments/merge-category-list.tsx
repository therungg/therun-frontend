'use client';

import { useMemo, useState } from 'react';
import type { MergeCategory } from '../../../../../../types/reassignments.types';
import styles from './merge.module.scss';

interface Props {
    /** Null while the list is still loading. */
    categories: MergeCategory[] | null;
    mode: 'single' | 'multiple';
    selected: number[];
    onToggle: (id: number) => void;
    /** Picked on the other question, so unavailable here. */
    disabledIds: number[];
    disabledReason: string;
    /**
     * Restrict the list to featured boards. The board that survives a merge
     * has to be one the game actually shows: the category selector only
     * lists featured boards, so merging into an unfeatured one moves every
     * run somewhere nobody is looking. Filtered out rather than disabled —
     * a control you can see is a control you can press.
     */
    featuredOnly?: boolean;
    busy: boolean;
}

/** What is unusual about a board, said only when it is unusual. */
function tags(c: MergeCategory): string[] {
    const out: string[] = [];
    if (c.archived) out.push('Archived');
    if (!c.featured) out.push('Not featured');
    if (c.isExtension) out.push('Extension');
    return out;
}

export function MergeCategoryList({
    categories,
    mode,
    selected,
    onToggle,
    disabledIds,
    disabledReason,
    featuredOnly = false,
    busy,
}: Props) {
    const [query, setQuery] = useState('');

    // A merged board is listed rather than hidden so "where did that board
    // go" is answered on screen. Its destination is another row in the same
    // list, so the name is here to be looked up.
    const displayById = useMemo(
        () => new Map((categories ?? []).map((c) => [c.id, c.display])),
        [categories],
    );

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!categories) return [];
        const pool = featuredOnly
            ? categories.filter((c) => c.featured)
            : categories;
        if (q.length === 0) return pool;
        return pool.filter(
            (c) =>
                c.display.toLowerCase().includes(q) ||
                c.name.toLowerCase().includes(q),
        );
    }, [categories, query, featuredOnly]);

    if (!categories) {
        return <p className={styles.loading}>Reading the boards…</p>;
    }

    return (
        <div className={styles.list}>
            <input
                type="search"
                className={styles.search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search boards"
                aria-label="Search boards"
                disabled={busy}
            />

            {rows.length === 0 ? (
                <p className={styles.loading}>
                    {query.trim().length > 0
                        ? `No board matches “${query}”.`
                        : featuredOnly
                          ? 'This game has no featured categories. Feature the board you want to keep first, on the Categories screen.'
                          : 'This game has no other boards.'}
                </p>
            ) : null}

            <ul className={styles.rows}>
                {rows.map((c) => {
                    const merged = c.mergedInto !== null;
                    const blocked = disabledIds.includes(c.id);
                    const isSelected = selected.includes(c.id);
                    const mergedTo =
                        c.mergedInto === null
                            ? null
                            : (displayById.get(c.mergedInto) ?? null);
                    const note = merged
                        ? mergedTo
                            ? `Merged into ${mergedTo}`
                            : 'Already merged'
                        : blocked
                          ? disabledReason
                          : null;
                    return (
                        <li key={c.id}>
                            <button
                                type="button"
                                className={`${styles.row} ${
                                    isSelected ? styles.rowSelected : ''
                                }`}
                                onClick={() => onToggle(c.id)}
                                disabled={busy || merged || blocked}
                                aria-pressed={
                                    mode === 'multiple' ? isSelected : undefined
                                }
                            >
                                <span className={styles.rowName}>
                                    {c.display}
                                </span>
                                <span className={styles.rowTags}>
                                    {tags(c).map((t) => (
                                        <span key={t} className={styles.tag}>
                                            {t}
                                        </span>
                                    ))}
                                </span>
                                {note ? (
                                    <span className={styles.rowNote}>
                                        {note}
                                    </span>
                                ) : null}
                                <span className={styles.rowRuns}>
                                    {c.runs.toLocaleString()}{' '}
                                    {c.runs === 1 ? 'run' : 'runs'}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
