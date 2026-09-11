import { formatProfileDate } from './format';
import styles from './leaderboards-profile.module.scss';

const WIDTH = 64;
const HEIGHT = 16;

/**
 * Successive PBs on one board as a tiny line: evenly spaced left to right,
 * the fastest time at the top, so an improving runner's line rises.
 */
export function PbSparkline({
    history,
}: {
    history: { date: string; timeMs: number }[];
}) {
    if (history.length < 2) return null;
    const times = history.map((p) => p.timeMs);
    const min = Math.min(...times);
    const max = Math.max(...times);
    const span = max - min;
    const step = (WIDTH - 2) / (history.length - 1);
    const points = times
        .map((t, i) => {
            const x = 1 + i * step;
            const y = span === 0 ? HEIGHT / 2 : 1 + ((t - min) / span) * 14;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
    const since = formatProfileDate(history[0].date);
    return (
        <span
            className={styles.sparkline}
            title={`${history.length} PBs${since ? ` since ${since}` : ''}`}
        >
            <svg
                width={WIDTH}
                height={HEIGHT}
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                aria-hidden
            >
                <polyline
                    points={points}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            </svg>
        </span>
    );
}
