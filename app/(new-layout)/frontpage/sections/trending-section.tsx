import Image from 'next/image';
import Link from 'next/link';
import { FaChartLine, FaFire, FaTrophy } from 'react-icons/fa6';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import {
    type ActiveGame,
    getGameImageMap,
    getMostActiveGames,
    getMostPBsRunners,
    getWeeklyTopRunners,
    type WeeklyRunner,
} from '~src/lib/highlights';
import { safeEncodeURI } from '~src/utils/uri';
import styles from './trending-section.module.scss';

const MEDALS = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
const FALLBACK_IMAGE = '/logo_dark_theme_no_text_transparent.png';

export const TrendingSection = async () => {
    const [games, gameImageMap, topRunners, pbRunners] = await Promise.all([
        getMostActiveGames('week'),
        getGameImageMap(),
        getWeeklyTopRunners(3),
        getMostPBsRunners(3),
    ]);

    const hotGames = games.slice(0, 6);

    return (
        <Panel title="Trending" subtitle="This Week" className="p-4">
            <div className={styles.trendingContent}>
                <div>
                    <div className={styles.subSectionHeader}>
                        <FaFire size={12} />
                        Hot Games
                    </div>
                    <div className={styles.hotGames}>
                        {hotGames.map((game, i) => (
                            <HotGameRow
                                key={game.game}
                                game={game}
                                rank={i + 1}
                                imageUrl={
                                    gameImageMap[game.game] ?? FALLBACK_IMAGE
                                }
                            />
                        ))}
                    </div>
                </div>

                <div className={styles.runnersGrid}>
                    <div>
                        <div className={styles.subSectionHeader}>
                            <FaChartLine size={12} />
                            Most Active
                        </div>
                        <div className={styles.runnersList}>
                            {topRunners.map((runner, i) => (
                                <ActiveRunnerRow
                                    key={runner.username}
                                    runner={runner}
                                    rank={i}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className={styles.subSectionHeader}>
                            <FaTrophy size={12} />
                            Most PBs
                        </div>
                        <div className={styles.runnersList}>
                            {pbRunners.map((runner, i) => (
                                <PbRunnerRow
                                    key={runner.username}
                                    runner={runner}
                                    rank={i}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Panel>
    );
};

const HotGameRow = ({
    game,
    rank,
    imageUrl,
}: {
    game: ActiveGame;
    rank: number;
    imageUrl: string;
}) => {
    return (
        <div className={styles.hotGameRow}>
            <span className={styles.gameRank}>{rank}</span>
            <Image
                src={imageUrl}
                alt={game.game}
                width={32}
                height={32}
                className={styles.gameImage}
                unoptimized
            />
            <div className={styles.gameInfo}>
                <span className={styles.gameName}>
                    <Link href={`/${safeEncodeURI(game.game)}`}>
                        {game.game}
                    </Link>
                </span>
            </div>
            <div className={styles.gameStats}>
                <span className={styles.runBadge}>{game.runCount} runs</span>
                <span className={styles.runnerCount}>
                    {game.uniqueRunners} runners
                </span>
            </div>
        </div>
    );
};

const ActiveRunnerRow = ({
    runner,
    rank,
}: {
    runner: WeeklyRunner;
    rank: number;
}) => {
    const playtimeMs = Number.parseInt(runner.value, 10);

    return (
        <div className={styles.runnerRow}>
            <span className={styles.runnerMedal}>
                {MEDALS[rank] ?? rank + 1}
            </span>
            <span className={styles.runnerName}>
                <UserLink username={runner.username} />
            </span>
            <span className={styles.runnerValue}>
                <DurationToFormatted duration={playtimeMs} />
            </span>
        </div>
    );
};

const PbRunnerRow = ({
    runner,
    rank,
}: {
    runner: WeeklyRunner;
    rank: number;
}) => {
    return (
        <div className={styles.runnerRow}>
            <span className={styles.runnerMedal}>
                {MEDALS[rank] ?? rank + 1}
            </span>
            <span className={styles.runnerName}>
                <UserLink username={runner.username} />
            </span>
            <span className={styles.runnerValue}>{runner.value} PBs</span>
        </div>
    );
};
