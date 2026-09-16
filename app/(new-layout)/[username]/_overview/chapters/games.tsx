import { GameImage } from '~src/components/image/gameimage';
import Link from '~src/components/link';
import { getLeaderboardsProfile } from '~src/lib/leaderboards-profile';
import { getRunnerStats } from '~src/lib/runner-profile';
import { safeEncodeURI } from '~src/utils/uri';
import type { RunnerProfileHead } from '../../../../../types/runner-profile.types';
import {
    DEFAULT_LAYOUT,
    orderGames,
} from '../../../leaderboards/[name]/showcase-rules';
import { formatHours } from '../../(sections)/format';
import { inLeaderboardsOrder } from '../../(sections)/game-order';
import ui from '../../(sections)/profile-ui.module.scss';
import { medalOf } from '../../(sections)/ranks';
import { Chapter, ChapterError } from '../chapter';
import styles from '../overview.module.scss';

const SHOWN = 7;

/** The Stats tab's games in the Leaderboards tab's order, main game first. */
export async function GamesChapter({ head }: { head: RunnerProfileHead }) {
    const name = head.runner.name;
    // Guests have no stats part; the chapter shows nothing for them.
    if (head.runner.guest) return null;
    let stats: Awaited<ReturnType<typeof getRunnerStats>>;
    let boards: Awaited<ReturnType<typeof getLeaderboardsProfile>>;
    try {
        [stats, boards] = await Promise.all([
            getRunnerStats(name),
            getLeaderboardsProfile(name),
        ]);
    } catch {
        return <ChapterError id="games" name={name} />;
    }
    if (!stats || stats.games.length === 0) return null;

    const byPlaytime = [...stats.games].sort(
        (a, b) => b.playtimeMs - a.playtimeMs,
    );
    const ordered = boards
        ? inLeaderboardsOrder(
              byPlaytime,
              orderGames(boards.games, boards.layout ?? DEFAULT_LAYOUT).map(
                  (g) => g.gameId,
              ),
          )
        : byPlaytime;
    const main = head.mainGame?.gameId ?? null;
    const games = [
        ...ordered.filter((g) => g.gameId === main),
        ...ordered.filter((g) => g.gameId !== main),
    ].slice(0, SHOWN);

    return (
        <Chapter id="games" name={name}>
            <ul className={styles.gameTiles}>
                {games.map((g) => (
                    <li key={g.gameId}>
                        <Link
                            href={`/games/${safeEncodeURI(g.game)}`}
                            className={styles.gameTile}
                        >
                            <span className={styles.gameArt}>
                                <GameImage
                                    src={g.imageUrl ?? ''}
                                    alt=""
                                    quality="medium"
                                    width={120}
                                    height={160}
                                />
                            </span>
                            <span className={styles.gameName}>{g.game}</span>
                            <span className={styles.gameMeta}>
                                {g.bestRank !== null ? (
                                    <span
                                        className={ui.rank}
                                        data-medal={medalOf(g.bestRank)}
                                    >
                                        #{g.bestRank}
                                    </span>
                                ) : null}
                                <span className={styles.gameHours}>
                                    {formatHours(g.playtimeMs)}
                                </span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </Chapter>
    );
}
