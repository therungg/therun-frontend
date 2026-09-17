import styles from './run-page.module.scss';

const PODIUM = [styles.medal1, styles.medal2, styles.medal3];

/** The board's podium ball for ranks 1–3, a plain "#N" below that. */
export function RankMedal({ rank }: { rank: number }) {
    if (rank >= 1 && rank <= 3) {
        return (
            <span
                className={`${styles.medal} ${PODIUM[rank - 1]}`}
                title={`#${rank}`}
            >
                {rank}
            </span>
        );
    }
    return <span className={styles.rankPlain}>#{rank.toLocaleString()}</span>;
}
