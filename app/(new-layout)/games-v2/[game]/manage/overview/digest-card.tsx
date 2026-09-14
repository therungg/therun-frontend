import type { WorklistDigest } from '../../../../../../types/worklist.types';
import { REASON_LABEL } from '../moderation/worklist/worklist-model';
import styles from './board-overview.module.scss';

/**
 * "Nothing needs you" doesn't say whether the rules are right. Many manual
 * verdicts means automation is too strict; zero flags on a busy board means
 * too lenient. This shows the last several days so a moderator can tell.
 */
export function DigestCard({
    digest,
    onOpenQueue,
}: {
    digest: WorklistDigest;
    onOpenQueue: () => void;
}) {
    const total = digest.autoVerified + digest.modVerified + digest.declined;
    const nothing = total === 0 && digest.flagged.length === 0;

    return (
        <section className={styles.card}>
            <header className={styles.cardHead}>
                <h3 className={styles.cardEyebrow}>Last {digest.days} days</h3>
                <button
                    type="button"
                    className={styles.cardLink}
                    onClick={onOpenQueue}
                >
                    Open the mod queue
                </button>
            </header>
            {nothing ? (
                <div className={styles.cardEmpty}>
                    <p className={styles.cardEmptyTitle}>
                        No runs were decided and nothing was flagged.
                    </p>
                </div>
            ) : (
                <div className={styles.cardBody}>
                    <div className={styles.syncRow}>
                        <span className={styles.syncK}>
                            Verified automatically
                        </span>
                        <span className={styles.syncV}>
                            {digest.autoVerified}
                        </span>
                    </div>
                    <div className={styles.syncRow}>
                        <span className={styles.syncK}>
                            Verified by a moderator
                        </span>
                        <span className={styles.syncV}>
                            {digest.modVerified}
                        </span>
                    </div>
                    <div className={styles.syncRow}>
                        <span className={styles.syncK}>Declined</span>
                        <span className={styles.syncV}>{digest.declined}</span>
                    </div>
                    {digest.flagged.length > 0 && (
                        <p className={styles.syncEmpty}>
                            Flagged:{' '}
                            {digest.flagged
                                .map(
                                    (f) =>
                                        `${f.count} ${REASON_LABEL[f.reason] ?? f.reason}`,
                                )
                                .join(', ')}
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}
