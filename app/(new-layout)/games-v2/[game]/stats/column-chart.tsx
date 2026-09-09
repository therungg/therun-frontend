'use client';

import { useState } from 'react';
import type { Column } from './derive';
import styles from './stats.module.scss';

interface Props {
    columns: Column[];
    /** Label every nth column; the rest keep their column but lose the
     *  tick. Defaults to whatever leaves about seven ticks on the axis. */
    tickEvery?: number;
    /** What one unit is, for the peak caption and the hover card. */
    unit: string;
    /** Names the x axis under the ticks ("PB time", "month"). */
    axisLabel: string;
    /** Rendered instead of the chart when there is nothing to plot. */
    empty?: string;
}

/**
 * Magnitude as column height over a shared baseline — the counterpart to
 * BreakdownBars for series that are ordered (months, time buckets) and so
 * must not be re-sorted by size. The peak caption is the whole y axis:
 * four gridlines to read three shapes off would cost more than they tell,
 * and the hover card carries the exact figure for the one column you asked
 * about.
 */
export function ColumnChart({
    columns,
    tickEvery,
    unit,
    axisLabel,
    empty = 'Not enough data yet.',
}: Props) {
    const [hovered, setHovered] = useState<number | null>(null);

    const max = Math.max(...columns.map((c) => c.value), 0);
    if (columns.length === 0 || max === 0) {
        return <p className={styles.sectionEmpty}>{empty}</p>;
    }

    const tracks = `repeat(${columns.length}, minmax(0, 1fr))`;
    // Buckets get finer as a board's spread widens, so the tick interval
    // follows the column count instead of being fixed per chart.
    const every = tickEvery ?? Math.max(1, Math.ceil(columns.length / 7));
    const active = hovered !== null ? columns[hovered] : null;
    const activeIndex = hovered ?? 0;

    return (
        <div className={styles.columnChart}>
            <p className={styles.columnPeak}>
                peak {max.toLocaleString()} {unit}
            </p>
            <div
                className={styles.columnPlotWrap}
                onMouseLeave={() => setHovered(null)}
            >
                {active && (
                    <div
                        className={styles.columnCard}
                        style={{
                            left: `${((activeIndex + 0.5) / columns.length) * 100}%`,
                        }}
                        aria-hidden
                    >
                        <strong>
                            {active.value.toLocaleString()} {unit}
                        </strong>
                        <span className={styles.chartTooltipMeta}>
                            {active.range}
                        </span>
                    </div>
                )}
                <ol
                    className={styles.columnPlot}
                    style={{ gridTemplateColumns: tracks }}
                >
                    {columns.map((c, i) => (
                        <li
                            key={c.key}
                            className={[
                                styles.column,
                                c.overflow ? styles.columnOverflow : '',
                                hovered !== null && hovered !== i
                                    ? styles.columnDimmed
                                    : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            onMouseEnter={() => setHovered(i)}
                            onFocus={() => setHovered(i)}
                            onBlur={() => setHovered(null)}
                        >
                            {/* The hit area is the whole column, not the bar:
                                a two-run month is 8px tall and nobody can
                                point at that. */}
                            <button
                                type="button"
                                className={styles.columnHit}
                                aria-label={`${c.range}: ${c.value} ${unit}`}
                            >
                                <span
                                    className={styles.columnFill}
                                    style={{
                                        height: `${(c.value / max) * 100}%`,
                                    }}
                                />
                            </button>
                        </li>
                    ))}
                </ol>
            </div>
            <div
                className={styles.columnTicks}
                style={{ gridTemplateColumns: tracks }}
            >
                {columns.map((c, i) => (
                    <span
                        key={c.key}
                        className={
                            hovered === i
                                ? `${styles.columnTick} ${styles.columnTickActive}`
                                : styles.columnTick
                        }
                        aria-hidden
                    >
                        {i % every === 0 || i === columns.length - 1
                            ? c.label
                            : ''}
                    </span>
                ))}
            </div>
            <p className={styles.columnAxis}>{axisLabel}</p>
        </div>
    );
}
