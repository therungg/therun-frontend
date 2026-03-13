'use client';

import React, { useContext } from 'react';
import { Col, Row } from 'react-bootstrap';
import { RacePlacings } from '~app/(new-layout)/races/components/race-placings';
import { RaceGameContext } from '~app/(new-layout)/races/context/race-game-context-provider';
import { PaginatedRaces, Race } from '~app/(new-layout)/races/races.types';
import { PaginationContextProvider } from '~src/components/pagination/pagination.context-provider';
import { PaginationFetcher } from '~src/components/pagination/pagination.types';
import PaginationControl from '~src/components/pagination/pagination-control';
import usePagination from '~src/components/pagination/use-pagination';
import { FromNow } from '~src/components/util/datetime';
import { PersonIcon } from '~src/icons/person-icon';
import { getPaginatedFinishedRaces } from '~src/lib/races';
import raceStyles from '../races.module.scss';

export const FinishedRaceTable = ({
    paginatedRaces,
    paginationFunction = getPaginatedFinishedRaces,
    params,
}: {
    paginatedRaces: PaginatedRaces;
    paginationFunction?: PaginationFetcher<Race>;
    params?: unknown;
}) => {
    return (
        <PaginationContextProvider>
            <FinishedRaceTableView
                paginatedRaces={paginatedRaces}
                paginationFunction={paginationFunction}
                params={params}
            />
        </PaginationContextProvider>
    );
};

const FinishedRaceTableView = ({
    paginatedRaces,
    paginationFunction = getPaginatedFinishedRaces,
    params,
}: {
    paginatedRaces: PaginatedRaces;
    paginationFunction: PaginationFetcher<Race>;
    params?: unknown;
}) => {
    const pagination = usePagination<Race>(
        paginatedRaces,
        paginationFunction,
        paginatedRaces.pageSize,
        0,
        params,
    );
    const { isLoading, data } = pagination;
    // TODO:: Make this a skeleton
    if (isLoading) return <div>Loading...</div>;

    return (
        <div>
            <div className="mb-4">
                <FinishedRaces races={data} />
            </div>
            <PaginationControl {...pagination} minimalLayout={true} />
        </div>
    );
};

const FinishedRaces = ({ races }: { races: Race[] }) => {
    const { game, category } = useContext(RaceGameContext);

    if (!game && !category) {
        return <FinishedRaceWithGameCategory races={races} />;
    }

    if (game && !category) {
        return <FinishedRaceWithCategory races={races} />;
    }

    return <></>;
};

export const FinishedRaceWithCategory = ({ races }: { races: Race[] }) => {
    return (
        <Row className="g-2">
            {races.map((race) => {
                return (
                    <Col xs={12} key={race.raceId}>
                        <a
                            href={`/races/${race.raceId}`}
                            className="text-decoration-none"
                        >
                            <div className={raceStyles.finishedRaceCard}>
                                <div
                                    className={raceStyles.finishedRaceCardInner}
                                >
                                    <div className="d-flex justify-content-between gap-2">
                                        <span
                                            className={
                                                raceStyles.raceListCategory
                                            }
                                        >
                                            {race.displayCategory}
                                        </span>

                                        <span
                                            className={raceStyles.raceListMeta}
                                        >
                                            <FromNow
                                                time={race.endTime as string}
                                            />
                                        </span>
                                        <span
                                            className={
                                                raceStyles.participantCount
                                            }
                                        >
                                            <span className="me-1">
                                                {race.participantCount}
                                            </span>
                                            <PersonIcon />
                                        </span>
                                    </div>
                                    <hr
                                        className={raceStyles.finishedDivider}
                                    />
                                    <div>
                                        <RacePlacings race={race} amount={3} />
                                    </div>
                                </div>
                            </div>
                        </a>
                    </Col>
                );
            })}
        </Row>
    );
};

export const FinishedRaceWithGameCategory = ({ races }: { races: Race[] }) => {
    return (
        <Row className="my-1 mb-3 g-4">
            {races.map((race) => {
                return (
                    <Col xxl={4} md={6} key={race.raceId} className="mt-1 mb-4">
                        <a
                            href={`/races/${race.raceId}`}
                            className="text-decoration-none"
                        >
                            <div className={raceStyles.finishedRaceCard}>
                                <Row className="h-100">
                                    <Col lg={3} md={4} xs={3}>
                                        <img
                                            className={raceStyles.inProgressImg}
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
                                        lg={9}
                                        md={8}
                                        xs={9}
                                        className={
                                            raceStyles.finishedRaceCardBody
                                        }
                                    >
                                        <div className="d-flex justify-content-between gap-2">
                                            <div
                                                className={
                                                    raceStyles.cardGameName
                                                }
                                            >
                                                {race.displayGame}
                                            </div>
                                            <span
                                                className={
                                                    raceStyles.participantCount
                                                }
                                            >
                                                <span className="me-1">
                                                    {race.participantCount}
                                                </span>
                                                <PersonIcon />
                                            </span>
                                        </div>
                                        <div className="d-flex justify-content-between">
                                            <div
                                                className={
                                                    raceStyles.raceListCategory
                                                }
                                            >
                                                {race.displayCategory}
                                            </div>
                                            <span
                                                className={
                                                    raceStyles.raceListMeta
                                                }
                                            >
                                                <FromNow
                                                    time={
                                                        race.endTime as string
                                                    }
                                                />
                                            </span>
                                        </div>
                                        <hr
                                            className={
                                                raceStyles.finishedDivider
                                            }
                                        />
                                        <div>
                                            <RacePlacings
                                                race={race}
                                                amount={3}
                                            />
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
