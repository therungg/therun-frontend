import React from 'react';
import { RacePlacings } from '~app/(new-layout)/races/components/race-placings';
import { Race } from '~app/(new-layout)/races/races.types';
import { GameImage } from '~src/components/image/gameimage';
import { FromNow } from '~src/components/util/datetime';
import { PersonIcon } from '~src/icons/person-icon';
import styles from './races.module.scss';

export const RecentlyFinishedRaces = ({ races }: { races: Race[] }) => {
    return (
        <div className={styles.sidePanel}>
            <div className={styles.sidePanelHeader}>
                <span className="h3">Finished Races</span>
                <a href="/races/finished">View all finished races</a>
            </div>
            <hr className={styles.sidePanelDivider} />
            {races.length === 0 && <span>No races upcoming</span>}
            {races.length > 0 &&
                races.map((race) => {
                    return (
                        <RecentlyFinishedRace key={race.raceId} race={race} />
                    );
                })}
        </div>
    );
};

export const RecentlyFinishedRace = ({ race }: { race: Race }) => {
    return (
        <a href={`/races/${race.raceId}`} className={styles.cardLink}>
            <div key={race.raceId} className={styles.raceListItem}>
                <GameImage
                    alt={`Image for ${race.displayGame}`}
                    src={race.gameImage}
                    quality="large"
                    height={64 * 1.3}
                    width={48 * 1.3}
                    className="rounded-3"
                />
                <div className={styles.raceListContent}>
                    <div className="d-flex justify-content-between gap-2">
                        <div className={styles.raceListGameName}>
                            {race.displayGame}
                        </div>
                        <span className={styles.participantCount}>
                            <span className="me-1">
                                {race.participantCount}
                            </span>
                            <PersonIcon />
                        </span>
                    </div>
                    <hr className={styles.sidePanelDivider} />
                    <div className="d-flex justify-content-between">
                        <div className={styles.raceListCategory}>
                            {race.displayCategory}
                        </div>
                        <span className={styles.raceListMeta}>
                            <FromNow time={race.endTime as string} />
                        </span>
                    </div>
                    <RacePlacings race={race} />
                </div>
            </div>
        </a>
    );
};
