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
            <div className={styles.fromRunsHead}>
                <h3 id="from-runs-title" className={styles.fromRunsTitle}>
                    From runs
                </h3>
                <span className={styles.fromRunsNote}>
                    Runners submit to these, but they are not on the board
                </span>
            </div>
            <ul className={styles.chips}>
                {shown.map((c) => {
                    const runners = c.uniqueRunners ?? 0;
                    return (
                        <li key={c.id}>
                            <button
                                type="button"
                                className={styles.chip}
                                disabled={busyIds.has(c.id)}
                                onClick={() => onFeature(c)}
                                aria-label={`Add ${c.display} to the board (${runners} ${runners === 1 ? 'runner' : 'runners'})`}
                            >
                                <span>{c.display}</span>
                                <span className={styles.chipCount} aria-hidden>
                                    {runners.toLocaleString()}
                                </span>
                                <Plus size={14} aria-hidden />
                            </button>
                        </li>
                    );
                })}
            </ul>
            {hidden > 0 && (
                <button
                    type="button"
                    className={styles.showMore}
                    onClick={() => setExpanded(true)}
                >
                    Show {hidden.toLocaleString()} more
                </button>
            )}
        </section>
    );
}
