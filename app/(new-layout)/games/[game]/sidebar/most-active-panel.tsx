import { UserLink } from '~src/components/links/links';
import { formatRunDate } from '~src/lib/format-run-date';
import { relativeDate } from '../leaderboard/relative-date';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import { type ActiveRunner, MIN_ACTIVE_RUNNERS } from './active-runners';
import styles from './sidebar.module.scss';

interface Props {
    runners: ActiveRunner[];
}

/**
 * Who's been improving on this game lately.
 *
 * The rail had no people in it unless somebody happened to be live, which is
 * rarely. This gives the page faces on a 30-day window instead of a 5-minute
 * one. The heading says what the number counts — see deriveActiveRunners for
 * why it counts PBs and not attempts.
 */
export function MostActivePanel({ runners }: Props) {
    if (runners.length < MIN_ACTIVE_RUNNERS) return null;

    return (
        <section className={styles.panel}>
            <div className={styles.panelHead}>
                <span className={styles.eyebrow}>Most active</span>
                <span className={styles.rowMeta}>PBs · last 30 days</span>
            </div>
            <ul className="list-unstyled mb-0">
                {runners.map((r) => (
                    <li key={r.username} className={styles.pbRow}>
                        <div className={styles.pbTop}>
                            <span className={styles.rowUser}>
                                <RunnerAvatar name={r.username} size="xs" />
                                <UserLink
                                    username={r.username}
                                    url={undefined}
                                    to="leaderboards"
                                />
                            </span>
                            <span className={styles.activeCount}>{r.pbs}</span>
                        </div>
                        <div className={styles.pbMeta}>
                            {r.categories.slice(0, 2).join(', ')}
                            {r.categories.length > 2 &&
                                ` +${r.categories.length - 2}`}
                            {' · '}
                            <span title={formatRunDate(r.latestAt)}>
                                {relativeDate(r.latestAt)}
                            </span>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
