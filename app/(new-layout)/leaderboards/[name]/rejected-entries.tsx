import { getSession } from '~src/actions/session.action';
import { getRejectedEntriesAsViewer } from '~src/lib/leaderboards-profile';
import { EntryRow } from './entry-row';
import styles from './leaderboards-profile.module.scss';

export async function RejectedEntries({
    name,
    country,
}: {
    name: string;
    country: string | null;
}) {
    const session = await getSession();
    if (!session.username) return null;

    const rejected = await getRejectedEntriesAsViewer(name, session.id);
    if (rejected.length === 0) return null;
    return (
        <section className={styles.runsGame}>
            <div className={styles.runsRejectedHead}>
                <h3 className={styles.runsTitle}>Rejected</h3>
                <span className={styles.runsBestWhat}>
                    Only you and the boards' moderators can see these.
                </span>
            </div>
            <div className={styles.runsRows}>
                {rejected.map((e) => (
                    <EntryRow
                        key={`${e.kind}-${e.runId ?? e.manualTimeId}`}
                        entry={e}
                        country={country}
                    />
                ))}
            </div>
        </section>
    );
}
