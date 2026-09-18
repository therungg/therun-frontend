import styles from './loading.module.scss';

const BOARD_ROWS = Array.from({ length: 10 });

// Route-level loading UI for the board page (`[game]/page.tsx` and any
// nested segment without its own `loading.tsx`). Pure static markup — no
// data, no client hooks. Mirrors the layout: band 1 the compact game hero,
// band 2 the category-selector rail, then the category band (the board's own
// header — category title + record) directly above the table in the main
// column — so the real content lands in place instead of shifting the page.
export default function GameLoading() {
    return (
        <div>
            <div className={styles.gamePlate}>
                <div className={styles.heroRow}>
                    <div className={styles.cover} />
                    <div className={styles.heroText}>
                        <div className={styles.titleBar} />
                        <div className={styles.factsLine} />
                    </div>
                    <div className={styles.heroActionChip} />
                </div>
            </div>
            <div className={styles.catPlate}>
                <div className={styles.plateSection}>
                    <div className={styles.railBlock} />
                </div>
            </div>

            <div className={styles.grid}>
                <div className={styles.colMain}>
                    {/* Category band — the board's own header. */}
                    <div className={styles.catBand}>
                        <div className={styles.catBandTitle} />
                        <div className={styles.catBandRecord} />
                    </div>
                    <div className={styles.table}>
                        <div className={styles.tableHead} />
                        {BOARD_ROWS.map((_, i) => (
                            <div
                                className={styles.row}
                                key={`skeleton-row-${i}`}
                            >
                                <div className={styles.rankChip} />
                                <div className={styles.runnerBar} />
                                <div className={styles.timeBar} />
                            </div>
                        ))}
                    </div>
                </div>
                <aside>
                    <div className={styles.railPanel} />
                    <div className={styles.railPanel} />
                </aside>
            </div>
        </div>
    );
}
