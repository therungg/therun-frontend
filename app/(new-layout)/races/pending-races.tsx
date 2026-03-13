import React from 'react';
import { Race } from '~app/(new-layout)/races/races.types';
import { GameImage } from '~src/components/image/gameimage';
import { UserLink } from '~src/components/links/links';
import { FromNow } from '~src/components/util/datetime';
import { ClockIcon } from '~src/icons/clock-icon';
import { PencilIcon } from '~src/icons/pencil-icon';
import { PersonIcon } from '~src/icons/person-icon';
import styles from './races.module.scss';

export const PendingRaces = ({ races }: { races: Race[] }) => {
    return (
        <div className={styles.sidePanel}>
            <div className={styles.sidePanelHeader}>
                <span className="h3">Upcoming Races</span>
            </div>
            <hr className={styles.sidePanelDivider} />
            {races.length === 0 && <span>No races upcoming</span>}
            {races.length > 0 &&
                races.map((race) => {
                    return <PendingRace key={race.raceId} race={race} />;
                })}
        </div>
    );
};

export const PendingRace = ({ race }: { race: Race }) => {
    return (
        <a href={`/races/${race.raceId}`} className="text-decoration-none">
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
                                {race.startMethod !== 'datetime' && (
                                    <span>{race.readyParticipantCount}/</span>
                                )}
                                {race.participantCount}
                            </span>
                            <PersonIcon />
                        </span>
                    </div>
                    <div className="d-flex justify-content-between">
                        <div className={styles.raceListCategory}>
                            {race.displayCategory}
                        </div>
                        <span className={styles.raceListMeta}>
                            <span className="me-2">
                                <UserLink
                                    username={race.creator}
                                    parentIsUrl={true}
                                    icon={false}
                                />
                            </span>
                            <PencilIcon />
                        </span>
                    </div>
                    {race.startMethod === 'datetime' && (
                        <div className="d-flex justify-content-between">
                            <div></div>
                            <div className={styles.raceListMeta}>
                                Starts{' '}
                                <FromNow
                                    time={new Date(race.willStartAt as string)}
                                />
                                <ClockIcon color="var(--bs-link-color)" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </a>
    );
};
