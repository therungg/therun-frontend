import type { Column } from './derive';
import styles from './stats.module.scss';

interface Props {
    columns: Column[];
    /** Label every nth column; the rest keep their column but lose the tick. */
    tickEvery?: number;
    /** Rendered instead of the chart when there is nothing to plot. */
    empty?: string;
}

/**
 * Magnitude as column height over a shared baseline — the counterpart to
 * BreakdownBars for series that are ordered (months, time buckets) and so
 * must not be re-sorted by size. Values live on the column's title; the
 * axis carries time, not numbers.
 */
export function ColumnChart({
    columns,
    tickEvery = 3,
    empty = 'Not enough data yet.',
}: Props) {
    const max = Math.max(...columns.map((c) => c.value), 0);
    if (columns.length === 0 || max === 0) {
        return <p className={styles.sectionEmpty}>{empty}</p>;
    }

    return (
        <ol className={styles.columnChart}>
            {columns.map((c, i) => (
                <li key={c.key} className={styles.column} title={c.tip}>
                    <span className={styles.columnTrack}>
                        <span
                            className={styles.columnFill}
                            style={{
                                height: `${Math.max((c.value / max) * 100, c.value > 0 ? 2 : 0)}%`,
                            }}
                        />
                    </span>
                    <span className={styles.columnTick} aria-hidden>
                        {i % tickEvery === 0 || i === columns.length - 1
                            ? c.label
                            : ''}
                    </span>
                    <span className="visually-hidden">
                        {c.label}: {c.value}
                    </span>
                </li>
            ))}
        </ol>
    );
}
