import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatRunDate } from '~src/lib/format-run-date';
import type { RecentPb } from '../../../../../types/leaderboards.types';
import { relativeDate } from '../leaderboard/relative-date';
import styles from './sidebar.module.scss';

interface Props {
    pbs: RecentPb[];
}

export function RecentPbsPanel({ pbs }: Props) {
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
                                both an `id` and a separate `runId` field, so
                                the two ids live in different spaces. Linking
                                the time to `/run/{p.id}` would 404 on a real
                                run id; link to the runner's profile instead
                                (same destination the UserLink above already
                                points at).
                            */}
                            <Link href={`/${p.username}`}>
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
