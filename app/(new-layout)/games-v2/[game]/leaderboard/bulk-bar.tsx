'use client';

import styles from './bulk-bar.module.scss';

interface Props {
    /** Selected rows on the viewed page. */
    count: number;
    onClear: () => void;
    /** Opens the moderate modal on the selection. */
    onModerate: () => void;
    /** True while a prior mutation's read-your-writes refetch is in flight. */
    busy?: boolean;
}

/**
 * Sticky selection strip under the board: how many rows are selected, a way
 * to clear them, and one way into the moderate modal. Every verb lives in
 * the modal, which counts what each one acts on.
 */
export function BoardBulkBar({
    count,
    onClear,
    onModerate,
    busy = false,
}: Props) {
    return (
        <div className={styles.bar} role="region" aria-label="Selection">
            <span className={styles.count}>{count} selected</span>
            <button type="button" className={styles.clear} onClick={onClear}>
                Clear
            </button>
            <span className={styles.verbs}>
                <button
                    type="button"
                    className={`${styles.pill} ${styles.pillOn}`}
                    disabled={busy}
                    onClick={onModerate}
                >
                    Moderate {count}
                </button>
            </span>
        </div>
    );
}
