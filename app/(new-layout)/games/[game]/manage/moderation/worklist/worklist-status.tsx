import type { WorklistPage } from '../../../../../../../types/worklist.types';
import { UrgencyBar } from './urgency-bar';
import styles from './worklist-status.module.scss';

/**
 * The top of the queue, read in one look: how many runs wait on you, how
 * they split by urgency, and — when nothing urgent is left — saying so.
 * `decided` counts this visit's verdicts so clearing the queue shows.
 */
export function WorklistStatus({
    page,
    decided,
}: {
    page: WorklistPage;
    decided: number;
}) {
    const { counts } = page;
    const waiting = counts.needsYou;
    const urgent = counts.tier1 + counts.tier2;

    return (
        <section
            className={styles.status}
            data-state={waiting === 0 ? 'clear' : 'waiting'}
            aria-label="Queue status"
            aria-live="polite"
        >
            <div className={styles.head}>
                <div>
                    {waiting === 0 ? (
                        <p className={styles.headline}>Nothing needs you.</p>
                    ) : (
                        <p className={styles.headline}>
                            <span className={styles.count}>
                                {waiting.toLocaleString()}
                                {page.truncated ? '+' : ''}
                            </span>{' '}
                            waiting on you
                        </p>
                    )}
                    {waiting > 0 && urgent === 0 && (
                        <p className={styles.clear}>
                            Nothing urgent. Everything left is routine.
                        </p>
                    )}
                </div>
                {decided > 0 && (
                    <p className={styles.decided}>
                        <span className={styles.decidedCount}>
                            {decided.toLocaleString()}
                        </span>{' '}
                        decided this visit
                    </p>
                )}
            </div>
            {waiting > 0 && <UrgencyBar counts={counts} showEmpty />}
        </section>
    );
}
