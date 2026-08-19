'use client';

import { useEffect, useId, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp } from 'react-bootstrap-icons';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import { levelBoardLabel } from '~src/lib/levels/display';
import type { LevelTemplate } from '../../../../../../types/levels.types';
import styles from './board-categories.module.scss';

interface Props {
    /** Scopes the disclosure's remembered state — one board, one memory. */
    gameId: number;
    /** Every level board, featured or not, live or archived; the caller has
     *  already split them off the full-game rows. */
    rows: ManageCategoryRow[];
    /** Every group, in display order — the level ones become sub-bands. */
    groups: ManageGroup[];
    levelTemplates: LevelTemplate[];
    /** Rows with a write in flight, so their controls can go quiet — the
     *  table owns the writes, this band only offers them. */
    pendingIds: Set<number>;
    onEdit: (categoryId: number) => void;
    /** Un-archives a level board. Same write the full-game archived list
     *  makes; the table passes its own handler in rather than this band
     *  growing a second copy of it. */
    onRestore: (row: ManageCategoryRow) => void;
}

const storageKey = (gameId: number) => `console:levelBoards:${gameId}`;

/**
 * Level boards, collapsed into one band.
 *
 * A game with 30 levels and 4 level categories has 120 boards nobody curates
 * by hand — they exist because a level category was pushed to every level, and
 * their order follows the template rather than this table. Listed inline they
 * would bury the eight rows the index is actually about, so they live behind
 * one disclosure, grouped by level, and labelled by their level category
 * ("Any%") rather than their own display ("E1M1 — Any%") — inside a level, the
 * level's name is already the band.
 *
 * Every level board is here, including the archived and the unfeatured ones:
 * the full-game archived disclosure is full-game only and the add dialog
 * refuses level boards, so this band is their one way back. Deliberately not
 * the full matrix, though — no reorder, no group control, no Featured toggle.
 * Each of those is decided at the level category, and the Edit link is the way
 * to the things that aren't.
 */
export function LevelBoardsBand({
    gameId,
    rows,
    groups,
    levelTemplates,
    pendingIds,
    onEdit,
    onRestore,
}: Props) {
    // Default collapsed, then adopt what this game remembered. Read in an
    // effect rather than in the initial state so the server and the first
    // client render agree.
    const [open, setOpen] = useState(false);
    const listId = useId();
    useEffect(() => {
        try {
            setOpen(window.localStorage.getItem(storageKey(gameId)) === 'open');
        } catch {
            // Private-mode storage denial — the band just stays collapsed.
        }
    }, [gameId]);

    const toggle = () => {
        const next = !open;
        setOpen(next);
        try {
            window.localStorage.setItem(
                storageKey(gameId),
                next ? 'open' : 'closed',
            );
        } catch {
            // Ignore: the disclosure still works for this visit.
        }
    };

    // One sub-band per level that actually has boards, in group display order,
    // plus a bucket for boards whose level isn't in `groups` at all. Nothing
    // may fall out of this band silently: the header count is what the band
    // renders, so an orphan is visible rather than subtracted.
    const byGroup = groups
        .filter((g) => g.kind === 'level')
        .map((g) => ({
            key: String(g.id),
            name: g.name,
            rows: rows.filter((r) => r.groupId === g.id),
        }))
        .filter((b) => b.rows.length > 0);

    const placed = new Set(byGroup.flatMap((b) => b.rows.map((r) => r.id)));
    const orphans = rows.filter((r) => !placed.has(r.id));
    const sections =
        orphans.length > 0
            ? [
                  ...byGroup,
                  { key: 'other', name: 'Other levels', rows: orphans },
              ]
            : byGroup;
    const shown = placed.size + orphans.length;

    return (
        <div className={styles.levelBand}>
            <div className={styles.levelBandHead}>
                <span className={styles.levelBandTitle}>
                    Level boards ({shown})
                </span>
                <button
                    type="button"
                    className={styles.archivedToggle}
                    aria-expanded={open}
                    aria-controls={listId}
                    onClick={toggle}
                >
                    {open ? 'Hide level boards' : 'Show level boards'}
                    {open ? (
                        <ChevronUp size={10} aria-hidden="true" />
                    ) : (
                        <ChevronDown size={10} aria-hidden="true" />
                    )}
                </button>
            </div>
            <p className={styles.note}>
                One board per level, per level category. They follow their level
                category — edit that once and every level takes it.
            </p>
            {open && (
                <div className={styles.levelList} id={listId}>
                    {sections.map((section) => (
                        <section
                            key={section.key}
                            className={styles.levelSection}
                        >
                            <h3 className={styles.levelName}>{section.name}</h3>
                            <ul className={styles.levelRows}>
                                {section.rows.map((row) => (
                                    <li
                                        key={row.id}
                                        className={styles.levelRow}
                                    >
                                        <span className={styles.levelRowName}>
                                            {levelBoardLabel(
                                                row,
                                                levelTemplates,
                                            )}
                                        </span>
                                        {row.levelOverride && (
                                            <span className={styles.levelFlag}>
                                                detached
                                            </span>
                                        )}
                                        {!row.isMain && row.active && (
                                            <span className={styles.levelFlag}>
                                                not featured
                                            </span>
                                        )}
                                        {!row.active && (
                                            <>
                                                <span
                                                    className={styles.levelFlag}
                                                >
                                                    archived
                                                </span>
                                                <button
                                                    type="button"
                                                    className={
                                                        styles.quietAction
                                                    }
                                                    style={{ opacity: 1 }}
                                                    disabled={pendingIds.has(
                                                        row.id,
                                                    )}
                                                    onClick={() =>
                                                        onRestore(row)
                                                    }
                                                >
                                                    Restore
                                                </button>
                                            </>
                                        )}
                                        <button
                                            type="button"
                                            className={styles.editLink}
                                            onClick={() => onEdit(row.id)}
                                        >
                                            Edit
                                            <ChevronRight
                                                size={11}
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
