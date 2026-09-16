import { safeEncodeURI } from '~src/utils/uri';
import type { RunnerStatsGame } from '../../../../../types/runner-profile.types';
import { formatCount, formatDuration, formatHours } from '../format';
import { ProfileGroup } from '../profile-group';
import ui from '../profile-ui.module.scss';
import { medalOf } from '../ranks';
import styles from './stats.module.scss';

/** Games open by default: all of a short list, the most played of a long one. */
const OPEN = 4;

function Rank({ rank }: { rank: number | null }) {
    if (rank === null) return <span className={ui.faint}>—</span>;
    return (
        <span className={ui.rank} data-medal={medalOf(rank)}>
            #{rank}
        </span>
    );
}

export function GamesPanel({
    games,
    username,
}: {
    games: RunnerStatsGame[];
    username: string;
}) {
    return (
        <div className={`${styles.games} ${styles.gameList}`}>
            {games.map((game, i) => (
                <div key={game.gameId} className={ui.panel}>
                    <ProfileGroup
                        title={game.game}
                        imageUrl={game.imageUrl}
                        defaultOpen={games.length <= 6 || i < OPEN}
                        collapsible={games.length > 1}
                        meta={`${formatHours(game.playtimeMs)} · ${formatCount(game.attempts)} attempts · ${formatCount(game.finishedAttempts)} finished`}
                        aside={
                            game.bestRank !== null ? (
                                <>
                                    best <Rank rank={game.bestRank} />
                                </>
                            ) : null
                        }
                    >
                        <div
                            className={`${ui.colHead} ${styles.gameColHead}`}
                            aria-hidden
                        >
                            <span>Category</span>
                            <span className={ui.end}>PB</span>
                            <span className={`${ui.end} ${ui.optional}`}>
                                Sum of best
                            </span>
                            <span className={`${ui.end} ${ui.optional}`}>
                                Attempts
                            </span>
                            <span className={`${ui.end} ${ui.optional}`}>
                                Finished
                            </span>
                            <span className={ui.end}>Played</span>
                            <span className={ui.end}>Rank</span>
                        </div>
                        {[...game.categories]
                            .sort((a, b) => b.playtimeMs - a.playtimeMs)
                            .map((c) => (
                                <a
                                    key={c.runId}
                                    className={ui.row}
                                    href={`/${safeEncodeURI(username)}/${safeEncodeURI(game.game)}/${safeEncodeURI(c.category)}`}
                                >
                                    <span className={ui.name}>
                                        <span className={ui.nameMain}>
                                            {c.category}
                                        </span>
                                    </span>
                                    <span className={`${ui.stacked} ${ui.end}`}>
                                        <span
                                            className={`${ui.num} ${ui.strong}`}
                                        >
                                            {formatDuration(c.personalBestMs)}
                                        </span>
                                        {c.hasGameTime && c.gameTimePbMs ? (
                                            <span
                                                className={`${ui.num} ${ui.small} ${ui.muted}`}
                                            >
                                                IGT{' '}
                                                {formatDuration(c.gameTimePbMs)}
                                            </span>
                                        ) : null}
                                    </span>
                                    <span
                                        className={`${ui.num} ${ui.muted} ${ui.end} ${ui.optional}`}
                                    >
                                        {formatDuration(c.sumOfBestsMs)}
                                    </span>
                                    <span
                                        className={`${ui.num} ${ui.end} ${ui.optional}`}
                                    >
                                        {formatCount(c.attempts)}
                                    </span>
                                    <span
                                        className={`${ui.num} ${ui.muted} ${ui.end} ${ui.optional}`}
                                    >
                                        {formatCount(c.finishedAttempts)}
                                    </span>
                                    <span className={`${ui.num} ${ui.end}`}>
                                        {formatHours(c.playtimeMs)}
                                    </span>
                                    <span className={ui.end}>
                                        <Rank rank={c.bestRank} />
                                    </span>
                                </a>
                            ))}
                    </ProfileGroup>
                </div>
            ))}
        </div>
    );
}
