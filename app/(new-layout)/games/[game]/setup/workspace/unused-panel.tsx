'use client';

import { useEffect, useState } from 'react';
import type { MergeCategory } from '../../../../../../types/reassignments.types';
import { listMergeCategoriesAction } from '../../manage/reassignments/merge-actions';
import styles from './board-list.module.scss';

export interface UnusedPanelProps {
    gameId: number;
    levels: boolean;
    levelGroupIds: ReadonlySet<number>;
    version: number;
    onRename: (category: { id: number; display: string }) => void;
    onDelete: (category: { id: number; display: string }) => void;
}

export function UnusedPanel({
    gameId,
    levels,
    levelGroupIds,
    version,
    onRename,
    onDelete,
}: UnusedPanelProps) {
    const [rows, setRows] = useState<MergeCategory[]>([]);

    useEffect(() => {
        let live = true;
        listMergeCategoriesAction(gameId)
            .then((payload) => {
                if (live) setRows(payload.categories);
            })
            .catch(() => {
                if (live) setRows([]);
            });
        return () => {
            live = false;
        };
    }, [gameId, version]);

    const unused = rows
        .filter(
            (c) =>
                c.runs === 0 &&
                c.mergedInto === null &&
                (c.archived || !c.featured) &&
                (c.groupId !== null && levelGroupIds.has(c.groupId)) === levels,
        )
        .sort((a, b) => a.display.localeCompare(b.display));
    if (unused.length === 0) return null;

    return (
        <section className={styles.fromRuns} aria-labelledby="unused-title">
            <div className={styles.panelHead}>
                <h3 id="unused-title" className={styles.panelTitle}>
                    Unused
                </h3>
                <span className={styles.panelHint}>
                    Not on the board and no runs. Delete one to free its name.
                </span>
            </div>
            <ul className={styles.unusedList}>
                {unused.map((c) => (
                    <li key={c.id} className={styles.unusedRow}>
                        <span className={styles.chipName}>{c.display}</span>
                        {c.archived && (
                            <span className={styles.chipCount}>archived</span>
                        )}
                        <span className={styles.unusedActions}>
                            <button
                                type="button"
                                className={styles.rowAction}
                                onClick={() => onRename(c)}
                            >
                                Rename
                            </button>
                            <button
                                type="button"
                                className={styles.removeAction}
                                onClick={() => onDelete(c)}
                            >
                                Delete
                            </button>
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
