'use client';

import React from 'react';
import { Col, Row } from 'react-bootstrap';
import { RaceParticipantTimer } from '~app/(new-layout)/races/[race]/race-timer';
import { RacePlacings } from '~app/(new-layout)/races/components/race-placings';
import {
    Race,
    RaceParticipant,
    RaceParticipantWithLiveData,
} from '~app/(new-layout)/races/races.types';
import { racesFetcher } from '~src/components/pagination/fetchers/races-fetcher';
import { paginateArray } from '~src/components/pagination/paginate-array';
import { PaginationContextProvider } from '~src/components/pagination/pagination.context-provider';
import PaginationControl from '~src/components/pagination/pagination-control';
import usePagination from '~src/components/pagination/use-pagination';
import { FromNow } from '~src/components/util/datetime';
import { PersonIcon } from '~src/icons/person-icon';
import styles from './user-races.module.scss';

export const UserRaces = ({
    participations,
    initialRaces,
    username,
}: {
    participations: RaceParticipant[];
    initialRaces: Race[];
    username: string;
}) => {
    return (
        <PaginationContextProvider>
            <UserRacesPaginated
                participations={participations}
                initialRaces={initialRaces}
                username={username}
            />
        </PaginationContextProvider>
    );
};

export const UserRacesPaginated = ({
    participations,
    initialRaces,
    username,
}: {
    participations: RaceParticipant[];
    initialRaces: Race[];
    username: string;
}) => {
    const initialPagination = paginateArray<Race>(
        initialRaces,
        10,
        1,
        participations.length,
    );
    const pagination = usePagination<Race>(
        initialPagination,
        racesFetcher,
        10,
        1,
        participations,
    );
    return (
        <div>
            <ViewUserRaces races={pagination.data} username={username} />
            <PaginationControl {...pagination} />
        </div>
    );
};

export const ViewUserRaces = ({
    races,
    username,
}: {
    races: Race[];
    username: string;
}) => {
    return (
        <Row>
            {races.map((race) => {
                const userParticipation = race.participants?.find(
                    (participant) => participant.user === username,
                ) as RaceParticipantWithLiveData;

                return (
                    <Col
                        xxl={6}
                        xl={12}
                        lg={6}
                        md={12}
                        key={race.raceId}
                        className="mb-3"
                    >
                        <a
                            href={`/races/${race.raceId}`}
                            className="card-link-wrapper"
                        >
                            <div className={styles.raceCard}>
                                <Row className="h-100 g-0">
                                    <Col xs={3} sm={3}>
                                        <img
                                            className={styles.raceCardImage}
                                            src={
                                                race.gameImage &&
                                                race.gameImage !== 'noimage'
                                                    ? race.gameImage
                                                    : `/logo_dark_theme_no_text_transparent.png`
                                            }
                                            alt={race.displayGame}
                                        />
                                    </Col>
                                    <Col
                                        xs={9}
                                        sm={9}
                                        className={styles.raceCardBody}
                                    >
                                        <div className="justify-content-between d-flex">
                                            <span
                                                className={`text-truncate ${styles.raceGameTitle}`}
                                            >
                                                {race.displayGame}
                                            </span>
                                            <span
                                                className={`text-truncate ${styles.raceCategoryTitle}`}
                                            >
                                                {race.displayCategory}
                                            </span>
                                        </div>
                                        <hr
                                            className={styles.gameStatsDivider}
                                        />
                                        <ViewUserRace
                                            race={race}
                                            participation={userParticipation}
                                        />
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
export const ViewUserRace = ({
    race,
    participation,
}: {
    race: Race;
    participation: RaceParticipant;
}) => {
    if (race.status === 'aborted') {
        return <div className={styles.raceDetail}>Race was aborted</div>;
    }
    return (
        <div className={styles.raceDetail}>
            {participation.status === 'abandoned' && 'Abandoned'}
            {participation.status !== 'abandoned' && (
                <div>
                    <div className="d-flex justify-content-between">
                        <div>
                            Time:{' '}
                            <span className={styles.raceTime}>
                                <RaceParticipantTimer
                                    raceParticipant={participation}
                                    race={race}
                                />
                            </span>
                        </div>
                        <span className={styles.raceParticipants}>
                            <span className="me-1">
                                {race.participantCount}
                            </span>
                            <PersonIcon />
                        </span>
                    </div>
                    <div className="d-flex justify-content-between">
                        <div className="d-flex align-items-end text-truncate">
                            <RacePlacings race={race} />
                        </div>
                        <span className="text-nowrap">
                            <FromNow time={race.startTime as string} />
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};
