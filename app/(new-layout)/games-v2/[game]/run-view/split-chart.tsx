import { formatTimeMs } from '~src/lib/run-view/time-format';
import type { RunSplit } from '../../../../../types/leaderboards.types';
import styles from './run-page.module.scss';

/** Segment durations as horizontal bars, longest = full width. */
export function SplitChart({ splits }: { splits: RunSplit[] }) {
    const segments = splits.map((s, i) => ({
        index: s.index,
        name: s.name,
        ms: s.splitTimeMs - (i > 0 ? splits[i - 1].splitTimeMs : 0),
    }));
    const longest = Math.max(...segments.map((s) => s.ms), 1);
    return (
        <ol className={styles.chart}>
            {segments.map((s) => (
                <li key={s.index} className={styles.chartRow}>
                    <span className={styles.chartName}>{s.name}</span>
                    <span className={styles.chartTrack}>
                        <span
                            className={styles.chartBar}
                            style={{ width: `${(s.ms / longest) * 100}%` }}
                        />
                    </span>
                    <span className={styles.chartTime}>
                        {formatTimeMs(s.ms)}
                    </span>
                </li>
            ))}
        </ol>
    );
}
