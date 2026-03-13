'use client';

import { Col, Row } from 'react-bootstrap';
import { RaceTimer } from '~app/(new-layout)/races/[race]/race-timer';
import { RaceParticipantStatusOverview } from '~app/(new-layout)/races/components/race-participant-status-overview';
import { RacePlacings } from '~app/(new-layout)/races/components/race-placings';
import {
    Race,
    RaceParticipantWithLiveData,
} from '~app/(new-layout)/races/races.types';
import { ClockIcon } from '~src/icons/clock-icon';
import { PersonIcon } from '~src/icons/person-icon';
import styles from './races.module.scss';

export const InProgressRaces = ({ races }: { races: Race[] }) => {
    if (races.length === 0) {
        return (
            <div className={styles.emptyState}>
                <p>No races in progress currently.</p>
                <p>
                    Go check out some <a href="/live">live runs</a> while you
                    wait!
                </p>
            </div>
        );
    }
    return (
        <Row className="gy-3 gx-3">
            {races.map((race) => {
                return (
                    <Col key={race.raceId} xl={6} lg={12} xs={12}>
                        <a
                            href={`/races/${race.raceId}`}
                            className="text-decoration-none"
                        >
                            <div className={styles.inProgressCard}>
                                <Row className="flex-grow-1">
                                    <Col xs={4}>
                                        <img
                                            className={styles.inProgressImg}
                                            src={
                                                race.gameImage &&
                                                race.gameImage !== 'noimage'
                                                    ? race.gameImage
                                                    : `/logo_dark_theme_no_text_transparent.png`
                                            }
                                            height={100}
                                            width={20}
                                            alt={race.displayGame}
                                        />
                                    </Col>
                                    <Col
                                        xs={8}
                                        className={styles.inProgressBody}
                                    >
                                        <div className="d-flex justify-content-between gap-3">
                                            <div
                                                className={styles.cardGameName}
                                            >
                                                {race.displayGame}
                                            </div>
                                            <span
                                                className={
                                                    styles.participantCount
                                                }
                                            >
                                                <span className="me-1">
                                                    {race.participantCount}
                                                </span>
                                                <PersonIcon />
                                            </span>
                                        </div>

                                        <div className="d-flex justify-content-between gap-3 w-100">
                                            <div
                                                className={styles.cardCategory}
                                            >
                                                {race.displayCategory}
                                            </div>
                                            <span className={styles.timerBadge}>
                                                <RaceTimer race={race} />
                                                <ClockIcon />
                                            </span>
                                        </div>
                                        <hr className={styles.cardDivider} />

                                        {race.customName && (
                                            <div
                                                className={
                                                    styles.cardCustomName
                                                }
                                            >
                                                {race.customName}
                                            </div>
                                        )}
                                        <div className="flex-grow-1 d-flex align-items-end justify-content-between">
                                            <div>
                                                <RaceParticipantStatusOverview
                                                    participants={
                                                        race.participants as RaceParticipantWithLiveData[]
                                                    }
                                                />
                                            </div>

                                            <div className="d-flex align-items-end text-truncate">
                                                <RacePlacings race={race} />
                                            </div>
                                        </div>
                                    </Col>
                                </Row>
                            </div>
                        </a>
                    </Col>
                );
            })}
        </Row>
    );
};
