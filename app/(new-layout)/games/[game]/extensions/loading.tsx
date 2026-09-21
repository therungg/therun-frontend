import styles from '../levels/loading.module.scss';

const ROWS = Array.from({ length: 12 });

// Route-level loading UI for the Levels tab. The record column costs one
// leaderboard request per played level, so this is the one part of the page
// that can keep someone waiting. Geometry mirrors levels.module.scss's table
// so the real rows land in place instead of shifting the page.
export default function LevelsLoading() {
    return (
        <div className={styles.page}>
            {ROWS.map((_, i) => (
                <div key={i} className={styles.row} />
            ))}
        </div>
    );
}
