import { formatSubcategoryKey } from '~app/(new-layout)/games-v2/[game]/labels';
import Link from '~src/components/link';
import type { LeaderboardsProfileRecentPb } from '../../../../types/leaderboards-profile.types';
import { formatEntryTime, formatProfileDate } from './format';
import styles from './leaderboards-profile.module.scss';

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
                    <Link
                        key={pb.runId}
                        href={`/games-v2/${encodeURIComponent(pb.gameSlug)}/run/${pb.runId}`}
                        className={styles.recentRow}
                    >
                        <span className={styles.recentName}>
                            <span className={styles.entryCategory}>
                                {pb.game}
                            </span>
                            <span className={styles.entryVars}>
                                {' · '}
                                {pb.category}
                                {pb.subcategoryKey
                                    ? ` · ${formatSubcategoryKey(pb.subcategoryKey)}`
                                    : ''}
                            </span>
                        </span>
                        <span className={styles.recentLine}>
                            <span className={styles.recentTime}>
                                {/* The board's own precision setting is not part of the recent-PB payload. */}
                                {formatEntryTime({
                                    timeMs: pb.timeMs,
                                    showMilliseconds: false,
                                })}
                            </span>
                            <span className={styles.recentRank}>
                                {pb.rank !== null ? `#${pb.rank}` : '—'}
                            </span>
                            <span className={styles.recentDate}>
                                {formatProfileDate(pb.achievedAt)}
                            </span>
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
