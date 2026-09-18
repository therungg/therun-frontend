'use client';

import { useState } from 'react';
import { Plus } from 'react-bootstrap-icons';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import styles from './board-list.module.scss';

/** Chips shown before "Show N more". */
const INITIAL_CHIPS = 12;

export interface FromRunsPanelProps {
    pool: ResolvedCategory[];
    busyIds: ReadonlySet<number>;
    onFeature: (category: ResolvedCategory) => void;
}

/**
 * Categories runners have submitted to that are not on the board, busiest
 * first. One click puts a category on the board; removing it from the table
 * puts it back here.
 */
export function FromRunsPanel({
    pool,
    busyIds,
    onFeature,
}: FromRunsPanelProps) {
    const [expanded, setExpanded] = useState(false);
    if (pool.length === 0) return null;

    const shown = expanded ? pool : pool.slice(0, INITIAL_CHIPS);
    const hidden = pool.length - shown.length;

    return (
        <section className={styles.fromRuns} aria-labelledby="from-runs-title">
            <div className={styles.panelHead}>
                <h3 id="from-runs-title" className={styles.panelTitle}>
                    From runs
                </h3>
                <span className={styles.panelHint}>
                    Names runners have submitted that aren&apos;t on the board
                    yet
                </span>
            </div>
            <ul className={styles.chips}>
                {shown.map((c) => {
                    const runners = c.uniqueRunners ?? 0;
                    const runnersLabel = `${runners.toLocaleString()} ${runners === 1 ? 'runner' : 'runners'}`;
                    return (
                        <li key={c.id}>
                            <button
                                type="button"
                                className={styles.chip}
                                disabled={busyIds.has(c.id)}
                                onClick={() => onFeature(c)}
                                aria-label={`Add ${c.display} to the board (${runnersLabel})`}
                            >
                                <span className={styles.chipName}>
                                    {c.display}
                                </span>
                                <span className={styles.chipCount} aria-hidden>
                                    {runnersLabel}
                                </span>
                                <span className={styles.chipAdd} aria-hidden>
                                    <Plus size={14} />
                                </span>
                            </button>
                        </li>
                    );
                })}
                {hidden > 0 && (
                    <li>
                        <button
                            type="button"
                            className={`${styles.chip} ${styles.chipMore}`}
                            onClick={() => setExpanded(true)}
                        >
                            Show {hidden.toLocaleString()} more
                        </button>
                    </li>
                )}
            </ul>
        </section>
    );
}
