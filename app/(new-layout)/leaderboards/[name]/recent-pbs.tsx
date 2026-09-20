import Link from '~src/components/link';
import { buildRunHref } from '~src/lib/board-url';
import type { LeaderboardsProfileRecentPb } from '../../../../types/leaderboards-profile.types';
import { formatEntryTime, formatProfileDate, gameRefOf } from './format';
import styles from './leaderboards-profile.module.scss';
import { Partners } from './partners';
import { SubcategoryTags } from './subcategory-tags';

const LIMIT = 10;

/** Sidebar card: the latest PBs, game and category over time, rank, date. */
export function RecentPbs({ pbs }: { pbs: LeaderboardsProfileRecentPb[] }) {
    return (
        <section className={styles.card} aria-labelledby="profile-recent-pbs">
            <h2 id="profile-recent-pbs" className={styles.cardTitle}>
                Recent PBs
            </h2>
            <div className={styles.recent}>
                {pbs.slice(0, LIMIT).map((pb) => (
                    // A plain row, not an anchor: a partner's own profile
                    // link lives inside it, and an <a> cannot nest inside
                    // another <a>. The run link is stretched over the row
                    // instead (same pattern as .runLink in entry-row.tsx).
                    <div key={pb.runId} className={styles.recentRow}>
                        <span className={styles.recentName}>
                            <span className={styles.entryCategory}>
                                {pb.game}
                            </span>
                            <span className={styles.entryVars}>
                                {' · '}
                                {pb.category}
                            </span>
                            <SubcategoryTags entry={pb} />
                        </span>
                        <span className={styles.recentLine}>
                            <span className={styles.recentTime}>
                                <Link
                                    href={buildRunHref(gameRefOf(pb), pb.runId)}
                                    className={`${styles.recentTimeLink} stretched-link`}
                                    // The whole row used to be the anchor, so
                                    // its name read as the game and category.
                                    // Stretching the link over the TIME keeps
                                    // the click target, but this is still the
                                    // link's only accessible name — it has to
                                    // carry both what run this is AND the time
                                    // printed on it, or the one focusable
                                    // element on the row stops announcing the
                                    // time it visibly shows.
                                    aria-label={`${pb.game} — ${pb.category}, ${formatEntryTime(
                                        {
                                            timeMs: pb.timeMs,
                                            showMilliseconds: false,
                                        },
                                    )}`}
                                >
                                    {/* The board's own precision setting is not part of the recent-PB payload. */}
                                    {formatEntryTime({
                                        timeMs: pb.timeMs,
                                        showMilliseconds: false,
                                    })}
                                </Link>
                            </span>
                            <span className={styles.recentRank}>
                                {pb.rank !== null ? `#${pb.rank}` : '—'}
                            </span>
                            <span className={styles.recentDate}>
                                {formatProfileDate(pb.achievedAt)}
                            </span>
                            <Partners partners={pb.partners} />
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}
