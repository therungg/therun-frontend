import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import { parseSubcategoryKey } from '~src/lib/run-view/parse-subcategory-key';
import type { UserRanking } from '../../../../../types/leaderboards.types';
import { VerificationBadge } from '../run-view/run-badges';
import styles from './sidebar.module.scss';

interface Props {
    rankings: UserRanking[];
    gameSlug: string;
}

/**
 * Signed-in-only sidebar surface: the runner's own standing on this game,
 * one glance away. Sourced from `getUserRankingsByName`, which already
 * returns one (best) entry per board — pending non-PB attempts, hidden
 * runs, and open claims are invisible here. That's why the panel title
 * makes no "all your runs" claim, and why it renders nothing rather than
 * a misleadingly-empty state when there's nothing to show.
 */
export function YourRunsPanel({ rankings, gameSlug }: Props) {
    if (rankings.length === 0) return null;

    return (
        <section className={styles.panel}>
            <span className={`${styles.eyebrow} d-block mb-2`}>Your runs</span>
            <ul className="list-unstyled mb-0">
                {rankings.map((r) => {
                    const primary =
                        r.primaryTiming === 'gt'
                            ? (r.gameTime ?? r.time)
                            : r.time;
                    const subcategoryParts = parseSubcategoryKey(
                        r.subcategoryKey,
                    );

                    return (
                        <li
                            key={`${r.categoryId}-${r.subcategoryKey}`}
                            className={styles.yourRunRow}
                        >
                            <div className={styles.yourRunHead}>
                                <span className={styles.statLabel}>
                                    {r.category}
                                    {subcategoryParts.length > 0 && (
                                        <span className={styles.rowMeta}>
                                            {' '}
                                            ·{' '}
                                            {subcategoryParts
                                                .map((p) => p.value)
                                                .join(', ')}
                                        </span>
                                    )}
                                </span>
                                <VerificationBadge
                                    status={r.verificationStatus}
                                />
                            </div>
                            <span className={styles.statValue}>
                                <Link
                                    href={`/games-v2/${gameSlug}/run/${r.runId}`}
                                >
                                    <DurationToFormatted duration={primary} />
                                </Link>
                                {r.rank != null && (
                                    <span className={styles.rowMeta}>
                                        {' '}
                                        #{r.rank}
                                    </span>
                                )}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
