import styles from './leaderboards-profile.module.scss';

/** Marks a run in History that was a PB when it was set. */
export function PbTag() {
    return <span className={styles.pbTag}>PB</span>;
}
