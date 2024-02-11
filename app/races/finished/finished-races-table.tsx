"use client";

import { PaginatedRaces, Race } from "~app/races/races.types";
import { PaginationContextProvider } from "~src/components/pagination/pagination.context-provider";
import usePagination from "~src/components/pagination/use-pagination";
import { getPaginatedFinishedRaces } from "~src/lib/races";
import React, { useContext } from "react";
import PaginationControl from "~src/components/pagination/pagination-control";
import { Card, Col, Row } from "react-bootstrap";
import { PersonIcon } from "~src/icons/person-icon";
import { RacePlacings } from "~app/races/components/race-placings";
import { FromNow } from "~src/components/util/datetime";
import styles from "~src/components/css/LiveRun.module.scss";
import { PaginationFetcher } from "~src/components/pagination/pagination.types";
import { RaceGameContext } from "~app/races/context/race-game-context-provider";

export const FinishedRaceTable = ({
    paginatedRaces,
    paginationFunction = getPaginatedFinishedRaces,
    params,
}: {
    paginatedRaces: PaginatedRaces;
    paginationFunction?: PaginationFetcher<Race>;
    params?: any;
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
    params?: any;
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
            <div className={"mb-4"}>
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
};

const FinishedRaceWithCategory = ({ races }: { races: Race[] }) => {
    return (
        <Row className={"g-2"}>
            {races.map((race) => {
                return (
                    <Col xs={12} key={race.raceId}>
                        <a
                            href={`/races/${race.raceId}`}
                            className={"text-decoration-none"}
                        >
                            <div
                                className={`bg-body-secondary game-border mh-100 h-100 card game-border`}
                            >
                                <Card
                                    className={`h-100 game-border px-3 py-2 ${styles.liveRunContainer}`}
                                    style={{
                                        minHeight: "8rem",
                                    }}
                                >
                                    <div className={"w-100 h-100"}>
                                        <div
                                            className={
                                                "d-flex justify-content-between gap-2"
                                            }
                                        >
                                            <span className={"fst-italic"}>
                                                {race.displayCategory}
                                            </span>

                                            <span>
                                                <FromNow
                                                    time={
                                                        race.endTime as string
                                                    }
                                                />
                                            </span>
                                            <span>
                                                <span className={"me-1"}>
                                                    {race.participantCount}
                                                </span>
                                                <PersonIcon />
                                            </span>
                                        </div>
                                        <div
                                            className={
                                                "d-flex justify-content-between"
                                            }
                                        ></div>
                                        <hr className={"my-1 p-0"} />
                                        <div>
                                            <RacePlacings
                                                race={race}
                                                amount={3}
                                            />
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </a>
                    </Col>
                );
            })}
        </Row>
    );
};

const FinishedRaceWithGameCategory = ({ races }: { races: Race[] }) => {
    return (
        <Row className={"my-1 mb-3 g-4"}>
            {races.map((race) => {
                return (
                    <Col
                        xxl={4}
                        md={6}
                        key={race.raceId}
                        className={"mt-1 mb-4"}
                    >
                        <a
                            href={`/races/${race.raceId}`}
                            className={"text-decoration-none"}
                        >
                            <div
                                className={`bg-body-secondary game-border mh-100 h-100 card game-border`}
                            >
                                <Card
                                    className={`h-100 game-border ${styles.liveRunContainer}`}
                                >
                                    <Row className={"h-100"}>
                                        <Col lg={3} md={4} xs={3}>
                                            <Card.Img
                                                className={
                                                    "rounded-0 rounded-start me-0 pe-0 h-100 d-inline-block"
                                                }
                                                src={
                                                    race.gameImage &&
                                                    race.gameImage !== "noimage"
                                                        ? race.gameImage
                                                        : `/logo_dark_theme_no_text_transparent.png`
                                                }
                                                height={100}
                                                width={20}
                                            />
                                        </Col>
                                        <Col
                                            lg={9}
                                            md={8}
                                            xs={9}
                                            className={
                                                "p-2 ps-1 pe-4 d-flex flex-column"
                                            }
                                        >
                                            <div className={"w-100 h-100"}>
                                                <div
                                                    className={
                                                        "d-flex justify-content-between gap-2"
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            "h5 m-0 p-0 text-truncate"
                                                        }
                                                        style={{
                                                            color: "var(--bs-link-color)",
                                                        }}
                                                    >
                                                        {race.displayGame}
                                                    </div>
                                                    <span
                                                        className={
                                                            "text-nowrap"
                                                        }
                                                    >
                                                        <span
                                                            className={"me-1"}
                                                        >
                                                            {
                                                                race.participantCount
                                                            }
                                                        </span>
                                                        <PersonIcon />
                                                    </span>
                                                </div>
                                                <div
                                                    className={
                                                        "d-flex justify-content-between"
                                                    }
                                                >
                                                    <div
                                                        className={"fst-italic"}
                                                    >
                                                        {race.displayCategory}
                                                    </div>
                                                    <span>
                                                        <FromNow
                                                            time={
                                                                race.endTime as string
                                                            }
                                                        />
                                                    </span>
                                                </div>
                                                <hr className={"my-1 p-0"} />
                                                <div>
                                                    <RacePlacings
                                                        race={race}
                                                        amount={3}
                                                    />
                                                </div>
                                            </div>
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
