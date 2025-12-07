"use client";

import { CategoryStats } from "~app/(old-layout)/races/races.types";
import styles from "~src/components/css/LiveRun.module.scss";
import { PaginationContextProvider } from "~src/components/pagination/pagination.context-provider";
import usePagination from "~src/components/pagination/use-pagination";
import { PaginationSearch } from "~src/components/pagination/pagination-search";
import PaginationControl from "~src/components/pagination/pagination-control";
import React from "react";
import { genericFetcher } from "~src/components/pagination/fetchers/generic-fetcher";
import { safeEncodeURI } from "~src/utils/uri";
import { TrophyIcon } from "~src/icons/trophy-icon";
import { DurationToFormatted } from "~src/components/util/datetime";
import { Col, Row } from "react-bootstrap";

export const CategoryStatsList = ({ stats }: { stats: CategoryStats[] }) => {
    return (
        <PaginationContextProvider>
            <CategoryStatsListDisplay stats={stats} />
        </PaginationContextProvider>
    );
};

export const CategoryStatsListDisplay = ({
    stats,
}: {
    stats: CategoryStats[];
}) => {
    const pagination = usePagination<CategoryStats>(
        stats,
        genericFetcher,
        3,
        1,
    );

    return (
        <div>
            <PaginationSearch text="Search for category" />
            <div className="mt-2 mb-4">
                {pagination.data.map((gameStats) => {
                    return (
                        <CategoryStatsPanel
                            key={gameStats.value}
                            stats={gameStats}
                        />
                    );
                })}
            </div>
            <PaginationControl {...pagination} minimalLayout={true} />
        </div>
    );
};

export const CategoryStatsPanel = ({ stats }: { stats: CategoryStats }) => {
    const [game, category] = stats.displayValue.split("#");
    return (
        <a
            href={`/races/stats/${safeEncodeURI(game)}/${safeEncodeURI(
                category,
            )}`}
            className="text-decoration-none"
        >
            <div
                className={`bg-body-secondary game-border mh-100 h-100 card border-2 mt-2 px-3 py-2 ${styles.liveRunContainer}`}
            >
                <div className="justify-content-between d-flex">
                    <span className="fs-5">{category}</span>
                    <span>{stats.totalRaces} Races</span>
                </div>
                <hr className="my-1 p-0" />
                <CategoryStatsBody stats={stats} />
            </div>
        </a>
    );
};

export const CategoryStatsBody = ({ stats }: { stats: CategoryStats }) => {
    return (
        <Row>
            <Col lg={4} className="mb-3 mb-md-1">
                <div className="fs-5 mb-1">Stats</div>
                <div>
                    Total Time:{" "}
                    <b>
                        <DurationToFormatted duration={stats.totalRaceTime} />
                    </b>
                </div>
                <div>
                    Races Joined: <b>{stats.totalParticipations}</b>
                </div>
                <div>
                    Races Finished: <b>{stats.totalFinishedParticipations}</b>
                </div>
            </Col>
            <Col lg={4} className="mb-3 mb-md-1">
                <div className="fs-5 mb-1">Top Ratings</div>
                {stats.bestMmrs.map((stat, i) => {
                    return (
                        <div key={`${stat.user}-mmr`}>
                            <TrophyIcon
                                trophyColor={
                                    i === 0
                                        ? "gold"
                                        : i === 1
                                          ? "silver"
                                          : "bronze"
                                }
                            />
                            <b>{stat.mmr}</b> - {stat.user}
                        </div>
                    );
                })}
            </Col>
            <Col lg={4} className="mb-3 mb-xl-1">
                <div className="fs-5 mb-1">Best Ever Times</div>
                {stats.bestTimes.map((stat, i) => {
                    return (
                        <div key={`${stat.user}-time`}>
                            <TrophyIcon
                                trophyColor={
                                    i === 0
                                        ? "gold"
                                        : i === 1
                                          ? "silver"
                                          : "bronze"
                                }
                            />
                            <b>
                                <DurationToFormatted duration={stat.time} />
                            </b>{" "}
                            - {stat.user}
                        </div>
                    );
                })}
            </Col>
        </Row>
    );
};
