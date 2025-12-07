"use client";

import {
    Race,
    RaceParticipant,
    RaceParticipantWithLiveData,
} from "~app/(old-layout)/races/races.types";
import { PaginationContextProvider } from "~src/components/pagination/pagination.context-provider";
import usePagination from "~src/components/pagination/use-pagination";
import { racesFetcher } from "~src/components/pagination/fetchers/races-fetcher";
import PaginationControl from "~src/components/pagination/pagination-control";
import { paginateArray } from "~src/components/pagination/paginate-array";
import { Card, Col, Row } from "react-bootstrap";
import React from "react";
import { RaceParticipantTimer } from "~app/(old-layout)/races/[race]/race-timer";
import styles from "~src/components/css/LiveRun.module.scss";
import { PersonIcon } from "~src/icons/person-icon";
import { FromNow } from "~src/components/util/datetime";
import { RacePlacings } from "~app/(old-layout)/races/components/race-placings";

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
                            className="text-decoration-none"
                        >
                            <div
                                className={`bg-body-secondary game-border mh-100 h-100 card game-border ${styles.liveRunContainer}`}
                            >
                                <Card
                                    className={`game-border h-100 ${styles.liveRunContainer}`}
                                >
                                    <Row className="h-100">
                                        <Col xs={3} sm={3}>
                                            <Card.Img
                                                className="rounded-0 rounded-start me-0 pe-0 h-100 d-inline-block"
                                                src={
                                                    race.gameImage &&
                                                    race.gameImage !== "noimage"
                                                        ? race.gameImage
                                                        : `/logo_dark_theme_no_text_transparent.png`
                                                }
                                                height={10}
                                                width={5}
                                            />
                                        </Col>
                                        <Col
                                            xs={9}
                                            sm={9}
                                            className="p-2 ps-1 pe-4 d-flex flex-column"
                                        >
                                            <div className="justify-content-between d-flex">
                                                <span
                                                    className="h4 text-truncate"
                                                    style={{
                                                        color: "var(--bs-link-color)",
                                                    }}
                                                >
                                                    {race.displayGame}
                                                </span>
                                                <span className="fs-5 text-truncate">
                                                    {race.displayCategory}
                                                </span>
                                            </div>
                                            <hr className="m-0" />
                                            <ViewUserRace
                                                race={race}
                                                participation={
                                                    userParticipation
                                                }
                                            />
                                        </Col>
                                    </Row>
                                </Card>
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
    if (race.status === "aborted") {
        return <div className="pt-2">Race was aborted</div>;
    }
    return (
        <div className="pt-2">
            {participation.status === "abandoned" && "Abandoned"}
            {participation.status !== "abandoned" && (
                <div>
                    <div className="d-flex justify-content-between">
                        <div>
                            Time:{" "}
                            <span className="fst-italic">
                                <RaceParticipantTimer
                                    raceParticipant={participation}
                                    race={race}
                                />
                            </span>
                        </div>
                        <span className="text-nowrap">
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
