import styles from './loading.module.scss';

const ROWS = Array.from({ length: 6 });

// Route-level loading UI for the stats tab: a strip of figures, a
// chart-sized block, then table-row shimmer — all on panels, so the real
// sections land in place instead of jumping onto a surface.
export default function StatsLoading() {
    return (
        <div className={styles.page}>
            <div className={styles.panel}>
                <div className={styles.strip}>
                    <div className={styles.figure} />
                    <div className={styles.figure} />
                    <div className={styles.figure} />
                </div>
            </div>
            <div className={styles.panel}>
                <div className={styles.chart} />
            </div>
            <div className={styles.panel}>
                <div className={styles.table}>
                    {ROWS.map((_, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
                        <div key={i} className={styles.row} />
                    ))}
                </div>
            </div>
        </div>
    );
}
