import { getRejectedEntriesAsViewer } from '~src/lib/leaderboards-profile';
import type { LeaderboardsProfileGame } from '../../../../types/leaderboards-profile.types';
import { EntryRow } from './entry-row';
import styles from './leaderboards-profile.module.scss';

export async function RejectedEntries({
    name,
    sessionId,
    games,
}: {
    name: string;
    sessionId: string;
    games: LeaderboardsProfileGame[];
}) {
    const rejected = await getRejectedEntriesAsViewer(name, sessionId);
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
                    />
                ))}
            </div>
        </section>
    );
}
