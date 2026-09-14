import { GameImage } from '~src/components/image/gameimage';
import type { RunnerStatsGame } from '../../../../../types/runner-profile.types';
import { formatCount, formatDuration, formatHours } from '../format';
import sectionStyles from '../sections.module.scss';
import styles from './stats.module.scss';

const MEDAL: Record<number, string> = { 1: 'gold', 2: 'silver', 3: 'bronze' };

function Rank({ rank }: { rank: number | null }) {
    if (rank === null) return <span className={styles.rankNone}>—</span>;
    return (
        <span className={styles.rank} data-medal={MEDAL[rank]}>
            #{rank}
        </span>
    );
}

export function GameStats({ game }: { game: RunnerStatsGame }) {
    return (
        <section className={sectionStyles.panel} aria-label={game.game}>
            <div className={styles.gameHead}>
                <GameImage
                    src={game.imageUrl ?? ''}
                    alt=""
                    quality="small"
                    width={36}
                    height={48}
                />
                <div className={styles.gameText}>
                    <h2 className={sectionStyles.panelTitle}>{game.game}</h2>
                    <span className={styles.gameLine}>
                        {formatHours(game.playtimeMs)} ·{' '}
                        {formatCount(game.attempts)} attempts ·{' '}
                        {formatCount(game.finishedAttempts)} finished
                    </span>
                </div>
                {game.bestRank !== null ? <Rank rank={game.bestRank} /> : null}
            </div>
            <div className={sectionStyles.tableScroll}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th scope="col">Category</th>
                            <th scope="col">PB</th>
                            <th scope="col">Sum of best</th>
                            <th scope="col">Attempts</th>
                            <th scope="col">Finished</th>
                            <th scope="col">Playtime</th>
                            <th scope="col">Best rank</th>
                        </tr>
                    </thead>
                    <tbody>
                        {game.categories.map((c) => (
                            <tr key={c.runId}>
                                <th scope="row">{c.category}</th>
                                <td>
                                    {formatDuration(c.personalBestMs)}
                                    {c.hasGameTime && c.gameTimePbMs ? (
                                        <span className={styles.igt}>
                                            IGT {formatDuration(c.gameTimePbMs)}
                                        </span>
                                    ) : null}
                                </td>
                                <td>{formatDuration(c.sumOfBestsMs)}</td>
                                <td>{formatCount(c.attempts)}</td>
                                <td>{formatCount(c.finishedAttempts)}</td>
                                <td>{formatHours(c.playtimeMs)}</td>
                                <td>
                                    <Rank rank={c.bestRank} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
