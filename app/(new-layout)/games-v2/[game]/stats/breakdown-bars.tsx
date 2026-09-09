import { CountryFlag } from '../leaderboard/country-flag';
import styles from './stats.module.scss';

export interface BreakdownRow {
    label: string;
    count: number;
    /** ISO country code — renders a flag before the label when set. */
    country?: string;
}

/**
 * Magnitude as bar length, one hue, direct labels — the small-multiple
 * breakdown form (platforms, categories, countries). Server-rendered:
 * nothing here is interactive.
 */
export function BreakdownBars({ rows }: { rows: BreakdownRow[] }) {
    if (rows.length === 0) {
        return <p className={styles.sectionEmpty}>No data recorded.</p>;
    }
    const max = Math.max(...rows.map((r) => r.count));
    return (
        <ul className={styles.barList}>
            {rows.map((r) => (
                <li key={r.label} className={styles.barRow}>
                    <span className={styles.barLabel}>
                        {r.country && <CountryFlag country={r.country} />}
                        <span className={styles.barLabelText}>{r.label}</span>
                    </span>
                    <span className={styles.barTrack} aria-hidden>
                        <span
                            className={styles.barFill}
                            style={{
                                width: `${Math.max((r.count / max) * 100, 2)}%`,
                            }}
                        />
                    </span>
                    <span className={styles.barCount}>
                        {r.count.toLocaleString()}
                    </span>
                </li>
            ))}
        </ul>
    );
}

/**
 * A two-way split is one bar, not a two-row ranking: the whole is the
 * track, the accent is the first share, and both shares are labelled
 * under it with their percentage.
 */
export function StackedSplit({
    label,
    a,
    b,
}: {
    label: string;
    a: { label: string; count: number };
    b: { label: string; count: number };
}) {
    const total = a.count + b.count;
    if (total === 0) return null;
    const pct = (n: number) => (n / total) * 100;
    const fmt = (n: number) =>
        `${pct(n) >= 1 ? Math.round(pct(n)) : pct(n).toFixed(1)}%`;

    return (
        <div className={styles.split}>
            <span className={styles.splitLabel}>{label}</span>
            <span className={styles.splitTrack} aria-hidden>
                <span
                    className={styles.splitFill}
                    style={{ width: `${pct(a.count)}%` }}
                />
            </span>
            <div className={styles.splitLegend}>
                <span className={styles.splitItem}>
                    <span
                        className={`${styles.splitSwatch} ${styles.splitSwatchA}`}
                        aria-hidden
                    />
                    {a.label}
                    <span className={styles.splitValue}>{fmt(a.count)}</span>
                </span>
                <span className={styles.splitItem}>
                    <span
                        className={`${styles.splitSwatch} ${styles.splitSwatchB}`}
                        aria-hidden
                    />
                    {b.label}
                    <span className={styles.splitValue}>{fmt(b.count)}</span>
                </span>
            </div>
        </div>
    );
}
