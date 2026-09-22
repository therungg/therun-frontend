import { timerRunHref, timerRunSegments } from '~src/lib/timer-run-href';
import type {
    RunnerStatsCategory,
    RunnerStatsGame,
} from '../../../../../types/runner-profile.types';
import { formatCount, formatDuration, formatHours } from '../format';
import { ProfileGroup } from '../profile-group';
import ui from '../profile-ui.module.scss';
import { medalOf } from '../ranks';
import { HighlightStar } from './highlight-star';
import { RunRow, RunsOwnerScope } from './run-rows';
import type { Timing } from './runs-filters';
import styles from './stats.module.scss';

/** Games open by default: all of a short list, the most played of a long one. */
const OPEN = 4;

/**
 * Which clock a row is read on.
 *
 * A run keeping game time shows that clock, the way the profile always has.
 * The tab's Times filter overrides it: `rta` puts every row on real time,
 * `igt` asks for game time and falls back to real time on the runs that
 * never kept one.
 */
function igt(c: RunnerStatsCategory, timing: Timing | null): boolean {
    if (timing === 'rta') return false;
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
    timing = null,
}: {
    games: RunnerStatsGame[];
    username: string;
    /** The clock the tab's filter asks for; null leaves it to each run. */
    timing?: Timing | null;
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
                        <RunsOwnerScope username={username}>
                            <div
                                className={`${ui.colHead} ${ui.groupColHead} ${styles.colHead}`}
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
                                .map((c) => {
                                    const segments = timerRunSegments(c);
                                    return (
                                        // Not an <a>: the star in front of the name
                                        // is a button, and a button inside a link is
                                        // neither valid nor clickable. The name
                                        // carries a stretched-link instead, so the
                                        // whole row still navigates.
                                        <RunRow
                                            key={c.runId}
                                            className={`${ui.row} ${styles.row}`}
                                            username={username}
                                            game={segments.game}
                                            category={segments.category}
                                            label={
                                                c.subcategory
                                                    ? `${c.category} (${c.subcategory})`
                                                    : c.category
                                            }
                                        >
                                            <span className={ui.name}>
                                                <HighlightStar
                                                    username={username}
                                                    {...segments}
                                                    highlighted={
                                                        !!c.highlighted
                                                    }
                                                />
                                                <a
                                                    className={`${ui.nameMain} ${styles.rowLink} stretched-link`}
                                                    href={timerRunHref(
                                                        username,
                                                        c,
                                                    )}
                                                >
                                                    {c.category}
                                                </a>
                                                {c.subcategory ? (
                                                    <span
                                                        className={ui.nameSub}
                                                    >
                                                        {c.subcategory}
                                                    </span>
                                                ) : null}
                                            </span>
                                            <span
                                                className={`${ui.num} ${ui.strong} ${ui.end}`}
                                            >
                                                {formatDuration(
                                                    igt(c, timing)
                                                        ? c.gameTimePbMs
                                                        : c.personalBestMs,
                                                )}
                                                {igt(c, timing) ? (
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
                                                    igt(c, timing)
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
                                                {formatCount(
                                                    c.finishedAttempts,
                                                )}
                                            </span>
                                            <span
                                                className={`${ui.num} ${ui.end}`}
                                            >
                                                {formatHours(c.playtimeMs)}
                                            </span>
                                            <span className={ui.end}>
                                                <Rank rank={c.bestRank} />
                                            </span>
                                        </RunRow>
                                    );
                                })}
                        </RunsOwnerScope>
                    </ProfileGroup>
                </div>
            ))}
        </div>
    );
}
