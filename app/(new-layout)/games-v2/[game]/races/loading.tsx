import styles from './loading.module.scss';

const ROWS = Array.from({ length: 8 });

// Route-level loading UI for the races tab — a band-height block, then
// row shimmer, mirroring races.module.scss geometry.
export default function RacesLoading() {
    return (
        <div className={styles.page}>
            <div className={styles.band} />
            <div className={styles.table}>
                {ROWS.map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
                    <div key={i} className={styles.row} />
                ))}
            </div>
        </div>
    );
}
