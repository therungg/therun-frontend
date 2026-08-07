import styles from './loading.module.scss';

const ROWS = Array.from({ length: 8 });

// Route-level loading UI for the stats tab: a chart-sized block, then
// table-row shimmer. Geometry mirrors stats.module.scss so the real
// sections land in place.
export default function StatsLoading() {
    return (
        <div className={styles.page}>
            <div className={styles.chart} />
            <div className={styles.table}>
                {ROWS.map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
                    <div key={i} className={styles.row} />
                ))}
            </div>
        </div>
    );
}
