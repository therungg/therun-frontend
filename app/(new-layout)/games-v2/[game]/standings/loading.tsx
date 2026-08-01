import styles from './loading.module.scss';

const ROWS = Array.from({ length: 10 });
const PILLS = Array.from({ length: 5 });

// Route-level loading UI for the standings tab. Standings is the heaviest
// fetch in games-v2 (the full runner x category matrix), so this is the one
// place a skeleton earns its keep. Geometry mirrors standings.module.scss so
// the real table lands in place instead of shifting the page — full content
// width, no sidebar rail (the matrix is the page).
export default function StandingsLoading() {
    return (
        <div className={styles.page}>
            <div className={styles.band}>
                {PILLS.map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
                    <div key={i} className={styles.pill} />
                ))}
            </div>
            <div className={styles.table}>
                {ROWS.map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
                    <div key={i} className={styles.row} />
                ))}
            </div>
        </div>
    );
}
