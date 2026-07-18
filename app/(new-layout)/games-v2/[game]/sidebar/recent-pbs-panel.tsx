import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatRunDate } from '~src/lib/format-run-date';
import type { RecentPb } from '../../../../../types/leaderboards.types';
import { relativeDate } from '../leaderboard/relative-date';
import styles from './sidebar.module.scss';

interface Props {
    pbs: RecentPb[];
    gameSlug: string;
}

export function RecentPbsPanel({ pbs, gameSlug }: Props) {
    if (pbs.length === 0) {
        return (
            <section className={styles.panel}>
                <span className={`${styles.eyebrow} d-block mb-2`}>
                    Recent PBs
                </span>
                <p className="text-muted mb-0">No recent PBs.</p>
            </section>
        );
    }

    return (
        <section className={styles.panel}>
            <span className={`${styles.eyebrow} d-block mb-2`}>Recent PBs</span>
            <ul className="list-unstyled mb-0">
                {pbs.slice(0, 5).map((p) => (
                    <li key={p.id} className={styles.row}>
                        <UserLink username={p.username} url={undefined} />
                        <span className={styles.statValue}>
                            {/*
                                RecentPb.id is the finished_run row id (from
                                /v1/finished-runs), not the run id
                                getRunById/`/games-v2/[game]/run/[runId]`
                                expects — the same endpoint's other shape
                                (FinishedRunPB, src/lib/highlights.ts) carries
                                a separate `runId` field. getRecentPbs casts
                                the raw response straight to RecentPb[] with
                                no mapping, so `runId` may be present at
                                runtime even though it wasn't in the type;
                                link to the run when it is, and fall back to
                                the runner's profile (same destination the
                                UserLink above points at) when it isn't.
                            */}
                            <Link
                                href={
                                    typeof p.runId === 'number'
                                        ? `/games-v2/${gameSlug}/run/${p.runId}`
                                        : `/${p.username}`
                                }
                            >
                                <DurationToFormatted duration={p.time} />
                            </Link>{' '}
                            <span className={styles.rowMeta}>
                                {p.category} ·{' '}
                                <span title={formatRunDate(p.endedAt)}>
                                    {relativeDate(p.endedAt)}
                                </span>
                            </span>
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
