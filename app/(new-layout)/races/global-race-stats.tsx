import React, { ReactElement } from 'react';
import { GameStats, GlobalStats } from '~app/(new-layout)/races/races.types';
import { GameImage } from '~src/components/image/gameimage';
import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import { safeEncodeURI } from '~src/utils/uri';
import styles from './races.module.scss';

export const GlobalRaceStats = ({
    stats,
    gameStats,
}: {
    stats: GlobalStats;
    gameStats: GameStats[];
}) => {
    return (
        <div className={styles.sidePanel}>
            <div className={styles.sidePanelHeader}>
                <span className="h3">Race Stats</span>
                <Link href="/races/stats">View all stats</Link>
            </div>
            <hr className={styles.sidePanelDivider} />
            <div>
                <ShowStat stat="Finished Races" value={stats.totalRaces} />
                <ShowStat
                    stat="Total Playtime"
                    value={
                        <DurationToFormatted duration={stats.totalRaceTime} />
                    }
                />
                <ShowStat
                    stat="Total Participants"
                    value={stats.totalParticipations}
                />
                <ShowStat
                    stat="Finish %"
                    value={`${(stats.finishPercentage * 100).toFixed(2)}%`}
                />
            </div>
            <hr className={styles.sidePanelDivider} />
            <div className="d-flex flex-column gap-1">
                {gameStats.map((gameStat) => {
                    return (
                        <a
                            href={`/races/stats/${safeEncodeURI(
                                gameStat.displayValue,
                            )}`}
                            className={styles.cardLink}
                            key={gameStat.value}
                        >
                            <ShowGameStat gameStat={gameStat} />
                        </a>
                    );
                })}
            </div>
        </div>
    );
};

const ShowStat = ({
    stat,
    value,
}: {
    stat: string;
    value: number | string | ReactElement;
}) => {
    return (
        <div className={styles.globalStatRow}>
            <span className={styles.globalStatLabel}>{stat}</span>
            <span className={styles.globalStatValue}>{value}</span>
        </div>
    );
};

const ShowGameStat = ({ gameStat }: { gameStat: GameStats }) => {
    return (
        <div className={styles.gameStatItem}>
            <GameImage
                alt={`Image for ${gameStat.image}`}
                src={gameStat.image}
                quality="large"
                height={64 * 1.3}
                width={48 * 1.3}
                className="rounded-2"
            />
            <div className={styles.gameStatContent}>
                <div className={styles.gameStatName}>
                    {gameStat.displayValue}
                </div>
                <div className={styles.gameStatMeta}>
                    <span>{gameStat.totalRaces} races</span>
                    <DurationToFormatted duration={gameStat.totalRaceTime} />
                </div>
            </div>
        </div>
    );
};
