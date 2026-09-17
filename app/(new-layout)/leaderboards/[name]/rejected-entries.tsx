import { getSession } from '~src/actions/session.action';
import { getRejectedEntriesAsViewer } from '~src/lib/leaderboards-profile';
import type { LeaderboardsProfileGame } from '../../../../types/leaderboards-profile.types';
import { EntryRow } from './entry-row';
import { gameRefOf } from './format';
import styles from './leaderboards-profile.module.scss';

export async function RejectedEntries({
    name,
    games,
    country,
    boardsVisible,
}: {
    name: string;
    /** The profile's games, to name each entry's game for its link. A game with only rejected runs is missing here and its rows stay plain. */
    games: Pick<
        LeaderboardsProfileGame,
        'gameId' | 'gameSlug' | 'gameName' | 'game'
    >[];
    country: string | null;
    boardsVisible: boolean;
}) {
    const session = await getSession();
    if (!session.username) return null;

    const rejected = await getRejectedEntriesAsViewer(name, session.id);
    if (rejected.length === 0) return null;
    const refs = new Map(games.map((g) => [g.gameId, gameRefOf(g)]));
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
                        gameRef={refs.get(e.gameId) ?? null}
                        country={country}
                        boardsVisible={boardsVisible}
                    />
                ))}
            </div>
        </section>
    );
}
