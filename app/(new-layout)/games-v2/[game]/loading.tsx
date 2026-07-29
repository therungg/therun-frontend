import styles from './loading.module.scss';

const BOARD_ROWS = Array.from({ length: 10 });

// Route-level loading UI for the board page (`[game]/page.tsx` and any
// nested segment without its own `loading.tsx`). Pure static markup — no
// data, no client hooks. Mirrors the slim masthead in
// header/masthead.module.scss: a compact game-identity plate, then the
// standalone selector card — so the real content lands in place instead
// of shifting the page.
export default function GameLoading() {
    return (
        <div>
            <div className={styles.plate}>
                <div className={styles.plateTop}>
                    <div className={styles.heroRow}>
                        <div className={styles.cover} />
                        <div className={styles.heroText}>
                            <div className={styles.titleBar} />
                            <div className={styles.factsLine} />
                        </div>
                        <div className={styles.heroActionChip} />
                    </div>
                </div>
            </div>
            <div className={styles.railCard}>
                <div className={styles.railBlock} />
            </div>

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
