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
        <section className={styles.game}>
            <div className={styles.gameTitle}>Rejected</div>
            <div className={styles.gameSummary}>
                Only you and the boards' moderators can see these.
            </div>
            <div className={styles.entries}>
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
