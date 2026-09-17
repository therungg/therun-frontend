import { safeEncodeURI } from '~src/utils/uri';
import type {
    RunnerStatsCategory,
    RunnerStatsGame,
} from '../../../../../types/runner-profile.types';
import { formatCount, formatDuration, formatHours } from '../format';
import { ProfileGroup } from '../profile-group';
import ui from '../profile-ui.module.scss';
import { medalOf } from '../ranks';
import styles from './stats.module.scss';

/** Games open by default: all of a short list, the most played of a long one. */
const OPEN = 4;

/**
 * The run page path. A run key's segments past game#category are the
 * qualifiers that tell subcategories apart, and the run page wants them back
 * as `$`-joined suffixes on the category.
 */
function runHref(
    username: string,
    game: string,
    c: RunnerStatsCategory,
): string {
    const qualifiers = (c.runKey ?? '')
        .split('#')
        .slice(2)
        .map((part) => `$${safeEncodeURI(part)}`)
        .join('');
    return `/${safeEncodeURI(username)}/${safeEncodeURI(game)}/${safeEncodeURI(c.category)}${qualifiers}`;
}

/** A run keeping game time shows that clock, the way the profile always has. */
function igt(c: RunnerStatsCategory): boolean {
    return c.hasGameTime && !!c.gameTimePbMs;
}

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
        <div className={`${styles.games} ${ui.panelList}`}>
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
                            className={`${ui.colHead} ${ui.groupColHead}`}
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
                                    href={runHref(username, game.game, c)}
                                >
                                    <span className={ui.name}>
                                        <span className={ui.nameMain}>
                                            {c.category}
                                        </span>
                                        {c.subcategory ? (
                                            <span className={ui.nameSub}>
                                                {c.subcategory}
                                            </span>
                                        ) : null}
                                    </span>
                                    <span
                                        className={`${ui.num} ${ui.strong} ${ui.end}`}
                                    >
                                        {formatDuration(
                                            igt(c)
                                                ? c.gameTimePbMs
                                                : c.personalBestMs,
                                        )}
                                        {igt(c) ? (
                                            <span className={ui.timing}>
                                                {' '}
                                                (IGT)
                                            </span>
                                        ) : null}
                                    </span>
                                    <span
                                        className={`${ui.num} ${ui.muted} ${ui.end} ${ui.optional}`}
                                    >
                                        {formatDuration(
                                            igt(c)
                                                ? c.gameTimeSobMs
                                                : c.sumOfBestsMs,
                                        )}
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
