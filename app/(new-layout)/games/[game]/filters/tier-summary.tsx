import styles from '../header/masthead.module.scss';

interface Props {
    /** Rows on the board as currently narrowed. */
    totalItems: number;
}

/**
 * The right end of the filter tier: what the current selection actually
 * resolved to.
 *
 * Before this, the header stated the selection four times (one highlight per
 * row) and the *result* zero times — you had to scroll to the table to learn
 * whether narrowing had left you eight runners or eight hundred. The number
 * belongs next to the controls that produce it, and it is also the only place
 * that names the unit the bare chip counts are counting.
 */
export function TierSummary({ totalItems }: Props) {
    return (
        <div className={styles.tierEnd}>
            <span className={styles.tierCount}>
                <strong>{totalItems.toLocaleString()}</strong>{' '}
                {totalItems === 1 ? 'runner' : 'runners'}
            </span>
        </div>
    );
}
