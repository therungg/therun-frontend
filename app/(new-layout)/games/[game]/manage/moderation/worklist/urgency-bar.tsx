import type { WorklistPage } from '../../../../../../../types/worklist.types';
import styles from './urgency-bar.module.scss';
import { TIER_COUNT_LABEL } from './worklist-model';

/**
 * The worklist's split by urgency: a bar sized by count and a legend under
 * it. Shared by the overview summary and the queue itself, so the two read
 * as the same thing. `showEmpty` keeps zero tiers in the legend, dimmed — on
 * the queue a zero is news; on the overview it is noise.
 */
export function UrgencyBar({
    counts,
    showEmpty = false,
}: {
    counts: WorklistPage['counts'];
    showEmpty?: boolean;
}) {
    const tiers = ([1, 2, 3] as const).map((tier) => ({
        tier,
        count: counts[`tier${tier}`],
        label: TIER_COUNT_LABEL[tier],
    }));
    const filled = tiers.filter((t) => t.count > 0);
    const legend = showEmpty ? tiers : filled;
    if (filled.length === 0 && !showEmpty) return null;

    return (
        <div className={styles.urgency}>
            {filled.length > 0 && (
                <div className={styles.bar} aria-hidden>
                    {filled.map((t) => (
                        <span
                            key={t.tier}
                            className={styles.segment}
                            data-tier={t.tier}
                            style={{ flexGrow: t.count }}
                        />
                    ))}
                </div>
            )}
            <ul className={styles.legend}>
                {legend.map((t) => (
                    <li
                        key={t.tier}
                        data-tier={t.tier}
                        data-empty={t.count === 0 || undefined}
                    >
                        <span className={styles.legendCount}>
                            {t.count.toLocaleString()}
                        </span>{' '}
                        {t.label}
                    </li>
                ))}
            </ul>
        </div>
    );
}
