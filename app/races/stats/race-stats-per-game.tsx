"use client";

import { GameStats } from "~app/races/races.types";
import usePagination from "~src/components/pagination/use-pagination";
import { PaginationSearch } from "~src/components/pagination/pagination-search";
import React from "react";
import PaginationControl from "~src/components/pagination/pagination-control";
import { PaginationContextProvider } from "~src/components/pagination/pagination.context-provider";
import { Card, Col, Row } from "react-bootstrap";
import { DurationToFormatted } from "~src/components/util/datetime";
import styles from "~src/components/css/LiveRun.module.scss";

export const RaceStatsPerGame = ({
    globalGameStats,
}: {
    globalGameStats: GameStats[];
}) => {
    return (
        <PaginationContextProvider>
            <RaceStatsPerGameDisplay globalGameStats={globalGameStats} />
        </PaginationContextProvider>
    );
};

const RaceStatsPerGameDisplay = ({
    globalGameStats,
}: {
    globalGameStats: GameStats[];
}) => {
    const pagination = usePagination<GameStats>(globalGameStats);

    return (
        <div>
            <PaginationSearch text={"Filter by game"} />
            <Row className={"my-1 mb-3 g-3"}>
                {pagination.data.map((gameStats) => {
                    return (
                        <Col xxl={6} xl={12} key={gameStats.value}>
                            <a
                                href={`/races/stats/${gameStats.displayValue}`}
                                className={"text-decoration-none"}
                            >
                                <StatsPerGame stats={gameStats} />
                            </a>
                        </Col>
                    );
                })}
            </Row>
            <PaginationControl {...pagination} minimalLayout={true} />
        </div>
    );
};

export const StatsPerGame = ({
    stats,
    isLink = true,
}: {
    stats: GameStats;
    isLink?: boolean;
}) => {
    return (
        <div className={`rounded-3`}>
            <div className={"d-none d-md-block"}>
                <StatsPerGameXxl stats={stats} isLink={isLink} />
            </div>
            <div className={"d-md-none"}>
                <StatsPerGameSmallScreen stats={stats} isLink={isLink} />
            </div>
        </div>
    );
};

const StatsPerGameXxl = ({
    stats,
    isLink = true,
}: {
    stats: GameStats;
    isLink?: boolean;
}) => {
    return (
        <div
            className={`bg-body-secondary game-border mh-100 h-100 card game-border`}
        >
            <Card
                className={`game-border h-100 ${
                    isLink && styles.liveRunContainer
                }`}
            >
                <Row className={"h-100"}>
                    <Col md={2}>
                        <Card.Img
                            className={
                                "rounded-0 rounded-start me-0 pe-0 h-100 d-inline-block"
                            }
                            src={
                                stats.image && stats.image !== "noimage"
                                    ? stats.image
                                    : `/logo_dark_theme_no_text_transparent.png`
                            }
                            height={100}
                            width={20}
                        />
                    </Col>
                    <Col md={10} className={"p-2 ps-1 pe-4 d-flex flex-column"}>
                        <div className={"justify-content-between d-flex"}>
                            <span
                                className={"h4 text-truncate"}
                                style={{
                                    color: "var(--bs-link-color)",
                                }}
                            >
                                {stats.displayValue}
                            </span>
                            <span className={"fs-5"}>
                                {stats.totalRaces} Races
                            </span>
                        </div>
                        <hr className={"mt-1"} />
                        <Row className={"align-content-center h-100"}>
                            <Col md={3}>
                                <div className={"flex-center"}>Total Time</div>
                                <hr className={"m-1 flex-center"} />
                                <span
                                    className={"fw-bold flex-center"}
                                    style={{ fontSize: "large" }}
                                >
                                    <DurationToFormatted
                                        duration={stats.totalRaceTime}
                                    />
                                </span>
                            </Col>
                            <Col md={3}>
                                <div className={"flex-center"}>
                                    Races Joined
                                </div>
                                <hr className={"m-1 flex-center"} />
                                <span
                                    className={"fw-bold flex-center"}
                                    style={{ fontSize: "large" }}
                                >
                                    {stats.totalParticipations}
                                </span>
                            </Col>
                            <Col md={3}>
                                <div className={"flex-center"}>
                                    Races Finished
                                </div>
                                <hr className={"m-1 flex-center"} />
                                <span
                                    className={"fw-bold flex-center"}
                                    style={{ fontSize: "large" }}
                                >
                                    {stats.totalFinishedParticipations}
                                </span>
                            </Col>
                            <Col md={3}>
                                <div className={"flex-center"}>Finish %</div>
                                <hr className={"m-1 flex-center"} />
                                <span
                                    className={"fw-bold flex-center"}
                                    style={{ fontSize: "large" }}
                                >
                                    {(stats.finishPercentage * 100).toFixed(2)}%
                                </span>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Card>
        </div>
    );
};

const StatsPerGameSmallScreen = ({
    stats,
    isLink = true,
}: {
    stats: GameStats;
    isLink?: boolean;
}) => {
    return (
        <div
            className={
                "bg-body-secondary game-border mh-100 h-100 card game-border"
            }
        >
            <Card
                className={`game-border h-100 ${
                    isLink && styles.liveRunContainer
                }`}
            >
                <Row className={"h-100"}>
                    <Col xs={3} sm={3}>
                        <Card.Img
                            className={
                                "rounded-0 rounded-start me-0 pe-0 h-100 d-inline-block"
                            }
                            src={
                                stats.image && stats.image !== "noimage"
                                    ? stats.image
                                    : `/logo_dark_theme_no_text_transparent.png`
                            }
                            height={20}
                            width={5}
                        />
                    </Col>
                    <Col
                        xs={9}
                        sm={9}
                        className={"p-2 ps-1 pe-4 d-flex flex-column"}
                    >
                        <div className={"justify-content-between d-flex"}>
                            <span
                                className={"h4 text-truncate"}
                                style={{
                                    color: "var(--bs-link-color)",
                                }}
                            >
                                {stats.displayValue}
                            </span>
                            <span className={"fs-5"}>{stats.totalRaces}</span>
                        </div>
                        <hr className={"m-0"} />
                        <span className={"justify-content-between d-flex"}>
                            <span>Total Time</span>
                            <span>
                                <DurationToFormatted
                                    duration={stats.totalRaceTime}
                                />
                            </span>
                        </span>
                        <span className={"justify-content-between d-flex"}>
                            <span>Races Joined</span>
                            <span>{stats.totalParticipations}</span>
                        </span>
                        <span className={"justify-content-between d-flex"}>
                            <span>Races Finished</span>
                            <span>{stats.totalFinishedParticipations}</span>
                        </span>
                        <span className={"justify-content-between d-flex"}>
                            <span>Finish %</span>
                            <span>
                                {(stats.finishPercentage * 100).toFixed(2)}%
                            </span>
                        </span>
                    </Col>
                </Row>
            </Card>
        </div>
    );
};
