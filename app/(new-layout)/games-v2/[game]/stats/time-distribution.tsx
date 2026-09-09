'use client';

import { useState } from 'react';
import { ColumnChart } from './column-chart';
import type { Column } from './derive';
import styles from './stats.module.scss';

export interface DistributionBoard {
    slug: string;
    display: string;
    columns: Column[];
    /** Runs behind the histogram; shown next to the selector. */
    runs: number;
    median: string | null;
}

/**
 * PB spread, one board at a time. Mixing categories would average a 16-star
 * run into a 120-star one, so the pills switch boards instead of merging
 * them; boards with too few times to shape a curve never reach here.
 */
export function TimeDistribution({ boards }: { boards: DistributionBoard[] }) {
    const [slug, setSlug] = useState(boards[0]?.slug ?? '');
    const active = boards.find((b) => b.slug === slug) ?? boards[0];

    if (!active) {
        return (
            <p className={styles.sectionEmpty}>
                No board has enough ranked times to show a spread yet.
            </p>
        );
    }

    return (
        <div>
            <div className={styles.chartControls}>
                <div
                    className={styles.pillGroup}
                    role="group"
                    aria-label="Category"
                >
                    {boards.map((b) => (
                        <button
                            key={b.slug}
                            type="button"
                            className={
                                b.slug === active.slug
                                    ? styles.pillActive
                                    : styles.pill
                            }
                            aria-pressed={b.slug === active.slug}
                            onClick={() => setSlug(b.slug)}
                        >
                            {b.display}
                        </button>
                    ))}
                </div>
                <span className={styles.chartMeta}>
                    {active.runs.toLocaleString()} ranked runs
                    {active.median ? ` · median ${active.median}` : ''}
                </span>
            </div>
            <ColumnChart
                columns={active.columns}
                tickEvery={2}
                unit="runs"
                axisLabel="PB time — each column is one bucket, faster on the left"
            />
        </div>
    );
}
