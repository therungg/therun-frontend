import styles from './loading.module.scss';

const BOARD_ROWS = Array.from({ length: 10 });

const FACTS = Array.from({ length: 4 });

// Route-level loading UI for the board page (`[game]/page.tsx` and any
// nested segment without its own `loading.tsx`). Pure static markup — no
// data, no client hooks. Hero geometry mirrors the flat identity band in
// game-page.module.scss so the real content lands in place instead of
// shifting the page.
export default function GameLoading() {
    return (
        <div>
            <div className={styles.hero}>
                <div className={styles.heroTop}>
                    <div className={styles.cover} />
                    <div className={styles.heroText}>
                        <div className={styles.titleBar} />
                        <div className={styles.summaryLine} />
                        <div className={styles.summaryLineShort} />
                        <div className={styles.actionsRow}>
                            <div className={styles.actionChip} />
                            <div className={styles.actionChip} />
                        </div>
                    </div>
                    <div className={styles.factsGrid}>
                        {FACTS.map((_, i) => (
                            <div
                                className={styles.fact}
                                key={`skeleton-fact-${i}`}
                            >
                                <div className={styles.factLabel} />
                                <div className={styles.factValue} />
                            </div>
                        ))}
                    </div>
                </div>
                <div className={styles.heroStrip}>
                    <div className={styles.statBar} />
                    <div className={styles.statBar} />
                    <div className={styles.statBar} />
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
