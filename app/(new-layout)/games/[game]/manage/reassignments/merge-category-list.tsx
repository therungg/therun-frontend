'use client';

import { useMemo, useState } from 'react';
import type { MergeCategory } from '../../../../../../types/reassignments.types';
import styles from './merge.module.scss';

interface Props {
    /** Null while the list is still loading. */
    categories: MergeCategory[] | null;
    /** games_pg.category_display_mode — what a group with no mode inherits. */
    gameDisplayMode: string | null;
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
    displayMode: 'pills' | 'dropdown';
}

/**
 * Over this many boards, an `auto` group draws a dropdown. Same number the
 * board page uses (AUTO_PILL_LIMIT in header/category-visibility.ts) — the
 * picker reaching a different answer than the band for the same group would
 * be a second opinion about one game.
 */
const AUTO_PILL_LIMIT = 9;

/**
 * A group's stated mode against the game default, and for 'auto' against how
 * many boards the section holds. Two nulls both mean inherit: a group with
 * no mode of its own takes the game's, and a game with none draws pills.
 */
function resolveDisplayMode(
    groupMode: string | null,
    gameMode: string | null,
    kind: string | null,
    count: number,
): 'pills' | 'dropdown' {
    // A level group is always a dropdown. A game can have dozens of levels
    // and a band of them is unreadable, which is why the board page has
    // never drawn them any other way.
    if (kind === 'level') return 'dropdown';
    const stated = groupMode ?? gameMode ?? 'pills';
    if (stated === 'pills' || stated === 'dropdown') return stated;
    return count > AUTO_PILL_LIMIT ? 'dropdown' : 'pills';
}

/**
 * Groups in their own sort order, ungrouped trailing, no headings at all
 * when there is only one section. The same vocabulary the board page's
 * category band uses (`sectionize` in overview-page.tsx) — a picker that
 * ordered the same boards differently would be a second way to read one
 * game.
 */
function sectionize(rows: MergeCategory[], gameMode: string | null): Section[] {
    const groups = new Map<
        number,
        {
            name: string;
            sortOrder: number;
            rows: MergeCategory[];
            mode: string | null;
            kind: string | null;
        }
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
                mode: row.groupDisplayMode,
                kind: row.groupKind,
            });
    }

    const sections: Section[] = [...groups.entries()]
        // Id breaks a sort-order tie, the way the backend's own group query
        // does, so two groups sharing a slot never swap between reads.
        .sort((a, b) => a[1].sortOrder - b[1].sortOrder || a[0] - b[0])
        .map(([id, g]) => ({
            key: `g${id}`,
            name: g.name,
            rows: g.rows,
            displayMode: resolveDisplayMode(
                g.mode,
                gameMode,
                g.kind,
                g.rows.length,
            ),
        }));

    if (ungrouped.length > 0) {
        sections.push({
            key: 'ungrouped',
            // A game with no groups at all reads as a plain list, which is
            // what it is. Only name the tail when there is something above
            // it to tell it apart from.
            name: sections.length > 0 ? 'Ungrouped' : null,
            rows: ungrouped,
            displayMode: resolveDisplayMode(
                null,
                gameMode,
                null,
                ungrouped.length,
            ),
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
    gameDisplayMode,
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

    const sections = useMemo(
        () => sectionize(rows, gameDisplayMode),
        [rows, gameDisplayMode],
    );

    if (!categories) {
        return <p className={styles.loading}>Reading the boards…</p>;
    }

    return (
        <div className={styles.list}>
            {/* Below this many boards you can read the whole list faster
                than you can type, and an empty search box is one more
                control to skip past. */}
            {(categories?.length ?? 0) > 8 ? (
                <input
                    type="search"
                    className={styles.search}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search boards"
                    aria-label="Search boards"
                    disabled={busy}
                />
            ) : null}

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
                        {section.displayMode === 'dropdown' ? (
                            <select
                                className={styles.dropdown}
                                // Multi-select sections stay a <select> with
                                // no value: picking one adds it to the band
                                // of chosen boards above, and the control
                                // resets so the next pick is one action too.
                                value={
                                    mode === 'single'
                                        ? (section.rows.find((c) =>
                                              selected.includes(c.id),
                                          )?.id ?? '')
                                        : ''
                                }
                                onChange={(e) => {
                                    const id = Number(e.target.value);
                                    if (id) onToggle(id);
                                }}
                                disabled={busy}
                                aria-label={section.name ?? 'Boards'}
                            >
                                <option value="">
                                    {mode === 'single'
                                        ? 'Pick a board'
                                        : 'Add a board'}
                                </option>
                                {section.rows.map((c) => {
                                    const merged = c.mergedInto !== null;
                                    const blocked = disabledIds.includes(c.id);
                                    const mergedTo =
                                        c.mergedInto === null
                                            ? null
                                            : (displayById.get(c.mergedInto) ??
                                              null);
                                    const note = merged
                                        ? mergedTo
                                            ? `merged into ${mergedTo}`
                                            : 'already merged'
                                        : blocked
                                          ? disabledReason.toLowerCase()
                                          : null;
                                    return (
                                        <option
                                            key={c.id}
                                            value={c.id}
                                            disabled={merged || blocked}
                                        >
                                            {c.display}
                                            {note ? ` — ${note}` : ''}
                                            {` (${c.runs.toLocaleString()})`}
                                        </option>
                                    );
                                })}
                            </select>
                        ) : (
                            <div className={styles.band}>
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
                                        <button
                                            key={c.id}
                                            type="button"
                                            className={`${styles.chip} ${
                                                isSelected
                                                    ? styles.chipActive
                                                    : ''
                                            }`}
                                            onClick={() => onToggle(c.id)}
                                            disabled={busy || merged || blocked}
                                            aria-pressed={
                                                mode === 'multiple'
                                                    ? isSelected
                                                    : undefined
                                            }
                                            title={note ?? undefined}
                                        >
                                            <span className={styles.chipName}>
                                                {c.display}
                                            </span>
                                            {tags(c).map((t) => (
                                                <span
                                                    key={t}
                                                    className={styles.chipTag}
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                            {note ? (
                                                <span
                                                    className={styles.chipNote}
                                                >
                                                    {note}
                                                </span>
                                            ) : null}
                                            <span className={styles.chipCount}>
                                                {c.runs.toLocaleString()}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
