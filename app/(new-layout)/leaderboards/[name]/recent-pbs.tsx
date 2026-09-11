import { formatSubcategoryKey } from '~app/(new-layout)/games-v2/[game]/labels';
import Link from '~src/components/link';
import { formatRunDate } from '~src/lib/format-run-date';
import type { LeaderboardsProfileRecentPb } from '../../../../types/leaderboards-profile.types';
import { formatEntryTime } from './format';
import styles from './leaderboards-profile.module.scss';

export function RecentPbs({ pbs }: { pbs: LeaderboardsProfileRecentPb[] }) {
    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Recent PBs</h2>
            <div className={styles.recent}>
                {pbs.map((pb) => (
                    <Link
                        key={pb.runId}
                        href={`/games-v2/${encodeURIComponent(pb.gameSlug)}/run/${pb.runId}`}
                        className={styles.recentRow}
                    >
                        <span>
                            <span className={styles.entryCategory}>
                                {pb.game}
                            </span>{' '}
                            <span className={styles.entryVars}>
                                {pb.category}
                                {pb.subcategoryKey
                                    ? ` · ${formatSubcategoryKey(pb.subcategoryKey)}`
                                    : ''}
                            </span>
                        </span>
                        <span className={styles.entryTime}>
                            {/* The board's own precision setting is not part of the recent-PB payload. */}
                            {formatEntryTime({
                                timeMs: pb.timeMs,
                                showMilliseconds: false,
                            })}
                        </span>
                        <span className={styles.entryRank}>
                            {pb.rank !== null ? `#${pb.rank}` : '—'}
                        </span>
                        <span className={styles.entryDate}>
                            {formatRunDate(pb.achievedAt)}
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
