import type { Column } from './derive';
import styles from './stats.module.scss';

interface Props {
    columns: Column[];
    /** Label every nth column; the rest keep their column but lose the tick. */
    tickEvery?: number;
    /** What one unit is, for the peak caption ("289 runs"). */
    unit: string;
    /** Rendered instead of the chart when there is nothing to plot. */
    empty?: string;
}

/**
 * Magnitude as column height over a shared baseline — the counterpart to
 * BreakdownBars for series that are ordered (months, time buckets) and so
 * must not be re-sorted by size. The peak caption is the whole y axis: four
 * gridlines to read three shapes off would cost more than they tell.
 */
export function ColumnChart({
    columns,
    tickEvery = 3,
    unit,
    empty = 'Not enough data yet.',
}: Props) {
    const max = Math.max(...columns.map((c) => c.value), 0);
    if (columns.length === 0 || max === 0) {
        return <p className={styles.sectionEmpty}>{empty}</p>;
    }

    const tracks = `repeat(${columns.length}, minmax(0, 1fr))`;

    return (
        <div className={styles.columnChart}>
            <p className={styles.columnPeak}>
                peak {max.toLocaleString()} {unit}
            </p>
            <ol
                className={styles.columnPlot}
                style={{ gridTemplateColumns: tracks }}
            >
                {columns.map((c) => (
                    <li
                        key={c.key}
                        title={c.tip}
                        className={
                            c.overflow
                                ? `${styles.column} ${styles.columnOverflow}`
                                : styles.column
                        }
                    >
                        <span
                            className={styles.columnFill}
                            style={{
                                height: `${(c.value / max) * 100}%`,
                            }}
                        />
                        <span className="visually-hidden">
                            {c.label}: {c.value}
                        </span>
                    </li>
                ))}
            </ol>
            <div
                className={styles.columnTicks}
                style={{ gridTemplateColumns: tracks }}
            >
                {columns.map((c, i) => (
                    <span key={c.key} className={styles.columnTick} aria-hidden>
                        {i % tickEvery === 0 || i === columns.length - 1
                            ? c.label
                            : ''}
                    </span>
                ))}
            </div>
        </div>
    );
}
