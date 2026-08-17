import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { UserRanking } from '../../../../../types/leaderboards.types';
import { formatSubcategoryKey, type LabelVariableDef } from '../labels';
import styles from './sidebar.module.scss';

interface Props {
    rankings: UserRanking[];
    gameSlug: string;
    /**
     * Variable definitions of the board on screen, so a subcategory value
     * prints as its display name ("Nintendo 64") rather than its slug. Rows
     * from other boards fall back to a humanized slug.
     */
    variableDefs?: LabelVariableDef[];
}

const STATUS_WORD = {
    pending: 'pending',
    rejected: 'rejected',
} as const;

/**
 * Signed-in-only: the runner's own standing on this game, one glance away.
 * Sourced from `getUserRankingsByName`, which returns one (best) entry per
 * board — pending non-PB attempts, hidden runs, and open claims are invisible
 * here. That's why the panel title makes no "all your runs" claim, and why it
 * renders nothing rather than a misleadingly-empty state.
 */
export function YourRunsPanel({ rankings, gameSlug, variableDefs }: Props) {
    if (rankings.length === 0) return null;

    return (
        <section className={styles.panel} aria-labelledby="rail-your-runs">
            <div className={styles.panelHead}>
                <h2 id="rail-your-runs" className={styles.eyebrow}>
                    Your runs
                </h2>
            </div>
            <ul className={styles.list}>
                {rankings.map((r) => {
                    const primary =
                        r.primaryTiming === 'gt'
                            ? (r.gameTime ?? r.time)
                            : r.time;
                    const slice = formatSubcategoryKey(
                        r.subcategoryKey,
                        variableDefs,
                    );
                    const status =
                        r.verificationStatus === 'verified'
                            ? null
                            : STATUS_WORD[r.verificationStatus];

                    return (
                        <li
                            key={`${r.categoryId}-${r.subcategoryKey}`}
                            className={styles.personRow}
                        >
                            <div className={styles.rowTop}>
                                <span className={styles.rowLabel}>
                                    {r.category}
                                    {slice && (
                                        <span className={styles.rowMeta}>
                                            {' · '}
                                            {slice}
                                        </span>
                                    )}
                                </span>
                                <span className={styles.rowTime}>
                                    <Link
                                        href={`/games-v2/${encodeURIComponent(gameSlug)}/run/${r.runId}`}
                                    >
                                        <DurationToFormatted
                                            duration={primary}
                                        />
                                    </Link>
                                </span>
                            </div>
                            {(r.rank != null || status) && (
                                <div className={styles.rowSub}>
                                    {r.rank != null && (
                                        <span className={styles.mono}>
                                            #{r.rank}
                                        </span>
                                    )}
                                    {status && (
                                        <span
                                            className={
                                                status === 'pending'
                                                    ? styles.statusPending
                                                    : styles.statusRejected
                                            }
                                        >
                                            {r.rank != null && ' · '}
                                            {status}
                                        </span>
                                    )}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
