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

interface Section {
    key: string;
    /** Null on the ungrouped tail, and on a list with only one section. */
    name: string | null;
    rows: MergeCategory[];
}

/**
 * Groups in their own sort order, ungrouped trailing, no headings at all
 * when there is only one section. The same vocabulary the board page's
 * category band uses (`sectionize` in overview-page.tsx) — a picker that
 * ordered the same boards differently would be a second way to read one
 * game.
 */
function sectionize(rows: MergeCategory[]): Section[] {
    const groups = new Map<
        number,
        { name: string; sortOrder: number; rows: MergeCategory[] }
    >();
    const ungrouped: MergeCategory[] = [];

    for (const row of rows) {
        if (row.groupId === null || !row.groupName) {
            ungrouped.push(row);
            continue;
        }
        const existing = groups.get(row.groupId);
        if (existing) existing.rows.push(row);
        else
            groups.set(row.groupId, {
                name: row.groupName,
                sortOrder: row.groupSortOrder ?? 0,
                rows: [row],
            });
    }

    const sections: Section[] = [...groups.entries()]
        // Id breaks a sort-order tie, the way the backend's own group query
        // does, so two groups sharing a slot never swap between reads.
        .sort((a, b) => a[1].sortOrder - b[1].sortOrder || a[0] - b[0])
        .map(([id, g]) => ({ key: `g${id}`, name: g.name, rows: g.rows }));

    if (ungrouped.length > 0) {
        sections.push({
            key: 'ungrouped',
            // A game with no groups at all reads as a plain list, which is
            // what it is. Only name the tail when there is something above
            // it to tell it apart from.
            name: sections.length > 0 ? 'Ungrouped' : null,
            rows: ungrouped,
        });
    }

    if (sections.length === 1) sections[0].name = null;
    return sections;
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

    const sections = useMemo(() => sectionize(rows), [rows]);

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

            <div className={styles.sections}>
                {sections.map((section) => (
                    <div key={section.key} className={styles.section}>
                        {section.name ? (
                            <h4 className={styles.sectionName}>
                                {section.name}
                            </h4>
                        ) : null}
                        <ul className={styles.rows}>
                            {section.rows.map((c) => {
                                const merged = c.mergedInto !== null;
                                const blocked = disabledIds.includes(c.id);
                                const isSelected = selected.includes(c.id);
                                const mergedTo =
                                    c.mergedInto === null
                                        ? null
                                        : (displayById.get(c.mergedInto) ??
                                          null);
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
                                                isSelected
                                                    ? styles.rowSelected
                                                    : ''
                                            }`}
                                            onClick={() => onToggle(c.id)}
                                            disabled={busy || merged || blocked}
                                            aria-pressed={
                                                mode === 'multiple'
                                                    ? isSelected
                                                    : undefined
                                            }
                                        >
                                            <span className={styles.rowName}>
                                                {c.display}
                                            </span>
                                            <span className={styles.rowTags}>
                                                {tags(c).map((t) => (
                                                    <span
                                                        key={t}
                                                        className={styles.tag}
                                                    >
                                                        {t}
                                                    </span>
                                                ))}
                                            </span>
                                            {note ? (
                                                <span
                                                    className={styles.rowNote}
                                                >
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
                ))}
            </div>
        </div>
    );
}
