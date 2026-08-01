import styles from './sidebar.module.scss';

interface Props {
    values: number[];
    /** The last value covers an unfinished period — its segment renders dashed. */
    partialLast?: boolean;
    /** Accessible one-line description of what the series shows. */
    label: string;
}

const W = 100;
const H = 36;
const PAD = 4;

/**
 * Single-series inline sparkline. The line sits in the de-emphasis ink; only
 * the current-period endpoint gets the accent, per the stat-tile convention.
 * Stroke widths use vector-effect: non-scaling-stroke because the viewBox is
 * stretched non-uniformly to fill the rail's width.
 */
export function Sparkline({ values, partialLast = false, label }: Props) {
    if (values.length < 2) return null;
    const max = Math.max(...values);
    const x = (i: number) => (i / (values.length - 1)) * W;
    const y = (v: number) =>
        max === 0 ? H - PAD : H - PAD - (v / max) * (H - PAD * 2);
    const pts = values.map((v, i) => [x(i), y(v)] as const);
    const line = (slice: (readonly [number, number])[]) =>
        slice.map(([px, py]) => `${px},${py.toFixed(1)}`).join(' ');

    const solid = partialLast ? pts.slice(0, -1) : pts;
    const last = pts[pts.length - 1];

    return (
        <svg
            className={styles.sparkline}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={label}
        >
            <title>{label}</title>
            <polyline
                className={styles.sparkLine}
                points={line(solid)}
                vectorEffect="non-scaling-stroke"
            />
            {partialLast && (
                <polyline
                    className={`${styles.sparkLine} ${styles.sparkLinePartial}`}
                    points={line(pts.slice(-2))}
                    vectorEffect="non-scaling-stroke"
                />
            )}
            {/* Zero-length round-capped path = an undistorted dot. */}
            <path
                className={styles.sparkDot}
                d={`M ${last[0]} ${last[1].toFixed(1)} l 0 0.01`}
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}
