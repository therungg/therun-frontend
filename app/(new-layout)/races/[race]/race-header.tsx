import React from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import { RaceParticipantStatusOverview } from '~app/(new-layout)/races/components/race-participant-status-overview';
import { RacePlacings } from '~app/(new-layout)/races/components/race-placings';
import {
    Race,
    RaceParticipantWithLiveData,
} from '~app/(new-layout)/races/races.types';
import { LocalizedTime } from '~src/components/util/datetime';
import { PersonIcon } from '~src/icons/person-icon';
import { safeEncodeURI } from '~src/utils/uri';
import styles from './race-detail.module.scss';

export const RaceHeader = ({ race }: { race: Race }) => {
    return (
        <div
            className={styles.raceHeader}
            data-aborted={race.status === 'aborted'}
        >
            <Card className="border-0 bg-transparent h-100">
                <Row style={{ minHeight: '10rem' }}>
                    <Col xs={4} sm={2}>
                        <Card.Img
                            className={styles.raceHeaderImg}
                            src={
                                race.gameImage && race.gameImage !== 'noimage'
                                    ? race.gameImage
                                    : `/logo_dark_theme_no_text_transparent.png`
                            }
                            height={100}
                            width={20}
                        />
                    </Col>
                    <Col xs={8} sm={10} className={styles.raceHeaderBody}>
                        <div className="d-flex justify-content-between gap-3">
                            <Card.Title className={styles.gameLink}>
                                <a
                                    href={`/races/stats/${safeEncodeURI(
                                        race.displayGame,
                                    )}`}
                                >
                                    {race.displayGame}
                                </a>
                            </Card.Title>
                            <span className={styles.participantCount}>
                                <span className="me-1">
                                    {race.participantCount}
                                </span>
                                <PersonIcon />
                            </span>
                        </div>

                        <div className={styles.categoryRow}>
                            <div className={styles.categoryText}>
                                {race.displayCategory}
                            </div>
                            {race.status === 'aborted' && (
                                <div className={styles.abortedBadge}>
                                    Race was aborted
                                </div>
                            )}
                            {race.status !== 'aborted' && !race.ranked && (
                                <div className={styles.unrankedBadge}>
                                    Unranked
                                </div>
                            )}
                        </div>

                        {race.customName && (
                            <div className={styles.customName}>
                                <Card.Text className="text-truncate">
                                    {race.customName}
                                </Card.Text>
                            </div>
                        )}
                        <div className={styles.description}>
                            <Card.Text className="text-truncate">
                                {race.description}
                            </Card.Text>
                        </div>
                        <div className={styles.headerFooter}>
                            <div>
                                <RaceParticipantStatusOverview
                                    participants={
                                        race.participants as RaceParticipantWithLiveData[]
                                    }
                                />
                            </div>

                            <div className="d-flex align-items-end text-truncate">
                                {race.status === 'pending' &&
                                    race.willStartAt &&
                                    race.startMethod === 'datetime' && (
                                        <span suppressHydrationWarning={true}>
                                            Start time:{' '}
                                            <LocalizedTime
                                                date={
                                                    new Date(race.willStartAt)
                                                }
                                            />
                                        </span>
                                    )}
                                <RacePlacings race={race} />
                            </div>
                        </div>
                    </Col>
                </Row>
            </Card>
        </div>
    );
};
