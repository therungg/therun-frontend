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
 * breakdown form (platforms, emulator split, countries). Server-rendered:
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
