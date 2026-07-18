import styles from './loading.module.scss';

const BOARD_ROWS = Array.from({ length: 10 });

// Route-level loading UI for the board page (`[game]/page.tsx` and any
// nested segment without its own `loading.tsx`). Pure static markup — no
// data, no client hooks. Geometry mirrors game-page.module.scss so the
// real content lands in place instead of shifting the page.
export default function GameLoading() {
    return (
        <div>
            <div className={styles.hero}>
                <div className={styles.heroMain}>
                    <div className={styles.cover} />
                    <div className={styles.heroText}>
                        <div className={styles.titleBar} />
                        <div className={styles.metaBar} />
                        <div className={styles.actionsRow}>
                            <div className={styles.actionChip} />
                            <div className={styles.actionChip} />
                        </div>
                    </div>
                </div>
                <div className={styles.crown}>
                    <div className={styles.eyebrowBar} />
                    <div className={styles.crownTimeBar} />
                    <div className={styles.metaBar} />
                </div>
            </div>

            <div className={styles.band} />

            <div className={styles.grid}>
                <div className={styles.table}>
                    <div className={styles.tableHead} />
                    {BOARD_ROWS.map((_, i) => (
                        <div className={styles.row} key={`skeleton-row-${i}`}>
                            <div className={styles.rankChip} />
                            <div className={styles.runnerBar} />
                            <div className={styles.timeBar} />
                        </div>
                    ))}
                </div>
                <aside>
                    <div className={styles.railPanel} />
                    <div className={styles.railPanel} />
                </aside>
            </div>
        </div>
    );
}
