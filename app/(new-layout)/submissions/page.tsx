import { loadHeldPbsAction } from '~src/actions/pb-submission.action';
import { getSession } from '~src/actions/session.action';
import Link from '~src/components/link';
import { getFormattedString } from '~src/components/util/datetime';
import buildMetadata from '~src/utils/metadata';
import settings from '../settings/settings.module.scss';
import styles from './submissions.module.scss';

export const metadata = buildMetadata({
    title: 'Runs waiting on you',
    description: 'Personal bests a board is holding until you submit them.',
});

const waitingFor = (since: string): string => {
    const days = Math.floor(
        (Date.now() - new Date(since).getTime()) / 86_400_000,
    );
    if (days < 1) return 'today';
    if (days === 1) return 'since yesterday';
    return `for ${days} days`;
};

export default async function SubmissionsPage() {
    const session = await getSession();
    if (!session.id) {
        return (
            <div className={settings.pane}>
                <p className={settings.loginRequired}>
                    Sign in to see the runs waiting on you.
                </p>
            </div>
        );
    }

    const res = await loadHeldPbsAction();
    if (!res.ok) {
        return (
            <div className={settings.pane}>
                <header className={settings.paneHeader}>
                    <h1 className={settings.paneTitle}>Runs waiting on you</h1>
                </header>
                <p className={settings.paneNote}>{res.error}</p>
            </div>
        );
    }

    return (
        <div className={settings.pane}>
            <header className={settings.paneHeader}>
                <h1 className={settings.paneTitle}>Runs waiting on you</h1>
                <p className={settings.paneLede}>
                    These boards ask their runners to submit their own personal
                    bests. Until you do, a run stays off the leaderboard — it is
                    not lost, and nothing here expires.
                </p>
            </header>

            {res.held.length === 0 ? (
                <p className={settings.paneNote}>
                    Nothing is waiting on you right now.
                </p>
            ) : (
                <ul className={styles.list}>
                    {res.held.map((h) => (
                        <li key={h.runId} className={styles.row}>
                            <div className={styles.rowMain}>
                                <span className={styles.board}>
                                    {h.categoryDisplay ?? 'Unknown board'}
                                </span>
                                <span className={styles.time}>
                                    {getFormattedString(String(h.timeMs))}
                                </span>
                            </div>
                            <div className={styles.rowMeta}>
                                <span className={styles.waiting}>
                                    Waiting {waitingFor(h.heldAt)}
                                </span>
                                <Link
                                    href={`/submissions/${h.runId}`}
                                    className="btn btn-primary btn-sm"
                                >
                                    Submit this run
                                </Link>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
