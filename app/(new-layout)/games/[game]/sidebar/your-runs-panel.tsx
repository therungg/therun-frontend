import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import { buildRunHref } from '~src/lib/board-url';
import { parseSubcategoryKey } from '~src/lib/run-view/parse-subcategory-key';
import { rendersAsRoster, rosterNames } from '~src/lib/run-view/roster';
import type { UserRanking } from '../../../../../types/leaderboards.types';
import { VerificationBadge } from '../run-view/run-badges';
import type { YourStanding } from '../types';
import { formatImprovement } from './format-improvement';
import styles from './sidebar.module.scss';

interface Props {
    rankings: UserRanking[];
    gameSlug: string;
    /**
     * Gaps for the board currently open — the runner one place ahead, and
     * the record. Only the open board has them: `UserRanking` carries no
     * neighbour times, so each board's gaps cost their own board reads (see
     * loadYourStanding in data.ts). Null when signed out, off the board, or
     * when either read failed.
     */
    standing?: YourStanding | null;
}

/**
 * Signed-in-only sidebar surface: the runner's own standing on this game,
 * one glance away. Sourced from `getUserRankingsByName`, which already
 * returns one (best) entry per board — pending non-PB attempts, hidden
 * runs, and open claims are invisible here. That's why the panel title
 * makes no "all your runs" claim, and why it renders nothing rather than
 * a misleadingly-empty state when there's nothing to show.
 *
 * The rank used to read "#4" with nothing to measure it against. It reads
 * "#4 of 37" now, and on the open board it carries the two gaps that decide
 * whether the next attempt is worth starting.
 */
export function YourRunsPanel({ rankings, gameSlug, standing = null }: Props) {
    if (rankings.length === 0) return null;

    // A category can appear more than once here (one row per subcategory),
    // and the gaps belong to exactly one board — the slice the URL is
    // showing. Hang them on the first row of that category rather than
    // repeating the same line under each of its subcategories.
    const gapRowIndex =
        standing == null
            ? -1
            : rankings.findIndex((r) => r.categoryId === standing.categoryId);

    return (
        <section className={styles.panel}>
            <div className={styles.panelHead}>
                <span className={styles.eyebrow}>Your standing</span>
            </div>
            <ul className="list-unstyled mb-0">
                {rankings.map((r, i) => {
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
                                <Link href={buildRunHref(gameSlug, r.runId)}>
                                    <DurationToFormatted duration={primary} />
                                </Link>
                                {r.rank != null && (
                                    <span className={styles.rowMeta}>
                                        {' '}
                                        #{r.rank}
                                        {/* "of 37" is what makes a rank
                                            legible: #4 is a different result
                                            on a 6-runner board than on a
                                            300-runner one. */}
                                        {r.totalRunners > 0 &&
                                            ` of ${r.totalRunners}`}
                                    </span>
                                )}
                            </span>
                            {standing && i === gapRowIndex && (
                                <GapLine standing={standing} />
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

/**
 * The two comparisons that matter on the open board. Renders nothing when
 * neither is available — a runner holding the record has no one ahead and no
 * gap to close, and that row is better left as a clean "#1 of 37".
 */
function GapLine({ standing }: { standing: YourStanding }) {
    const { nextUp, wrGap } = standing;
    if (!nextUp && wrGap == null) return null;
    return (
        <div className={styles.standingGap}>
            {nextUp && (
                <span className={styles.gapNext}>
                    −{formatImprovement(nextUp.gap)} to pass {aheadName(nextUp)}
                </span>
            )}
            {nextUp && wrGap != null && ' · '}
            {wrGap != null && <>+{formatImprovement(wrGap)} to the record</>}
        </div>
    );
}

/**
 * Who the row above credits. A team row names the whole team — passing it
 * means passing all of them, and naming whoever filed it reads as the wrong
 * runner to anyone who knows the board.
 */
function aheadName(nextUp: NonNullable<YourStanding['nextUp']>): string {
    if (!rendersAsRoster(nextUp.participants, nextUp)) return nextUp.runnerName;
    return rosterNames(nextUp.participants) ?? nextUp.runnerName;
}
