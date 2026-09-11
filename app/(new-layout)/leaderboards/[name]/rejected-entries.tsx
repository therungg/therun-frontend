import { getSession } from '~src/actions/session.action';
import { getRejectedEntriesAsViewer } from '~src/lib/leaderboards-profile';
import type { LeaderboardsProfileGame } from '../../../../types/leaderboards-profile.types';
import { EntryRow } from './entry-row';
import styles from './leaderboards-profile.module.scss';

export async function RejectedEntries({
    name,
    games,
    country,
}: {
    name: string;
    games: LeaderboardsProfileGame[];
    country: string | null;
}) {
    const session = await getSession();
    if (!session.username) return null;

    const rejected = await getRejectedEntriesAsViewer(name, session.id);
    if (rejected.length === 0) return null;
    const slugOf = new Map(games.map((g) => [g.gameId, g.gameSlug]));
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
                        gameSlug={slugOf.get(e.gameId) ?? ''}
                        country={country}
                    />
                ))}
            </div>
        </section>
    );
}
